import "server-only";
import { ensureSchema } from "@/lib/db/schema";
import { getDriver } from "@/lib/db/driver";

const statements = [
  `CREATE TABLE IF NOT EXISTS newsletter_config (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS newsletter_optouts (email TEXT PRIMARY KEY, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '',
    html TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'draft',
    enabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT '',
    tested_at TEXT NOT NULL DEFAULT '', approved_at TEXT NOT NULL DEFAULT '', attachment_bytes INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS newsletter_attachments (
    id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES newsletter_campaigns(id),
    filename TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS newsletter_chunks (
    attachment_id TEXT NOT NULL REFERENCES newsletter_attachments(id) ON DELETE CASCADE,
    part INTEGER NOT NULL, size INTEGER NOT NULL, data TEXT NOT NULL,
    PRIMARY KEY (attachment_id, part)
  )`,
  `CREATE TABLE IF NOT EXISTS newsletter_deliveries (
    id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES newsletter_campaigns(id),
    email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', updated_at TEXT NOT NULL,
    error TEXT NOT NULL DEFAULT '', UNIQUE(campaign_id, email)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_newsletter_delivery_status ON newsletter_deliveries(campaign_id, status)`,
  `CREATE TABLE IF NOT EXISTS newsletter_send_slots (slot INTEGER PRIMARY KEY, used_at TEXT NOT NULL)`,
];
let ready: Promise<void> | undefined;
export async function newsletterDb() {
  if (!ready) ready = (async () => {
    await ensureSchema();
    const db = await getDriver();
    for (const sql of statements) await db.run(sql);
  })().catch(error => { ready = undefined; throw error; });
  await ready;
  return getDriver();
}
