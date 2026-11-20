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
  const [supplierAHotels, supplierBHotels] = await Promise.all([
    fetchSupplierAHotels(city),
    fetchSupplierBHotels(city),
  ]);

  return aggregateHotels([...supplierAHotels, ...supplierBHotels]);
}
