import { tokenEmail } from "@/lib/newsletter/tokens";
import { unsubscribe } from "@/lib/newsletter/repository";
import { escapeHtml } from "@/lib/newsletter/shared";
export const runtime = "nodejs";
function page(content: string, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DOTM newsletter</title></head><body style="font:18px Arial,sans-serif;max-width:600px;margin:60px auto;padding:24px"><h1>DOTM newsletter</h1>${content}</body></html>`,{ status,headers: {
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
  } });
}
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    if (!tokenEmail(token)) return page("<p>This unsubscribe link is invalid.</p>",400);
    // GET never changes subscription state: email security scanners follow links.
    return page(`<p>Stop receiving DOTM newsletters?</p><form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">Unsubscribe</button></form>`);
  } catch { return page("<p>Unsubscribe is temporarily unavailable. Please try again.</p>",503); }
}
export async function POST(request: Request) {
  try {
    const urlToken = new URL(request.url).searchParams.get("token");
    const raw = await request.text();
    if (raw.length > 2048) return page("<p>Invalid request.</p>",400);
    const form = new URLSearchParams(raw);
    const email = tokenEmail(urlToken || form.get("token") || "");
    if (!email) return page("<p>This unsubscribe link is invalid.</p>",400);
    await unsubscribe(email);
    return page("<p>You have unsubscribed from DOTM newsletters.</p><a href=\"https://dotm.in/\">Return to DOTM</a>");
  } catch { return page("<p>Could not save your preference. Please try again.</p>",503); }
}
