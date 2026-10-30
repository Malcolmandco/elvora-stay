export interface DuffelPlaceAirport {
  id: string;
  name: string;
  iata_code: string;
  iata_city_code: string;
  city_name: string;
  country_name: string;
  country_code: string;
  latitude?: number;
  longitude?: number;
}

export interface DuffelPlace {
  id: string;
  type: 'airport' | 'city';
  name: string;
  iata_code: string;
  iata_city_code: string;
  city_name?: string;
  country_name?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  airports?: DuffelPlaceAirport[];
}

export interface SelectedPlace {
  placeId: string;
  type: 'airport' | 'city';
  name: string;
  iataCode: string;
  iataCityCode: string;
  cityName: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  airports?: DuffelPlaceAirport[];
}

export function toSelectedPlace(place: DuffelPlace): SelectedPlace {
  return {
    placeId: place.id,
    type: place.type,
    name: place.name,
    iataCode: place.iata_code || place.iata_city_code || '',
    iataCityCode: place.iata_city_code || '',
    cityName: place.city_name || (place.type === 'city' ? place.name : ''),
    countryCode: place.country_code || '',
    latitude: place.latitude,
    longitude: place.longitude,
    airports: place.airports,
  };
}

export function toSelectedAirport(airport: DuffelPlaceAirport, parentCity?: DuffelPlace): SelectedPlace {
  return {
    placeId: airport.id,
    type: 'airport',
    name: airport.name,
    iataCode: airport.iata_code,
    iataCityCode: airport.iata_city_code,
    cityName: airport.city_name || parentCity?.name || '',
    countryCode: airport.country_code || parentCity?.country_code || '',
    latitude: airport.latitude,
    longitude: airport.longitude,
  };
}
