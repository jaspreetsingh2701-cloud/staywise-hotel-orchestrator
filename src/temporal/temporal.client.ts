import { Client, Connection } from "@temporalio/client";
import type { HotelOffer } from "../redis/hotel.repository";

export async function runHotelSearch(city: string): Promise<HotelOffer[]> {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });

  try {
    const client = new Client({ connection });

    return await client.workflow.execute("hotelSearchWorkflow", {
      taskQueue: "hotel-search",
      workflowId: `hotel-search-${city}-${Date.now()}`,
      args: [city],
    });
  } finally {
    await connection.close();
  }
}
