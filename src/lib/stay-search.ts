import { hotelbedsDestinationMap } from '@/data/hotelbeds-destinations';

export const DEFAULT_STAY_DESTINATION = hotelbedsDestinationMap[0];

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDefaultCheckIn(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

export function getDefaultCheckOut(checkIn?: string): string {
  const base = checkIn ? new Date(checkIn) : new Date();
  base.setDate(base.getDate() + 2);
  return formatDate(base);
}

export function getDefaultSearchParams() {
  const checkIn = getDefaultCheckIn();
  const checkOut = getDefaultCheckOut(checkIn);
  return {
    destination: DEFAULT_STAY_DESTINATION.elvoraName,
    destinationCode: DEFAULT_STAY_DESTINATION.hotelbedsCode,
    checkIn,
    checkOut,
    adults: 2,
    rooms: 1,
  };
}
