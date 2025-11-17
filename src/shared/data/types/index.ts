export interface County {
  code: string;
  name: string;
}

export interface SubCounty {
  code: string;
  name: string;
  countyCode: string;
}

export interface Division {
  code: string;
  name: string;
  subCountyCode: string;
}

export interface Location {
  code: string;
  name: string;
  divisionCode: string;
}

export interface SubLocation {
  code: string;
  name: string;
  locationCode: string;
}

export interface Town {
  code: string;
  name: string;
  countyCode: string;
}
