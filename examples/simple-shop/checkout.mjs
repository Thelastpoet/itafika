const API = process.env.ITAFIKA_API ?? "http://localhost:8787";

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    // Itafika errors are { error: { code, message } }.
    const detail = data?.error ? `${data.error.code}: ${data.error.message}` : JSON.stringify(data);
    throw new Error(`${method} ${path} -> ${res.status}: ${detail}`);
  }
  return data;
}

// Step 0 — turn places into zone IDs.
// Kenyan delivery is described by stages/hubs, not street addresses. A shop knows
// its own pickup zone; the customer's destination is resolved from what they type
// at checkout via /v1/zones/search.
const ORIGIN_ZONE = "ZONE_NBI_CBD_01"; // the shop's configured pickup point
const DESTINATION_QUERY = process.env.DESTINATION ?? "Nakuru"; // what the customer typed

async function resolveDestination(query) {
  const { zones } = await call("GET", `/v1/zones/search?q=${encodeURIComponent(query)}`);
  if (zones.length === 0) {
    console.log(`No known drop-off zone matches "${query}". Ask the customer to pick another.`);
    process.exit(0);
  }
  // A real checkout shows these as a dropdown for the customer to choose from.
  console.log(`Drop-off zones matching "${query}":`);
  for (const z of zones) {
    console.log(`  - ${z.id}  ${z.name} (${z.town})`);
  }
  return zones[0];
}

const destination = await resolveDestination(DESTINATION_QUERY);
console.log(`\nShop checkout: moving a 2kg parcel ${ORIGIN_ZONE} -> ${destination.id} (${destination.name})\n`);

// Step 1 — ask for delivery options for this route + package.
const { quotes } = await call("POST", "/v1/quotes", {
  origin_zone_id: ORIGIN_ZONE,
  destination_zone_id: destination.id,
  package_weight_kg: 2,
  package_type: "apparel",
});

// An empty list is a valid answer: no provider serves this route yet.
if (quotes.length === 0) {
  console.log("No delivery options for this route yet.");
  process.exit(0);
}

// Step 2 — render the options at checkout for the customer to choose.
console.log("Options shown to the customer at checkout:");
for (const q of quotes) {
  console.log(`  - ${q.provider_name} (${q.provider_type}): KES ${q.estimated_cost_kes}, ${q.estimated_time}`);
}

const chosen = quotes[0];
console.log(`\nCustomer picks: ${chosen.provider_name}\n`);

// Step 3 — book the chosen quote. A quote_id is single-use and expires after 24h,
// so book it once, soon after the customer commits.
const delivery = await call("POST", "/v1/deliveries", {
  quote_id: chosen.quote_id,
  sender: { name: "Asha Mwangi", phone: "+254712345678" },
  recipient: { name: "John Otieno", phone: "+254723456789" },
  package_description: "Sealed apparel box, 2kg",
});

console.log(`Booked. Tracking ID: ${delivery.tracking_id} (status: ${delivery.status})\n`);

// Step 4 — track. Poll this to show the customer where the parcel is. Status is one
// of the five universal values; history is the ordered event log.
const tracking = await call("GET", `/v1/deliveries/${delivery.tracking_id}/track`);
console.log("Tracking:");
console.log(`  current: ${tracking.status}`);
for (const event of tracking.history) {
  console.log(`  - ${event.at}  ${event.status}`);
}
