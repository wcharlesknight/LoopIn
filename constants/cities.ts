export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

export const CITIES: City[] = [
  {
    id: 'seattle',
    name: 'Seattle',
    state: 'WA',
    country: 'USA',
    latitude: 47.6062,
    longitude: -122.3321,
  },
  {
    id: 'tacoma',
    name: 'Tacoma',
    state: 'WA',
    country: 'USA',
    latitude: 47.2414,
    longitude: -122.4594,
  }
  // Add more cities here as needed
];
