import assert from "node:assert/strict";
import { createApp } from "../app";

async function main() {
  const server = createApp().listen(0);
  const address = server.address();
  assert(address && typeof address === "object");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);
    const body = await response.json() as { status: string; database: string };
    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.database, "connected");
    console.log("Health integration test passed");
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
