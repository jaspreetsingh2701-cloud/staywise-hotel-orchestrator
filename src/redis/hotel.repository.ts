import type { RedisClientType } from "redis";
import { normalizeHotelName } from "../utils/normalize-hotel-name";

export interface HotelOffer {
  name: string;
  price: number;
  supplier: string;
  commissionPct: number;
}

export interface PriceFilter {
  minPrice?: number;
  maxPrice?: number;
}

const CACHE_TTL_SECONDS = 300;

export class HotelRepository {
  constructor(private readonly redis: RedisClientType) {}

  // Stores hotel prices in a Sorted Set and details in a Hash.
  async saveHotels(city: string, hotels: HotelOffer[]): Promise<void> {
    const normalizedCity = city.trim().toLowerCase();

    const pricesKey = `staywise:hotels:${normalizedCity}:prices`;
    const detailsKey = `staywise:hotels:${normalizedCity}:details`;
    const metadataKey = `staywise:hotels:${normalizedCity}:metadata`;

    const transaction = this.redis.multi();

    // Remove the previous snapshot before saving refreshed data.
    transaction.del([pricesKey, detailsKey, metadataKey]);

    if (hotels.length > 0) {
      const priceEntries = hotels.map((hotel) => ({
        score: hotel.price,
        value: normalizeHotelName(hotel.name),
      }));

      const hotelDetails = Object.fromEntries(
        hotels.map((hotel) => [
          normalizeHotelName(hotel.name),
          JSON.stringify(hotel),
        ]),
      );

      transaction.zAdd(pricesKey, priceEntries);
      transaction.hSet(detailsKey, hotelDetails);

      transaction.expire(pricesKey, CACHE_TTL_SECONDS);
      transaction.expire(detailsKey, CACHE_TTL_SECONDS);
    }

    transaction.set(metadataKey, "1");
    transaction.expire(metadataKey, CACHE_TTL_SECONDS);

    await transaction.exec();
  }

  async getHotels(city: string, filters?: PriceFilter): Promise<HotelOffer[]> {
    const normalizedCity = city.trim().toLowerCase();

    const pricesKey = `staywise:hotels:${normalizedCity}:prices`;
    const detailsKey = `staywise:hotels:${normalizedCity}:details`;

    const minPrice = filters?.minPrice ?? "-inf";
    const maxPrice = filters?.maxPrice ?? "+inf";

    // Redis performs the price filtering using the Sorted Set.
    const hotelIds = await this.redis.zRangeByScore(
      pricesKey,
      minPrice,
      maxPrice,
    );

    if (hotelIds.length === 0) {
      return [];
    }

    // Fetch complete hotel records for the matching identifiers.
    const hotelDetails = await this.redis.hmGet(detailsKey, hotelIds);

    return hotelDetails
      .filter((details): details is string => details !== null)
      .map((details) => JSON.parse(details) as HotelOffer);
  }

  async hasSnapshot(city: string): Promise<boolean> {
    const normalizedCity = city.trim().toLowerCase();
    const metadataKey = `staywise:hotels:${normalizedCity}:metadata`;

    return (await this.redis.exists(metadataKey)) === 1;
  }
}
