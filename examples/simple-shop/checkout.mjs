const API = process.env.ITAFIKA_API ?? "http://localhost:8787";

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const origin = "ZONE_NBI_CBD_01";
const destination = "ZONE_NKR_MAIN";

console.log(`Shop checkout: moving a 2kg parcel ${origin} -> ${destination}\n`);

const { quotes } = await call("POST", "/v1/quotes", {
  origin_zone_id: origin,
  destination_zone_id: destination,
  package_weight_kg: 2,
  package_type: "apparel",
});

if (quotes.length === 0) {
  console.log("No delivery options for this route yet.");
  process.exit(0);
}

console.log("Options shown to the customer at checkout:");
for (const q of quotes) {
  console.log(`  - ${q.provider_name} (${q.provider_type}): KES ${q.estimated_cost_kes}, ${q.estimated_time}`);
}

const chosen = quotes[0];
console.log(`\nCustomer picks: ${chosen.provider_name}\n`);

const delivery = await call("POST", "/v1/deliveries", {
  quote_id: chosen.quote_id,
  sender: { name: "Asha Mwangi", phone: "+254712345678" },
  recipient: { name: "John Otieno", phone: "+254723456789" },
  package_description: "Sealed apparel box, 2kg",
});

console.log(`Booked. Tracking ID: ${delivery.tracking_id} (status: ${delivery.status})\n`);

const tracking = await call("GET", `/v1/deliveries/${delivery.tracking_id}/track`);
console.log("Tracking:");
console.log(`  current: ${tracking.status}`);
for (const event of tracking.history) {
  console.log(`  - ${event.at}  ${event.status}`);
}
