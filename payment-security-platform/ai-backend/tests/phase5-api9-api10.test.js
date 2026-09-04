const BASE_URL = "http://localhost:5002";

console.log("--- API9 Improper Inventory Management ---");

const inventoryResponse = await fetch(
  `${BASE_URL}/api/security-test/api9/inventory-test`
);

const inventory = await inventoryResponse.json();

console.log(`Inventory endpoint: HTTP ${inventoryResponse.status}`);
console.dir(inventory, { depth: 5 });

if (!inventoryResponse.ok || !Array.isArray(inventory.endpoints)) {
  console.error("API9 FAILED");
  process.exit(1);
}

console.log(
  `API9 PASS: ${inventory.endpoints.length} known API endpoints reported.`
);

console.log("\n--- API10 Unsafe Consumption of APIs ---");

const unsafeDataResponse = await fetch(
  `${BASE_URL}/api/security-test/api10/external-data-test`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: {
        transactionId: "TX-API10-TEST",
        status: "COMPLETED",
        amount: 500,
        currency: "INR",
        isAdmin: true,
        bypassSecurity: true
      }
    })
  }
);

const unsafeData = await unsafeDataResponse.json();

console.log(
  `Unexpected fields: expected 400, actual ${unsafeDataResponse.status}`
);

console.dir(unsafeData, { depth: 5 });

if (unsafeDataResponse.status !== 400) {
  console.error("API10 FAILED");
  process.exit(1);
}

console.log(
  "API10 PASS: unexpected external fields were rejected."
);

console.log("\nAPI9/API10 runtime checks completed.");
