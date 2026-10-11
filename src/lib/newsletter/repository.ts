import "server-only";
import { randomUUID } from "node:crypto";
import { newsletterDb } from "./schema";
import { SENDER_NAME, CHUNK_BYTES, MAX_ATTACHMENTS_BYTES, type Attachment, type Campaign, type Delivery } from "./shared";

const now = () => new Date().toISOString();
export const WELCOME_ID = "welcome-template";
export function dailyLimit() {
  const value = Number(process.env.NEWSLETTER_DAILY_LIMIT || 100);
  if (!Number.isInteger(value) || value < 1 || value > 500) throw new Error("NEWSLETTER_DAILY_LIMIT must be 1–500.");
  return value;
}
export async function senderName() {
  return SENDER_NAME;
}
export async function getCampaign(id: string) {
  return (await newsletterDb()).get<Campaign>(`SELECT * FROM newsletter_campaigns WHERE id=?`, [id]);
}
export async function createCampaign(kind = "campaign") {
  const db = await newsletterDb();
  const id = kind === "welcome" ? WELCOME_ID : randomUUID();
  await db.run(`INSERT INTO newsletter_campaigns (id,kind,created_at) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING`, [id,kind,now()]);
  return id;
}
export async function saveCampaign(id: string, subject: string, html: string, text: string) {
  const db = await newsletterDb();
  const saved = await db.get<{ id: string }>(`UPDATE newsletter_campaigns SET subject=?,html=?,text=?,enabled=0,tested_at='',approved_at='' WHERE id=? AND state='draft' RETURNING id`, [subject,html,text,id]);
  if (!saved) throw new Error("This campaign is locked for sending. Create a new draft to change it.");
}
export async function activeCount() {
  const db = await newsletterDb();
  return Number((await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM newsletter_subscribers s WHERE NOT EXISTS (SELECT 1 FROM newsletter_optouts o WHERE o.email=s.email)`))?.n || 0);
}
export async function attachments(id: string) {
  return (await newsletterDb()).all<Attachment>(`SELECT a.*, COALESCE((SELECT SUM(size) FROM newsletter_chunks c WHERE c.attachment_id=a.id),0) AS uploaded FROM newsletter_attachments a WHERE campaign_id=? ORDER BY id`, [id]);
}
export async function addAttachment(id: string, filename: string, contentType: string, size: number) {
  const db = await newsletterDb();
  const current = await attachments(id);
  if (!Number.isInteger(size) || size < 1 || size + current.reduce((sum,a) => sum + Number(a.size),0) >= MAX_ATTACHMENTS_BYTES) throw new Error("Total attachments must be under 10 MB.");
  const file = filename.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0,180);
  if (!file) throw new Error("Attachment filename is required.");
  const attId = randomUUID();
  const reserved = await db.get(`UPDATE newsletter_campaigns SET attachment_bytes=attachment_bytes+?,tested_at='',approved_at='' WHERE id=? AND state='draft' AND kind='campaign' AND attachment_bytes+?<? RETURNING id`, [size,id,size,MAX_ATTACHMENTS_BYTES]);
  if (!reserved) throw new Error("Total attachments must be under 10 MB and the campaign must be a draft.");
  const result = await db.get<{ id: string }>(`INSERT INTO newsletter_attachments (id,campaign_id,filename,content_type,size) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM newsletter_campaigns WHERE id=? AND state='draft' AND kind='campaign') RETURNING id`, [attId,id,file,contentType.slice(0,100),size,id]);
  if (!result) throw new Error("Attachments can only be added to newsletter drafts.");
  // Invalidate after insertion too: a concurrent test may have run between reservation and insertion.
  await db.run(`UPDATE newsletter_campaigns SET tested_at='',approved_at='' WHERE id=?`, [id]);
  return attId;
}
export async function putChunk(id: string, part: number, data: string) {
  const db = await newsletterDb();
  const attachment = await db.get<Attachment>(`SELECT a.* FROM newsletter_attachments a JOIN newsletter_campaigns c ON c.id=a.campaign_id WHERE a.id=? AND c.state='draft'`, [id]);
  if (!attachment) throw new Error("Draft attachment not found.");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length > Math.ceil(CHUNK_BYTES/3)*4) throw new Error("Invalid attachment chunk.");
  const bytes = Buffer.from(data,"base64");
  if (!Number.isInteger(part) || part < 0 || part >= Math.ceil(attachment.size/CHUNK_BYTES)
    || bytes.length !== Math.min(CHUNK_BYTES, attachment.size-part*CHUNK_BYTES)
    || bytes.toString("base64") !== data) throw new Error("Invalid attachment chunk size or position.");
  await db.run(`INSERT INTO newsletter_chunks (attachment_id,part,size,data) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM newsletter_campaigns WHERE id=? AND state='draft') ON CONFLICT(attachment_id,part) DO NOTHING`, [id,part,bytes.length,data,attachment.campaign_id]);
  const stored = await db.get<{ data: string }>(`SELECT data FROM newsletter_chunks WHERE attachment_id=? AND part=?`, [id,part]);
  if (stored?.data !== data) throw new Error("Chunk conflicts with the saved attachment. Remove and upload it again.");
}
export async function removeAttachment(id: string) {
  const db = await newsletterDb();
  const file = await db.get<Attachment>(`DELETE FROM newsletter_attachments WHERE id=? AND campaign_id IN (SELECT id FROM newsletter_campaigns WHERE state='draft') RETURNING *`, [id]);
  if (!file) return;
  await db.run(`UPDATE newsletter_campaigns SET attachment_bytes=attachment_bytes-?,tested_at='',approved_at='' WHERE id=?`,[file.size,file.campaign_id]);
}
export async function attachmentBuffers(campaignId: string) {
  const db = await newsletterDb();
  const files = await attachments(campaignId);
  if (files.reduce((sum,file) => sum + Number(file.size),0) >= MAX_ATTACHMENTS_BYTES) throw new Error("Total attachments must be under 10 MB.");
  const result = [];
  for (const file of files) {
    if (Number(file.uploaded) !== Number(file.size)) throw new Error(`Finish uploading ${file.filename}, or remove it.`);
    const chunks = await db.all<{ data: string }>(`SELECT data FROM newsletter_chunks WHERE attachment_id=? ORDER BY part`, [file.id]);
    const content = Buffer.concat(chunks.map(chunk => Buffer.from(chunk.data,"base64")));
    if (content.length !== Number(file.size)) throw new Error("Attachment is incomplete.");
    result.push({ filename: file.filename, contentType: file.content_type || "application/octet-stream", content });
  }
  return result;
}
export async function startCampaign(id: string) {
  const db = await newsletterDb();
  await attachmentBuffers(id);
  // Lock first; repeated requests then repair/complete the same snapshot rather than sending twice.
  await db.run(`UPDATE newsletter_campaigns SET state='sending',started_at=?,approved_at=? WHERE id=? AND kind='campaign' AND state='draft' AND tested_at<>''`, [now(),now(),id]);
  const campaign = await getCampaign(id);
  if (!campaign || campaign.kind !== "campaign" || campaign.state !== "sending") throw new Error("Campaign cannot be started.");
  await db.run(`INSERT INTO newsletter_deliveries (id,campaign_id,email,status,updated_at)
    SELECT ? || ':' || s.email, ?, s.email, 'pending', ? FROM newsletter_subscribers s
    WHERE s.created_at <= ? AND NOT EXISTS (SELECT 1 FROM newsletter_optouts o WHERE o.email=s.email)
    ON CONFLICT(campaign_id,email) DO NOTHING`, [id,id,now(),campaign.started_at]);
}
export async function queueWelcome(email: string) {
  const db = await newsletterDb();
  await db.run(`INSERT INTO newsletter_deliveries (id,campaign_id,email,status,updated_at)
    SELECT ?,?,?, 'pending', ? WHERE EXISTS (SELECT 1 FROM newsletter_campaigns WHERE id=? AND enabled=1)
    AND NOT EXISTS (SELECT 1 FROM newsletter_optouts WHERE email=?)
    ON CONFLICT(campaign_id,email) DO NOTHING`, [`welcome:${email}`,WELCOME_ID,email,now(),WELCOME_ID,email]);
}
export async function unsubscribe(email: string) {
  const db = await newsletterDb();
  await db.run(`INSERT INTO newsletter_optouts (email,created_at) VALUES (?,?) ON CONFLICT(email) DO NOTHING`, [email,now()]);
  await db.run(`UPDATE newsletter_deliveries SET status='skipped',updated_at=? WHERE email=? AND status='pending'`, [now(),email]);
}
export async function claimDelivery(campaignId: string, email?: string) {
  const db = await newsletterDb();
  const params: unknown[] = [now(),campaignId];
  const extra = email ? " AND email=?" : "";
  if (email) params.push(email);
  return db.get<Delivery>(`UPDATE newsletter_deliveries SET status='sending',updated_at=?
    WHERE id=(SELECT id FROM newsletter_deliveries WHERE campaign_id=? AND status='pending'${extra} ORDER BY updated_at,id LIMIT 1)
    AND status='pending' RETURNING *`, params);
}
export async function finishDelivery(id: string, status: Delivery["status"], error = "") {
  await (await newsletterDb()).run(`UPDATE newsletter_deliveries SET status=?,error=?,updated_at=? WHERE id=? AND status='sending'`, [status,error,now(),id]);
}
export async function optedOut(email: string) {
  return Boolean(await (await newsletterDb()).get(`SELECT email FROM newsletter_optouts WHERE email=?`, [email]));
}
export async function reserveSlot() {
  const db = await newsletterDb();
  const limit = dailyLimit();
  // A rolling 24-hour slot ledger enforces an atomic shared cap across serverless instances.
  await db.run(`INSERT INTO newsletter_send_slots (slot,used_at) VALUES ${Array.from({length:limit},()=>"(?, '')").join(",")} ON CONFLICT(slot) DO NOTHING`,Array.from({length:limit},(_,slot)=>slot));
  const cutoff = new Date(Date.now()-24*60*60*1000).toISOString();
  return Boolean(await db.get(`UPDATE newsletter_send_slots SET used_at=? WHERE slot=(SELECT slot FROM newsletter_send_slots WHERE slot<? AND used_at<? ORDER BY used_at,slot LIMIT 1) AND used_at<? RETURNING slot`, [now(),limit,cutoff,cutoff]));
}
export async function usedSlots() {
  const cutoff = new Date(Date.now()-24*60*60*1000).toISOString();
  return Number((await (await newsletterDb()).get<{ n: number }>(`SELECT COUNT(*) AS n FROM newsletter_send_slots WHERE used_at>=?`, [cutoff]))?.n || 0);
}
export async function refreshDeliveryStates() {
  const db = await newsletterDb();
  // Never retry an interrupted SMTP attempt automatically: Gmail may already have accepted it.
  await db.run(`UPDATE newsletter_deliveries SET status='uncertain',error='Interrupted send. Check Gmail Sent before retrying.' WHERE status='sending' AND updated_at<?`, [new Date(Date.now()-120_000).toISOString()]);
  await db.run(`UPDATE newsletter_campaigns SET state='draft',tested_at='' WHERE state='testing' AND tested_at<?`,[new Date(Date.now()-120_000).toISOString()]);
  await db.run(`UPDATE newsletter_campaigns SET state='complete' WHERE kind='campaign' AND state='sending' AND EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.campaign_id=newsletter_campaigns.id) AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.campaign_id=newsletter_campaigns.id AND d.status IN ('pending','sending','failed','uncertain'))`);
}
export async function resolveDelivery(id: string, retry: boolean) {
  const db = await newsletterDb();
  await db.run(`UPDATE newsletter_deliveries SET status=?,error='',updated_at=? WHERE id=? AND status IN ('failed','uncertain')`, [retry ? "pending" : "sent",now(),id]);
  if (retry) await db.run(`UPDATE newsletter_campaigns SET state='sending' WHERE kind='campaign' AND id=(SELECT campaign_id FROM newsletter_deliveries WHERE id=?)`, [id]);
}
export async function approveWelcome() {
  const db = await newsletterDb();
  const row = await db.get(`UPDATE newsletter_campaigns SET enabled=1,approved_at=? WHERE id=? AND state='draft' AND tested_at<>'' RETURNING id`,[now(),WELCOME_ID]);
  if (!row) throw new Error("Save and send a successful welcome test to both test addresses first.");
}
export async function disableWelcome() {
  await (await newsletterDb()).run(`UPDATE newsletter_campaigns SET enabled=0 WHERE id=?`,[WELCOME_ID]);
}
export async function listData(selectedId = WELCOME_ID) {
  const db = await newsletterDb();
  await createCampaign("welcome");
  await refreshDeliveryStates();
  const campaigns = await db.all<Campaign>(`SELECT id,kind,subject,'' AS html,'' AS text,state,enabled,created_at,started_at,tested_at,approved_at FROM newsletter_campaigns ORDER BY created_at DESC LIMIT 100`);
  if (!campaigns.some(c => c.id === WELCOME_ID)) {
    const welcome = await getCampaign(WELCOME_ID);
    if (welcome) campaigns.push({ ...welcome, html: "", text: "" });
  }
  const selected = await getCampaign(selectedId);
  if (selected) { const index = campaigns.findIndex(c => c.id===selectedId); if (index>=0) campaigns[index]=selected; else campaigns.push(selected); }
  const files = await db.all<Attachment>(`SELECT a.*,COALESCE((SELECT SUM(size) FROM newsletter_chunks c WHERE c.attachment_id=a.id),0) AS uploaded FROM newsletter_attachments a`);
  const deliveries = await db.all<Delivery>(`SELECT * FROM newsletter_deliveries WHERE campaign_id=? ORDER BY CASE WHEN status IN ('failed','uncertain') THEN 0 ELSE 1 END,updated_at DESC LIMIT 200`,[selectedId]);
  const counts = await db.all<{status:string; n:number}>(`SELECT status,COUNT(*) AS n FROM newsletter_deliveries WHERE campaign_id=? GROUP BY status`,[selectedId]);
  return { campaigns, attachments: files, deliveries, senderName: await senderName(),
    summary: Object.fromEntries(counts.map(row => [row.status,Number(row.n)])),
    dailyLimit: dailyLimit(), used: await usedSlots(), subscribers: await activeCount() };
}
