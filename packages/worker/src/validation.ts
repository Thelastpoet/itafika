import type { Contact } from "@itafika/core";

import { QUOTE_ID_RE, TRACKING_ID_RE } from "./policy.js";

const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const NAME_MAX_LENGTH = 120;
const PHONE_MAX_LENGTH = 16;
const ID_NUMBER_MAX_LENGTH = 40;
const PACKAGE_DESCRIPTION_MAX_LENGTH = 500;
const INSTRUCTIONS_MAX_LENGTH = 500;
const TRACKING_NOTE_MAX_LENGTH = 500;

export function clampLimit(raw: string | null): number {
  const n = raw === null ? 100 : Number(raw);
  if (!Number.isFinite(n)) return 100;
  return Math.min(500, Math.max(1, Math.trunc(n)));
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maxLength) return null;
  return normalized;
}

export function parseContact(value: unknown): Contact | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Contact;
  const name = normalizeText(candidate.name, NAME_MAX_LENGTH);
  const phone = normalizeText(candidate.phone, PHONE_MAX_LENGTH);
  if (name === null || phone === null || !PHONE_RE.test(phone)) return null;
  const contact: Contact = { name, phone };
  // id_number is optional (ADR 0018); reject only if present and malformed.
  if (candidate.id_number !== undefined) {
    const idNumber = normalizeText(candidate.id_number, ID_NUMBER_MAX_LENGTH);
    if (idNumber === null) return null;
    contact.id_number = idNumber;
  }
  return contact;
}

export function parsePackageDescription(value: unknown): string | null {
  return normalizeText(value, PACKAGE_DESCRIPTION_MAX_LENGTH);
}

export function parseInstructions(value: unknown): string | null {
  return normalizeText(value, INSTRUCTIONS_MAX_LENGTH);
}

export function parseTrackingNote(value: unknown): string | null {
  return normalizeText(value, TRACKING_NOTE_MAX_LENGTH);
}

export function isQuoteId(value: string): boolean {
  return QUOTE_ID_RE.test(value);
}

export function isTrackingId(value: string): boolean {
  return TRACKING_ID_RE.test(value);
}
