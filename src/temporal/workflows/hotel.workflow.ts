import { proxyActivities } from "@temporalio/workflow";
import type { HotelOffer } from "../../redis/hotel.repository";
import { aggregateHotels } from "../../hotels/hotel.aggregator";

import type * as activities from "../activities/supplier.activities";

const { fetchSupplierAHotels, fetchSupplierBHotels } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "30 seconds",
  retry: {
    maximumAttempts: 3,
  },
});

export async function hotelSearchWorkflow(city: string): Promise<HotelOffer[]> {
  const [supplierAResult, supplierBResult] = await Promise.allSettled([
    fetchSupplierAHotels(city),
    fetchSupplierBHotels(city),
  ]);

  const supplierAHotels =
    supplierAResult.status === "fulfilled" ? supplierAResult.value : [];

  const supplierBHotels =
    supplierBResult.status === "fulfilled" ? supplierBResult.value : [];

  if (
    supplierAResult.status === "rejected" &&
    supplierBResult.status === "rejected"
  ) {
    throw new Error(
      `Both suppliers failed. Supplier A: ${String(supplierAResult.reason)}; Supplier B: ${String(supplierBResult.reason)}`,
    );
  }

  return aggregateHotels([...supplierAHotels, ...supplierBHotels]);
}
