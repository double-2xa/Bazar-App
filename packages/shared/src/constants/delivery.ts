/**
 * Delivery distance / place-based fee configuration.
 *
 * Formula knobs are intentionally centralized so we can retune with the client
 * without touching order create logic.
 */

export type LebanonPlace = {
  id: string;
  name: string;
  /** Approximate city/area center — used when the address has no pin */
  lat: number;
  lng: number;
  /**
   * Optional flat fee for this place (USD).
   * Used when DELIVERY_FEE_FORMULA.mode === 'place', or as a hint later.
   */
  flatFee?: number;
};

/** Store / warehouse origin — Nice Price Bazar (Beirut; override via env on API) */
export const STORE_ORIGIN = {
  label: 'Nice Price Bazar — Beirut',
  city: 'Beirut',
  lat: 33.8938,
  lng: 35.5018,
} as const;

/**
 * Lebanon cities / areas used for address pickers and distance fallback.
 * Expand / edit with the client as the delivery coverage list is finalized.
 */
export const LEBANON_PLACES: readonly LebanonPlace[] = [
  { id: 'beirut', name: 'Beirut', lat: 33.8938, lng: 35.5018, flatFee: 2.99 },
  { id: 'achrafieh', name: 'Achrafieh', lat: 33.8872, lng: 35.5194, flatFee: 2.99 },
  { id: 'hamra', name: 'Hamra', lat: 33.897, lng: 35.478, flatFee: 2.99 },
  { id: 'verdun', name: 'Verdun', lat: 33.8835, lng: 35.4835, flatFee: 2.99 },
  { id: 'jounieh', name: 'Jounieh', lat: 33.9808, lng: 35.6178, flatFee: 4.99 },
  { id: 'jbeil', name: 'Jbeil (Byblos)', lat: 34.1211, lng: 35.6481, flatFee: 6.99 },
  { id: 'tripoli', name: 'Tripoli', lat: 34.4367, lng: 35.8497, flatFee: 8.99 },
  { id: 'batroun', name: 'Batroun', lat: 34.2553, lng: 35.6581, flatFee: 6.99 },
  { id: 'zahle', name: 'Zahle', lat: 33.8463, lng: 35.902, flatFee: 7.99 },
  { id: 'baalbek', name: 'Baalbek', lat: 34.0058, lng: 36.2181, flatFee: 9.99 },
  { id: 'saida', name: 'Saida (Sidon)', lat: 33.5571, lng: 35.3756, flatFee: 6.99 },
  { id: 'tyre', name: 'Tyre (Sour)', lat: 33.2705, lng: 35.2038, flatFee: 8.99 },
  { id: 'nabatieh', name: 'Nabatieh', lat: 33.3789, lng: 35.4839, flatFee: 7.99 },
  { id: 'aley', name: 'Aley', lat: 33.8094, lng: 35.6, flatFee: 4.99 },
  { id: 'broummana', name: 'Broummana', lat: 33.885, lng: 35.641, flatFee: 4.99 },
  { id: 'dbayeh', name: 'Dbayeh', lat: 33.936, lng: 35.588, flatFee: 3.99 },
  { id: 'antellias', name: 'Antelias', lat: 33.915, lng: 35.589, flatFee: 3.99 },
  { id: 'jal-el-dib', name: 'Jal El Dib', lat: 33.968, lng: 35.618, flatFee: 3.99 },
] as const;

/**
 * Discussable delivery fee formula.
 * mode:
 *  - 'distance' → baseFee + perKm * distanceKm (clamped)
 *  - 'place'    → use LebanonPlace.flatFee for matched city
 */
export const DELIVERY_FEE_FORMULA = {
  mode: 'distance' as 'distance' | 'place',
  /** Flat amount charged before distance (USD) */
  baseFee: 1.5,
  /** USD charged per kilometer from store */
  perKm: 0.4,
  minFee: 2.99,
  maxFee: 14.99,
  /** Round fee to this many decimal places */
  decimals: 2,
} as const;

export type DeliveryFeeInput = {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  /** Optional override for store origin (e.g. from env) */
  originLat?: number;
  originLng?: number;
};

export type DeliveryFeeQuote = {
  deliveryFee: number;
  distanceKm: number | null;
  placeId: string | null;
  placeName: string | null;
  method: 'distance' | 'place' | 'fallback';
  origin: { lat: number; lng: number; label: string };
};

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findLebanonPlaceByCity(city?: string | null): LebanonPlace | null {
  if (!city?.trim()) return null;
  const needle = city.trim().toLowerCase();
  return (
    LEBANON_PLACES.find(
      (p) =>
        p.name.toLowerCase() === needle ||
        p.id === needle ||
        p.name.toLowerCase().includes(needle) ||
        needle.includes(p.name.toLowerCase().split(' ')[0]),
    ) ?? null
  );
}

function roundFee(value: number): number {
  const factor = 10 ** DELIVERY_FEE_FORMULA.decimals;
  return Math.round(value * factor) / factor;
}

function roundKm(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampFee(value: number): number {
  return roundFee(
    Math.min(DELIVERY_FEE_FORMULA.maxFee, Math.max(DELIVERY_FEE_FORMULA.minFee, value)),
  );
}

function feeFromDistance(distanceKm: number): number {
  // TODO(discuss): finalize with client — bands, free-over-X, B2B rates, etc.
  const raw = DELIVERY_FEE_FORMULA.baseFee + DELIVERY_FEE_FORMULA.perKm * distanceKm;
  return clampFee(raw);
}

/**
 * Resolve delivery destination coordinates from pin or Lebanon places list.
 */
export function resolveDeliveryDestination(input: DeliveryFeeInput): {
  lat: number;
  lng: number;
  place: LebanonPlace | null;
} | null {
  if (
    typeof input.latitude === 'number' &&
    typeof input.longitude === 'number' &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    return {
      lat: input.latitude,
      lng: input.longitude,
      place: findLebanonPlaceByCity(input.city),
    };
  }

  const place = findLebanonPlaceByCity(input.city);
  if (place) {
    return { lat: place.lat, lng: place.lng, place };
  }

  return null;
}

/**
 * Calculate delivery fee from distance to store, using the Lebanon places list
 * when the address has no coordinates.
 */
export function calculateDeliveryFee(input: DeliveryFeeInput): DeliveryFeeQuote {
  const originLat = input.originLat ?? STORE_ORIGIN.lat;
  const originLng = input.originLng ?? STORE_ORIGIN.lng;
  const origin = {
    lat: originLat,
    lng: originLng,
    label: STORE_ORIGIN.label,
  };

  const destination = resolveDeliveryDestination(input);

  if (!destination) {
    return {
      deliveryFee: DELIVERY_FEE_FORMULA.minFee,
      distanceKm: null,
      placeId: null,
      placeName: null,
      method: 'fallback',
      origin,
    };
  }

  const distanceKm = roundKm(
    haversineKm(originLat, originLng, destination.lat, destination.lng),
  );

  if (DELIVERY_FEE_FORMULA.mode === 'place' && destination.place?.flatFee != null) {
    return {
      deliveryFee: clampFee(destination.place.flatFee),
      distanceKm,
      placeId: destination.place.id,
      placeName: destination.place.name,
      method: 'place',
      origin,
    };
  }

  return {
    deliveryFee: feeFromDistance(distanceKm),
    distanceKm,
    placeId: destination.place?.id ?? null,
    placeName: destination.place?.name ?? input.city ?? null,
    method: 'distance',
    origin,
  };
}
