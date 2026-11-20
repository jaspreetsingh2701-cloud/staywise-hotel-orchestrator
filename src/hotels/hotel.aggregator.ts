import type { HotelOffer } from "../redis/hotel.repository";
import { normalizeHotelName } from "../utils/normalize-hotel-name";

export function aggregateHotels(hotels: HotelOffer[]): HotelOffer[] {
  const offers = new Map<string, HotelOffer>();

  for (const hotel of hotels) {
    // Normalize names so "Holtin" and " holtin " are treated as duplicates.
    const key = normalizeHotelName(hotel.name);

    const existing = offers.get(key);

    // Keep the cheapest offer for each hotel.
    if (!existing || hotel.price < existing.price) {
      offers.set(key, hotel);
    }
  }

  return Array.from(offers.values());
}
