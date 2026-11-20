export function normalizeHotelName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
