import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { formatGel } from "@/lib/i18n";

// Downloadable receipt (roadmap 4.7). buildReceiptHtml is pure/testable;
// printReceipt is the actual print/share side effect, kept separate the same
// way the rest of this codebase splits pure formatting from I/O.

export type ReceiptService = { name: string };
export type ReceiptPayment = { amount: number; method: string };

export type ReceiptData = {
  businessName: string;
  plateNumber: string;
  make: string | null;
  model: string | null;
  customerName: string;
  jobDateLabel: string;
  services: ReceiptService[];
  priceTotal: number | null;
  payments: ReceiptPayment[];
  conditionNote: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildReceiptHtml(data: ReceiptData): string {
  const vehicleLine = [data.make, data.model].filter(Boolean).join(" ") || "—";
  const paidTotal = data.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const servicesHtml =
    data.services.length > 0
      ? data.services.map((s) => `<li>${escapeHtml(s.name)}</li>`).join("")
      : "<li>—</li>";
  const paymentsHtml =
    data.payments.length > 0
      ? data.payments
          .map(
            (p) =>
              `<tr><td>${escapeHtml(p.method)}</td><td style="text-align:right">${formatGel(
                Number(p.amount)
              )}</td></tr>`
          )
          .join("")
      : "";

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .muted { color: #666; font-size: 13px; }
  .section { margin-top: 20px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td { padding: 4px 0; font-size: 14px; }
  .total-row td { border-top: 1px solid #ccc; font-weight: 700; padding-top: 8px; }
</style>
</head>
<body>
  <h1>${escapeHtml(data.businessName)}</h1>
  <div class="muted">${escapeHtml(data.jobDateLabel)}</div>

  <div class="section">
    <div class="label">Vehicle</div>
    <div>${escapeHtml(data.plateNumber)} — ${escapeHtml(vehicleLine)}</div>
  </div>

  <div class="section">
    <div class="label">Customer</div>
    <div>${escapeHtml(data.customerName)}</div>
  </div>

  <div class="section">
    <div class="label">Services</div>
    <ul>${servicesHtml}</ul>
  </div>

  ${
    data.conditionNote
      ? `<div class="section"><div class="label">Condition notes</div><div>${escapeHtml(
          data.conditionNote
        )}</div></div>`
      : ""
  }

  <div class="section">
    <table>
      ${paymentsHtml}
      <tr class="total-row">
        <td>Total</td>
        <td style="text-align:right">${
          data.priceTotal != null ? formatGel(data.priceTotal) : "—"
        }</td>
      </tr>
      <tr>
        <td>Paid</td>
        <td style="text-align:right">${formatGel(paidTotal)}</td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

// Generates the PDF and hands it to the OS. On web, printToFileAsync opens
// the browser print dialog directly (the user picks "Save as PDF" there) --
// nothing further to do. On native, it writes a file we then push through
// the share sheet so the detailer can save or forward it.
export async function printReceipt(html: string): Promise<string | null> {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (Platform.OS === "web") return null;
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Failed to generate receipt.";
  }
}
