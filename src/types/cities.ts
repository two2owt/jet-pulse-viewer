export interface City {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  zoom: number;
}

export const CITIES: City[] = [
  {
    id: "charlotte",
    name: "Charlotte",
    state: "NC",
    lat: 35.227,
    lng: -80.843,
    zoom: 12
  },
  {
    id: "new-york",
    name: "New York",
    state: "NY",
    lat: 40.7128,
    lng: -74.0060,
    zoom: 12
  },
  {
    id: "los-angeles",
    name: "Los Angeles",
    state: "CA",
    lat: 34.0522,
    lng: -118.2437,
    zoom: 11
  },
  {
    id: "chicago",
    name: "Chicago",
    state: "IL",
    lat: 41.8781,
    lng: -87.6298,
    zoom: 12
  },
  {
    id: "miami",
    name: "Miami",
    state: "FL",
    lat: 25.7617,
    lng: -80.1918,
    zoom: 12
  },
  {
    id: "austin",
    name: "Austin",
    state: "TX",
    lat: 30.2672,
    lng: -97.7431,
    zoom: 12
  },
  {
    id: "denver",
    name: "Denver",
    state: "CO",
    lat: 39.7392,
    lng: -104.9903,
    zoom: 12
  },
  {
    id: "seattle",
    name: "Seattle",
    state: "WA",
    lat: 47.6062,
    lng: -122.3321,
    zoom: 12
  },
  {
    id: "atlanta",
    name: "Atlanta",
    state: "GA",
    lat: 33.7490,
    lng: -84.3880,
    zoom: 12
  },
  {
    id: "nashville",
    name: "Nashville",
    state: "TN",
    lat: 36.1627,
    lng: -86.7816,
    zoom: 12
  }
];
