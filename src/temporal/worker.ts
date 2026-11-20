import "dotenv/config";

import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities/supplier.activities";

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });

  const worker = await Worker.create({
    connection,
    taskQueue: "hotel-search",
    workflowsPath: require.resolve("./workflows/hotel.workflow"),
    activities,
  });

  console.log("Temporal worker started on task queue: hotel-search");

  await worker.run();
}

run().catch((error) => {
  console.error("Temporal worker failed:", error);
  process.exit(1);
});
