import { subCounties } from "./sub-counties";
import { divisions } from "./divisions";
import { locations } from "./locations";
import { subLocations } from "./sub-locations";
import { majorTowns } from "./towns";
import type {
  SubCounty,
  Division,
  Location,
  SubLocation,
  Town,
} from "../types/locations";

export const getSubCountiesByCounty = (countyCode: string): SubCounty[] => {
  return subCounties.filter((sc) => sc.countyCode === countyCode);
};

export const getDivisionsBySubCounty = (subCountyCode: string): Division[] => {
  return divisions.filter((d) => d.subCountyCode === subCountyCode);
};

export const getLocationsByDivision = (divisionCode: string): Location[] => {
  return locations.filter((l) => l.divisionCode === divisionCode);
};

export const getSubLocationsByLocation = (
  locationCode: string
): SubLocation[] => {
  return subLocations.filter((sl) => sl.locationCode === locationCode);
};

export const getTownsByCounty = (countyCode: string): Town[] => {
  return majorTowns.filter((t) => t.countyCode === countyCode);
};
