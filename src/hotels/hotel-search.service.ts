import type { HotelRepository } from "../redis/hotel.repository";
import { runHotelSearch } from "../temporal/temporal.client";

export class HotelSearchService {
  private readonly inFlightSearches = new Map<string, Promise<void>>();

  constructor(private readonly repository: HotelRepository) {}

  async ensureSnapshot(city: string): Promise<void> {
    const existingSearch = this.inFlightSearches.get(city);

    if (existingSearch) {
      return existingSearch;
    }

    // Register the promise before awaiting Redis.
    const searchPromise = this.refreshSnapshotIfNeeded(city);

    this.inFlightSearches.set(city, searchPromise);

    try {
      await searchPromise;
    } finally {
      if (this.inFlightSearches.get(city) === searchPromise) {
        this.inFlightSearches.delete(city);
      }
    }
  }

  private async refreshSnapshotIfNeeded(city: string): Promise<void> {
    if (await this.repository.hasSnapshot(city)) {
      return;
    }

    const offers = await runHotelSearch(city);

    await this.repository.saveHotels(city, offers);
  }
}
