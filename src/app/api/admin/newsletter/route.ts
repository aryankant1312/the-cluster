import { NextResponse } from "next/server";
import { adminConfigured, isAuthenticated } from "@/lib/admin-auth";
import { newsletterDb } from "@/lib/newsletter/schema";
import { addAttachment, approveWelcome, disableWelcome, createCampaign, getCampaign, listData, putChunk, removeAttachment, resolveDelivery, saveCampaign, startCampaign } from "@/lib/newsletter/repository";
import { requireSendingSetup, sendOne, smtpConfigured, testCampaign } from "@/lib/newsletter/smtp";
import { validContent } from "@/lib/newsletter/shared";

export const runtime = "nodejs";
export const maxDuration = 60;
async function guard(request: Request, write = false) {
  if (!adminConfigured() || !(await isAuthenticated())) return NextResponse.json({ error: "Admin sign-in required." },{ status: 401 });
  if (write) {
    // Next may normalize request.url to an internal hostname. Host describes the
    // browser-facing origin; x-forwarded-proto describes Vercel's TLS termination.
    const host = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(request.url).protocol.slice(0,-1);
    const expected = host && ["http","https"].includes(protocol) ? new URL(protocol + "://" + host).origin : null;
    if (!expected || request.headers.get("origin") !== expected) return NextResponse.json({ error: "Same-origin request required." },{ status: 403 });
  }
  return null;
}
export async function GET(request: Request) {
  const blocked = await guard(request);
  if (blocked) return blocked;
  try {
    return NextResponse.json({ ...await listData(new URL(request.url).searchParams.get("id") || undefined), smtpConfigured: smtpConfigured() },{ headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Newsletter database is unavailable." },{ status: 503 }); }
}
export async function POST(request: Request) {
  const blocked = await guard(request,true);
  if (blocked) return blocked;
  let body;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1_100_000) return NextResponse.json({ error: "Request is too large." },{ status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch { return NextResponse.json({ error: "Invalid request." },{ status: 400 }); }
  const value = (key: string) => String(body[key] || "");
  const id = value("id");
  try {
    switch (body.action) {
      case "create": return NextResponse.json({ id: await createCampaign() });
      case "approve_welcome": await requireSendingSetup(); await approveWelcome(); break;
      case "disable_welcome": await disableWelcome(); break;
      case "save": {
        const subject = value("subject").trim();
        const html = value("html"); const text = value("text");
        // Empty drafts may be saved; enabling welcome requires complete content.
        if ((subject || html || text || body.enabled) && !validContent(subject,html,text)) throw new Error("Enter a subject (up to 200 characters) and HTML or text (up to 500 KB).");
        await saveCampaign(id,subject,html,text); break;
      }
      case "attachment": return NextResponse.json({ id: await addAttachment(id,value("filename"),value("contentType"),Number(body.size)) });
      case "chunk": await putChunk(id,Number(body.part),value("data")); break;
      case "remove_attachment": await removeAttachment(id); break;
      case "test": await testCampaign(id); break;
      case "start": {
        await requireSendingSetup();
        const campaign = await getCampaign(id);
        if (!campaign || !validContent(campaign.subject,campaign.html,campaign.text)) throw new Error("Save valid email content first.");
        await startCampaign(id); break;
      }
      case "process": return NextResponse.json(await sendOne(id));
      case "resolve":
        if (body.retry !== true && body.retry !== false) throw new Error("Choose retry or mark as sent.");
        await resolveDelivery(id,body.retry === true); break;
      case "delete": {
        const db = await newsletterDb();
        if ((await getCampaign(id))?.kind !== "campaign") throw new Error("Cannot delete the welcome template.");
        await db.run(`DELETE FROM newsletter_attachments WHERE campaign_id IN (SELECT id FROM newsletter_campaigns WHERE id=? AND state='draft')`,[id]);
        await db.run(`DELETE FROM newsletter_campaigns WHERE id=? AND state='draft'`,[id]); break;
      }
      default: throw new Error("Unknown newsletter action.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Newsletter action failed.";
    // Only our actionable errors are public; SQL/driver errors can contain private details.
    const safe = /^(Enter |This campaign|Total attachments|Attachment|Draft attachment|Invalid attachment|Chunk conflicts|Attachments can|Finish uploading|Campaign cannot|Set GMAIL|Set NEWSLETTER|Save |Start |Rolling |Gmail test|Choose |Cannot delete|Unknown newsletter|Newsletter URL)/.test(message);
    return NextResponse.json({ error: safe ? message : "Newsletter action failed. Check database configuration." },{ status: 400 });
  }
}
