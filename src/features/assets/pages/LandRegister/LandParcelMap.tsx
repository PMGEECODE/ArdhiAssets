"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import L from "leaflet";
import proj4 from "proj4";
import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LandParcelMapProps {
  gpsCoordinates: string; // e.g. "-1.30025, 36.81235" (preferably lat,lng)
  surveyPoints: Record<string, string>; // e.g. { A: "239000,9849228", ... } (easting,northing)
  landDescription?: string;
  utmZone?: number; // optional override: 36 or 37
  utmHemisphere?: "N" | "S"; // optional override
}

const LandParcelMap: React.FC<LandParcelMapProps> = ({
  gpsCoordinates,
  surveyPoints,
  landDescription = "Land Parcel",
  utmZone: utmZoneOverride,
  utmHemisphere: utmHemisphereOverride,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !gpsCoordinates || !surveyPoints) return;

    // helpers --------------------------------------------------------------

    const parsePair = (s: string): [number, number] | null => {
      // Accept "x,y" or "x y" (comma preferred)
      const parts = s.includes(",") ? s.split(",") : s.trim().split(/\s+/);
      if (parts.length !== 2) return null;
      const a = Number.parseFloat(parts[0].trim());
      const b = Number.parseFloat(parts[1].trim());
      if (Number.isNaN(a) || Number.isNaN(b)) return null;
      return [a, b];
    };

    const looksLikeLatLng = (a: number, b: number) =>
      Math.abs(a) <= 90 && Math.abs(b) <= 180;

    const buildUtmProj = (zone: number, hemisphere: "N" | "S") =>
      `+proj=utm +zone=${zone} ${
        hemisphere === "S" ? "+south" : ""
      } +datum=WGS84 +units=m +no_defs`;

    const lonToUtmZone = (lon: number) => Math.floor((lon + 180) / 6) + 1;

    // Parse center gpsCoordinates with best-effort (DMS not included here but can be added)
    // Returns an object describing whether center is latlng or UTM.
    const parseCenter = (
      s: string
    ):
      | { type: "latlng"; coords: [number, number] } // [lat, lng]
      | { type: "utm"; coords: [number, number] } // [easting, northing]
      | null => {
      const pair = parsePair(s);
      if (!pair) return null;

      const [a, b] = pair;
      if (looksLikeLatLng(a, b)) {
        // Already (lat, lon)
        return { type: "latlng", coords: [a, b] };
      }
      if (looksLikeLatLng(b, a)) {
        // maybe (lon, lat) — swap
        return { type: "latlng", coords: [b, a] };
      }
      // Not latlng — treat as UTM by default
      return { type: "utm", coords: [a, b] };
    };

    const centerParsed = parseCenter(gpsCoordinates);

    // Determine utm zone & hemisphere to use for conversions:
    // 1) If user provided utmZone/utmHemisphere, prefer them.
    // 2) Else if center is latlng, derive zone from center longitude and hemisphere from center latitude.
    // 3) Else fallback to "guess" (last resort) - logs a warning.
    let chosenUtmZone: number | undefined = utmZoneOverride;
    let chosenHemisphere: "N" | "S" | undefined = utmHemisphereOverride;

    if (!chosenUtmZone || !chosenHemisphere) {
      if (centerParsed && centerParsed.type === "latlng") {
        const [centerLat, centerLon] = centerParsed.coords;
        chosenUtmZone = chosenUtmZone ?? lonToUtmZone(centerLon);
        chosenHemisphere = chosenHemisphere ?? (centerLat < 0 ? "S" : "N");
        console.log(
          `[v0] Derived UTM zone=${chosenUtmZone} hemisphere=${chosenHemisphere} from center lat/lng`
        );
      } else {
        // fallback: cannot deterministically know zone; warn and try a best-effort guess
        // We will use easting heuristics only if center not provided as latlng
        console.warn(
          "[v0] No lat/lng center available to derive UTM zone. If survey coordinates are ambiguous, pass utmZone & utmHemisphere props for 100% accuracy."
        );
      }
    }

    // normalize a coordinate pair (either lat/lng or UTM easting/northing) into [lat, lng]
    const toLatLng = (raw: [number, number]): [number, number] | null => {
      const [a, b] = raw;

      // If one of the two orders looks like lat/lng, prefer that (explicit lat/lng input)
      if (looksLikeLatLng(a, b)) return [a, b];
      if (looksLikeLatLng(b, a)) return [b, a]; // swapped order

      // Otherwise treat as UTM (easting, northing)
      // Need zone + hemisphere
      let zone = chosenUtmZone;
      let hemisphere = chosenHemisphere;

      if (!zone || !hemisphere) {
        // Try to guess zone from easting (last resort).
        // This is not deterministic. Only do it if we must.
        const easting = a;
        // Common UTM easting ranges are between ~166000 and ~834000.
        // For Kenya, eastings around 239000 are most likely zone 37 (Nairobi area),
        // but that depends on hemisphere too. We'll guess using easting < 500000 => 36 or 37?
        // A safer fallback: derive zone from approximate longitude using a rough offset:
        // Guess 37 for eastings < 500k for central Kenya (works for Ngong coordinates).
        zone = easting < 500000 ? 37 : 37; // keep conservative default 37 for Kenya centers
        hemisphere = "S";
        console.warn(
          `[v0] Falling back to guessed UTM zone=${zone} hemisphere=${hemisphere} for easting=${easting}. Provide utmZone/utmHemisphere or a lat/lng center to avoid ambiguity.`
        );
      }

      try {
        const projString = buildUtmProj(zone, hemisphere);
        // proj4 expects [x, y] = [easting, northing] and returns [lng, lat] for geographic target
        const [lng, lat] = proj4(projString, "EPSG:4326", [a, b]);
        return [lat, lng];
      } catch (err) {
        console.error("[v0] UTM->WGS84 conversion failed", err);
        return null;
      }
    };

    // Parse survey points into lat/lng
    const surveyParsed: Array<{ label: string; latlng: [number, number] }> = [];
    Object.entries(surveyPoints).forEach(([label, val]) => {
      const pair = parsePair(val);
      if (!pair) {
        console.warn(`[v0] Could not parse survey point ${label}: ${val}`);
        return;
      }
      const latlng = toLatLng(pair);
      if (!latlng) {
        console.warn(`[v0] Could not convert survey point ${label} to lat/lng`);
        return;
      }
      surveyParsed.push({ label, latlng });
    });

    // Determine final map center:
    // If centerParsed is latlng -> use it. If centerParsed is UTM -> convert it with chosen zone/hemisphere.
    let finalCenter: [number, number] | null = null;
    if (centerParsed) {
      if (centerParsed.type === "latlng") {
        finalCenter = centerParsed.coords;
      } else {
        // center given as UTM; convert using chosen zone/hemisphere
        const centerLatLng = toLatLng(centerParsed.coords);
        if (centerLatLng) finalCenter = centerLatLng;
      }
    }

    // If still no center, use first survey point as center (if any)
    if (!finalCenter && surveyParsed.length > 0) {
      finalCenter = surveyParsed[0].latlng;
      console.warn(
        "[v0] No explicit center could be computed — using first survey point as center"
      );
    }

    // If still no center, default to Nairobi
    if (!finalCenter) {
      finalCenter = [-1.286389, 36.817223];
      console.warn("[v0] Falling back to Nairobi default center");
    }

    // --- Create / reset map ------------------------------------------------
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }
    const map = L.map(mapRef.current).setView(finalCenter, 16);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // center marker
    const centerIcon = L.divIcon({
      html: `<div class="flex justify-center items-center w-6 h-6 text-xs font-bold text-white bg-red-600 rounded-full border-2 border-white shadow-lg">GPS</div>`,
      className: "custom-gps-marker",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    L.marker(finalCenter, { icon: centerIcon })
      .addTo(map)
      .bindPopup(
        `<div class="p-2"><b>Center</b><br/>${finalCenter[0].toFixed(
          6
        )}, ${finalCenter[1].toFixed(6)}</div>`
      );

    // polygon and survey markers
    if (surveyParsed.length >= 3) {
      const polygonCoords = surveyParsed.map((p) => p.latlng);
      const polygon = L.polygon(polygonCoords, {
        color: "#059669",
        fillColor: "#10b981",
        fillOpacity: 0.25,
        weight: 2,
      }).addTo(map);

      polygon.bindPopup(
        `<div class="p-2"><b>${landDescription}</b><br/>Parcel boundary</div>`
      );

      const bounds = L.latLngBounds([finalCenter, ...polygonCoords]);
      map.fitBounds(bounds, { padding: [20, 20] });
    }

    surveyParsed.forEach((p, idx) => {
      const ic = L.divIcon({
        html: `<div class="flex justify-center items-center w-8 h-8 text-sm font-bold text-white bg-blue-600 rounded-full border-2 border-white shadow-lg">${p.label}</div>`,
        className: "custom-survey-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker(p.latlng, { icon: ic })
        .addTo(map)
        .bindPopup(
          `<div class="p-2"><b>Point ${p.label}</b><br/>${p.latlng[0].toFixed(
            6
          )}, ${p.latlng[1].toFixed(6)}<br/>#${idx + 1} of ${
            surveyParsed.length
          }</div>`
        );
    });

    // cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [
    gpsCoordinates,
    surveyPoints,
    landDescription,
    utmZoneOverride,
    utmHemisphereOverride,
  ]);

  return <div ref={mapRef} className="w-full h-full min-h-[400px]" />;
};

export default LandParcelMap;
