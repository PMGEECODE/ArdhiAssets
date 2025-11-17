// Re-export types and data from modular files
export type {
  County,
  SubCounty,
  Division,
  Location,
  SubLocation,
  Town,
} from "./types/locations";

export { counties } from "./locations/counties";
export { subCounties } from "./locations/sub-counties";
export { divisions } from "./locations/divisions";
export { locations } from "./locations/locations";
export { subLocations } from "./locations/sub-locations";
export { majorTowns } from "./locations/towns";

export {
  getSubCountiesByCounty,
  getDivisionsBySubCounty,
  getLocationsByDivision,
  getSubLocationsByLocation,
  getTownsByCounty,
} from "./locations/helpers";
