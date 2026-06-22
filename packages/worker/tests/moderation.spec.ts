import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import {
  approveSubmission,
  createSubmission,
  getSubmission,
  listSubmissions,
  rejectSubmission,
  type SubmissionInput,
} from "../src/moderation.js";

const NOW = "2026-06-15T10:00:00.000Z";

function ratesSubmission(overrides: Partial<Record<string, unknown>> = {}): SubmissionInput {
  return {
    target: "rates",
    operation: "create",
    payload: {
      provider_id: "mololine",
      origin_zone_id: "ZONE_NBI_CBD_01",
      destination_zone_id: "ZONE_MOD_NEW",
      base_cost_kes: 500,
      cost_per_kg_kes: 20,
      est_time: "5 hours",
      max_weight_kg: 20,
      collection_type: "office_pickup",
      source: "Mololine parcel desk, self-reported 2026-06-15",
      ...overrides,
    },
    source: "Mololine parcel desk, self-reported 2026-06-15",
    submitted_by: "mololine",
  };
}

async function rateRow() {
  return env.itafika
    .prepare("SELECT * FROM rates WHERE provider_id = ? AND origin_zone_id = ? AND destination_zone_id = ?")
    .bind("mololine", "ZONE_NBI_CBD_01", "ZONE_MOD_NEW")
    .first<{ base_cost_kes: number; source: string }>();
}

beforeAll(async () => {
  await env.itafika.batch([
    env.itafika.prepare("INSERT OR IGNORE INTO zones (id, name, type, town, county) VALUES (?,?,?,?,?)").bind("ZONE_NBI_CBD_01", "RNG Plaza", "cbd_hub", "Nairobi", "Nairobi"),
    env.itafika.prepare("INSERT OR IGNORE INTO zones (id, name, type, town, county) VALUES (?,?,?,?,?)").bind("ZONE_MOD_NEW", "Moderation Test Stage", "stage", "Moderation", "Test"),
    env.itafika.prepare("INSERT OR IGNORE INTO zones (id, name, type, town, county) VALUES (?,?,?,?,?)").bind("ZONE_MOD_FRESH", "Moderation Fresh Stage", "stage", "Moderation", "Test"),
    env.itafika.prepare("INSERT OR IGNORE INTO zones (id, name, type, town, county) VALUES (?,?,?,?,?)").bind("ZONE_MOD_TWICE", "Moderation Twice Stage", "stage", "Moderation", "Test"),
    env.itafika.prepare("INSERT OR IGNORE INTO modes (id, label, description, source) VALUES (?,?,?,?)").bind("matatu_sacco", "Matatu SACCO", "Shared-taxi SACCO parcel desk.", "seed"),
    env.itafika.prepare("INSERT OR IGNORE INTO providers (id, name, type, reliability_score) VALUES (?,?,?,?)").bind("mololine", "Mololine Sacco", "matatu_sacco", 0.98),
  ]);
});

describe("submissions queue", () => {
  it("stores a pending rates submission and lists it", async () => {
    const created = await createSubmission(env.itafika, ratesSubmission(), NOW);
    expect(created).not.toBeNull();
    expect(created!.status).toBe("pending");

    const pending = await listSubmissions(env.itafika, "pending");
    expect(pending.map((s) => s.id)).toContain(created!.id);
  });

  it("rejects an invalid rates payload at submission time", async () => {
    const bad = await createSubmission(env.itafika, ratesSubmission({ base_cost_kes: -5 }), NOW);
    expect(bad).toBeNull();
  });
});

describe("approveSubmission", () => {
  it("applies a new rate and records a change_log row with no prior snapshot", async () => {
    // Dedicated route nothing else writes to, so "before" is reliably null regardless
    // of test order on the shared single-worker D1.
    const created = await createSubmission(
      env.itafika,
      ratesSubmission({ base_cost_kes: 550, destination_zone_id: "ZONE_MOD_FRESH" }),
      NOW,
    );
    const result = await approveSubmission(env.itafika, created!.id, "moderator-1", "looks right", NOW);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.submission.status).toBe("approved");

    const freshRate = await env.itafika
      .prepare("SELECT base_cost_kes FROM rates WHERE provider_id = ? AND origin_zone_id = ? AND destination_zone_id = ?")
      .bind("mololine", "ZONE_NBI_CBD_01", "ZONE_MOD_FRESH")
      .first<{ base_cost_kes: number }>();
    expect(freshRate?.base_cost_kes).toBe(550);

    const log = await env.itafika
      .prepare("SELECT * FROM change_log WHERE submission_id = ?")
      .bind(created!.id)
      .first<{ before: string | null; after: string; changed_by: string; row_key: string }>();
    expect(log).not.toBeNull();
    expect(log!.before).toBeNull();
    expect(log!.changed_by).toBe("moderator-1");
    expect(log!.row_key).toBe("mololine|ZONE_NBI_CBD_01|ZONE_MOD_FRESH");
    expect(JSON.parse(log!.after).base_cost_kes).toBe(550);
  });

  it("captures the before-snapshot when updating an existing rate", async () => {
    await approveSubmission(
      env.itafika,
      (await createSubmission(env.itafika, ratesSubmission({ base_cost_kes: 600 }), NOW))!.id,
      "moderator-1",
      null,
      NOW,
    );

    const updateSub = await createSubmission(
      env.itafika,
      { ...ratesSubmission({ base_cost_kes: 650 }), operation: "update" },
      NOW,
    );

    const result = await approveSubmission(env.itafika, updateSub!.id, "moderator-2", null, NOW);
    expect(result.ok).toBe(true);
    expect((await rateRow())?.base_cost_kes).toBe(650);

    const log = await env.itafika
      .prepare("SELECT before, after FROM change_log WHERE submission_id = ?")
      .bind(updateSub!.id)
      .first<{ before: string | null; after: string }>();
    expect(log!.before).not.toBeNull();
    expect(JSON.parse(log!.before!).base_cost_kes).toBe(600);
    expect(JSON.parse(log!.after).base_cost_kes).toBe(650);
  });

  it("refuses to approve a submission twice", async () => {
    const created = await createSubmission(
      env.itafika,
      ratesSubmission({ destination_zone_id: "ZONE_MOD_TWICE" }),
      NOW,
    );
    await approveSubmission(env.itafika, created!.id, "moderator-1", null, NOW);
    const second = await approveSubmission(env.itafika, created!.id, "moderator-1", null, NOW);
    expect(second).toEqual({ ok: false, reason: "already_reviewed" });
  });

  it("returns not_found for an unknown submission", async () => {
    const result = await approveSubmission(env.itafika, "sub_doesnotexist", "moderator-1", null, NOW);
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("rejectSubmission", () => {
  it("marks a submission rejected without applying any change", async () => {
    const created = await createSubmission(env.itafika, ratesSubmission({ base_cost_kes: 999 }), NOW);
    const result = await rejectSubmission(env.itafika, created!.id, "moderator-1", "unverified source", NOW);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submission.status).toBe("rejected");
      expect(result.submission.review_note).toBe("unverified source");
    }

    const stored = await getSubmission(env.itafika, created!.id);
    expect(stored!.status).toBe("rejected");
    expect((await rateRow())?.base_cost_kes).not.toBe(999);
  });
});
