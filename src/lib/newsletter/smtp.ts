import "server-only";
import nodemailer from "nodemailer";
import { SENDER_EMAIL, TEST_EMAILS, renderEmail, validContent } from "./shared";
import { newsletterDb } from "./schema";
import { unsubscribeUrl } from "./tokens";
import { attachmentBuffers, claimDelivery, finishDelivery, getCampaign, optedOut, reserveSlot, senderName, WELCOME_ID } from "./repository";

export function smtpConfigured() {
  return Boolean(process.env.GMAIL_APP_PASSWORD && (process.env.NEWSLETTER_TOKEN_SECRET?.length || 0) >= 32);
}
export async function requireSendingSetup() {
  if (!smtpConfigured()) throw new Error("Set GMAIL_APP_PASSWORD and NEWSLETTER_TOKEN_SECRET in Vercel first.");
  const name = await senderName();
  if (!name) throw new Error("Save your sender display name first.");
  return name;
}
export function smtpTransport() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: SENDER_EMAIL, pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g,"") },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
    dnsTimeout: 5000, disableFileAccess: true, disableUrlAccess: true,
    logger: false, debug: false,
  });
}
export async function sendOne(campaignId: string, email?: string) {
  const name = await requireSendingSetup();
  const campaign = await getCampaign(campaignId);
  if (!campaign || !validContent(campaign.subject,campaign.html,campaign.text)) throw new Error("Save a subject and email content first.");
  if (campaignId === WELCOME_ID && (!campaign.enabled || !campaign.approved_at || campaign.state!=='draft')) return { status: "paused" };
  if (campaign.kind === "campaign" && campaign.state !== "sending") throw new Error("Start this campaign first.");
  const files = await attachmentBuffers(campaignId);
  const delivery = await claimDelivery(campaignId,email);
  if (!delivery) return { status: "done" };
  try {
    if (await optedOut(delivery.email)) {
      await finishDelivery(delivery.id,"skipped");
      return { status: "skipped" };
    }
    const url = unsubscribeUrl(delivery.email);
    if (!(await reserveSlot())) {
      await finishDelivery(delivery.id,"pending","Rolling 24-hour application sending cap reached.");
      return { status: "limit" };
    }
    const mail = renderEmail(campaign.html,campaign.text,url);
    const transporter = smtpTransport();
    try {
      const result = await transporter.sendMail({
        from: { name, address: SENDER_EMAIL }, replyTo: SENDER_EMAIL,
        to: delivery.email, subject: campaign.subject, ...mail, attachments: files,
        messageId: `<${Buffer.from(delivery.id).toString("base64url")}@dotm.in>`,
        headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      if (!result.accepted?.includes(delivery.email)) {
        await finishDelivery(delivery.id,"failed","SMTP did not accept this recipient.");
        return { status: "failed" };
      }
      await finishDelivery(delivery.id,"sent");
      return { status: "sent" };
    } finally { transporter.close(); }
  } catch (error) {
    // Do not expose SMTP responses, credentials or message content in API errors.
    const smtp = error as { responseCode?: number; code?: string; command?: string };
    const rejected = Boolean(smtp.responseCode && smtp.responseCode >= 400);
    const preSend = smtp.code === "EAUTH" || smtp.code === "EDNS" || smtp.command === "CONN";
    const status = rejected || preSend ? "failed" : "uncertain";
    await finishDelivery(delivery.id,status,rejected || preSend
      ? "SMTP rejected the attempt. Check your Gmail configuration or quota before retrying."
      : "Sending was interrupted. Check Gmail Sent before retrying to avoid a duplicate.");
    return { status };
  }
}
export async function testCampaign(campaignId: string) {
  const name = await requireSendingSetup();
  const db = await newsletterDb();
  const locked = await db.get(`UPDATE newsletter_campaigns SET state='testing',enabled=0,tested_at=? WHERE id=? AND state='draft' RETURNING id`,[new Date().toISOString(),campaignId]);
  if (!locked) throw new Error("Save a draft before sending tests.");
  const transporter = smtpTransport();
  try {
    const campaign = await getCampaign(campaignId);
    if (!campaign || !validContent(campaign.subject,campaign.html,campaign.text)) throw new Error("Save valid email content first.");
    const files = await attachmentBuffers(campaignId);
    for (const recipient of TEST_EMAILS) {
      if (!(await reserveSlot())) throw new Error("Rolling 24-hour application sending cap reached.");
      const result = await transporter.sendMail({ from: { name, address: SENDER_EMAIL }, replyTo: SENDER_EMAIL,
        to: recipient, subject: campaign.subject,
        ...renderEmail(campaign.html,campaign.text,unsubscribeUrl(recipient)), attachments: files });
      if (!result.accepted?.includes(recipient)) throw new Error("Test recipient rejected.");
    }
    await db.run(`UPDATE newsletter_campaigns SET state='draft',tested_at=? WHERE id=? AND state='testing'`,[new Date().toISOString(),campaignId]);
  } catch {
    await db.run(`UPDATE newsletter_campaigns SET state='draft',tested_at='' WHERE id=? AND state='testing'`,[campaignId]);
    throw new Error("Gmail test failed. Both test addresses must receive a successful test before approval.");
  }
  finally { transporter.close(); }
}
