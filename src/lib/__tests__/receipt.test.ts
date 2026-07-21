/* eslint-disable import/first */ // jest.mock must be hoisted above imports
// buildReceiptHtml is pure; mock the native print/share modules so importing
// receipt.ts doesn't pull in native code under Jest.
jest.mock("expo-print", () => ({ printToFileAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

import { buildReceiptHtml, type ReceiptData } from "@/lib/receipt";

const base: ReceiptData = {
  businessName: "Carbros Detailing",
  plateNumber: "AA-123-BB",
  make: "Toyota",
  model: "Camry",
  customerName: "Nika Beridze",
  jobDateLabel: "2026-07-14",
  services: [{ name: "Full detail" }, { name: "Ceramic coat" }],
  priceTotal: 300,
  payments: [{ amount: 100, method: "Cash" }],
  conditionNote: null,
};

describe("buildReceiptHtml", () => {
  it("includes plate, vehicle, customer, and services", () => {
    const html = buildReceiptHtml(base);
    expect(html).toContain("AA-123-BB");
    expect(html).toContain("Toyota Camry");
    expect(html).toContain("Nika Beridze");
    expect(html).toContain("Full detail");
    expect(html).toContain("Ceramic coat");
  });

  it("shows total and paid amounts formatted in GEL", () => {
    const html = buildReceiptHtml(base);
    expect(html).toContain("300 ₾");
    expect(html).toContain("100 ₾");
  });

  it("omits the condition section when there's no note", () => {
    const html = buildReceiptHtml(base);
    expect(html).not.toContain("Condition notes");
  });

  it("includes the condition section when a note is present", () => {
    const html = buildReceiptHtml({ ...base, conditionNote: "Scratch on rear bumper" });
    expect(html).toContain("Condition notes");
    expect(html).toContain("Scratch on rear bumper");
  });

  it("escapes HTML-significant characters in free text", () => {
    const html = buildReceiptHtml({ ...base, customerName: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("falls back to an em dash when there is no vehicle make/model", () => {
    const html = buildReceiptHtml({ ...base, make: null, model: null });
    expect(html).toContain("AA-123-BB — —");
  });
});
