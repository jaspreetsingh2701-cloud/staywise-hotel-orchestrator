import type { HotelOffer } from "../../redis/hotel.repository";

interface SupplierHotel {
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

const SUPPLIER_API_URL =
  process.env.SUPPLIER_API_URL ?? "http://localhost:3000";

async function fetchSupplierHotels(
  city: string,
  supplier: string,
  endpoint: string,
): Promise<HotelOffer[]> {
  const url = `${SUPPLIER_API_URL}${endpoint}?city=${encodeURIComponent(city)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${supplier} request failed with status ${response.status}`,
    );
  }

  const hotels = (await response.json()) as SupplierHotel[];

  return hotels.map((hotel) => ({
    name: hotel.name,
    price: hotel.price,
    supplier,
    commissionPct: hotel.commissionPct,
  }));
}

export function fetchSupplierAHotels(city: string) {
  return fetchSupplierHotels(city, "Supplier A", "/supplierA/hotels");
}

export function fetchSupplierBHotels(city: string) {
  return fetchSupplierHotels(city, "Supplier B", "/supplierB/hotels");
}
