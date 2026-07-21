/* eslint-disable import/first */ // jest.mock must be hoisted above imports
// The helpers under test are pure; mock supabase + integrations only so
// importing quotes.ts doesn't pull in the native AsyncStorage module.
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/lib/integrations", () => ({ sendWhatsAppMessage: jest.fn() }));

import { isQuoteExpired, quoteDisplayStatus, type JobQuote } from "@/lib/quotes";

const NOW = new Date("2026-07-14T12:00:00Z");

const quote = (over: Partial<JobQuote>): JobQuote => ({
  quote_price: 200,
  quote_description: "Full detail",
  quote_status: null,
  quote_sent_at: null,
  quote_expires_at: null,
  ...over,
});

describe("isQuoteExpired", () => {
  it("is true when the expiry is in the past", () => {
    expect(isQuoteExpired("2026-07-13T12:00:00Z", NOW)).toBe(true);
  });
  it("is false when the expiry is in the future", () => {
    expect(isQuoteExpired("2026-07-16T12:00:00Z", NOW)).toBe(false);
  });
  it("is false for a null expiry (never sent)", () => {
    expect(isQuoteExpired(null, NOW)).toBe(false);
  });
});

describe("quoteDisplayStatus", () => {
  it("is 'none' when there's no quote", () => {
    expect(quoteDisplayStatus(quote({ quote_status: null }), NOW)).toBe("none");
  });
  it("shows a sent quote as 'sent' while still valid", () => {
    expect(
      quoteDisplayStatus(
        quote({ quote_status: "sent", quote_expires_at: "2026-07-16T12:00:00Z" }),
        NOW
      )
    ).toBe("sent");
  });
  it("derives 'expired' for a sent quote past its expiry", () => {
    expect(
      quoteDisplayStatus(
        quote({ quote_status: "sent", quote_expires_at: "2026-07-13T12:00:00Z" }),
        NOW
      )
    ).toBe("expired");
  });
  it("keeps accepted/declined regardless of expiry", () => {
    expect(
      quoteDisplayStatus(
        quote({ quote_status: "accepted", quote_expires_at: "2026-07-13T12:00:00Z" }),
        NOW
      )
    ).toBe("accepted");
    expect(
      quoteDisplayStatus(
        quote({ quote_status: "declined", quote_expires_at: "2026-07-13T12:00:00Z" }),
        NOW
      )
    ).toBe("declined");
  });
  it("shows a draft as 'draft'", () => {
    expect(quoteDisplayStatus(quote({ quote_status: "draft" }), NOW)).toBe("draft");
  });
});
