export const SENDER_EMAIL = "dotmoriginal@gmail.com";
export const SENDER_NAME = "DOTM";
export const TEST_EMAILS = [SENDER_EMAIL, "aryankant1312@gmail.com"];
export const MAX_ATTACHMENTS_BYTES = 10_000_000;
export const CHUNK_BYTES = 256_000;
export const MAX_CONTENT_BYTES = 500_000;

export type Campaign = {
  id: string;
  kind: "campaign" | "welcome";
  subject: string;
  html: string;
  text: string;
  state: "draft" | "testing" | "sending" | "complete";
  enabled: number;
  created_at: string;
  started_at: string;
  tested_at: string;
  approved_at: string;
};
export type Attachment = {
  id: string; campaign_id: string; filename: string; content_type: string;
  size: number; uploaded: number;
};
export type Delivery = {
  id: string; campaign_id: string; email: string;
  status: "pending" | "sending" | "sent" | "failed" | "uncertain" | "skipped";
  updated_at: string; error: string;
};
export type NewsletterPayload = {
  smtpConfigured: boolean; senderName: string; dailyLimit: number; used: number;
  subscribers: number; campaigns: Campaign[]; attachments: Attachment[];
  deliveries: Delivery[];
  summary: Record<string, number>;
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function renderEmail(html: string, text: string, unsubscribeUrl: string) {
  const url = escapeHtml(unsubscribeUrl);
  const footer = `<p style="font:12px Arial,sans-serif;padding:16px"><a href="${url}">Unsubscribe from the DOTM newsletter</a></p>`;
  let body = html.trim() || `<div style="white-space:pre-wrap;font:16px Arial,sans-serif">${escapeHtml(text)}</div>`;
  // Always include an unsubscribe control, including in uploaded complete documents.
  body = /<\/body\s*>/i.test(body) ? body.replace(/<\/body\s*>/i, `${footer}</body>`) : body + footer;
  return { html: body, text: `${text.trim()}\n\nUnsubscribe: ${unsubscribeUrl}`.trim() };
}

export function validContent(subject: string, html: string, text: string) {
  return Boolean(subject.trim() && subject.length <= 200 && !/[\r\n]/.test(subject)
    && (html.trim() || text.trim())
    && new TextEncoder().encode(html + text).length <= MAX_CONTENT_BYTES);
}
