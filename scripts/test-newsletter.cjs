// Runs against an isolated SQLite database and a fake SMTP transport. No real mail is sent.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(),'dotm-newsletter-test-'));
process.env.DATABASE_DRIVER='sqlite';
process.env.SQLITE_PATH=path.join(scratch,'newsletter.db');
process.env.GMAIL_APP_PASSWORD='test-only-not-a-real-password';
process.env.NEWSLETTER_TOKEN_SECRET='test-only-token-secret-32-characters-long';
process.env.NEWSLETTER_SITE_URL='https://dotm.in';
process.env.NEWSLETTER_DAILY_LIMIT='100';
const emails=[];
let failRecipient='';
let uncertainty=false;
const load = Module._load;
Module._load=function(specifier,parent,main) {
  if(specifier==='server-only') return {};
  if(specifier==='nodemailer') return {createTransport:()=>({
    async sendMail(mail) {
      if(uncertainty) throw Object.assign(new Error('SMTP disconnected'),{code:'ETIMEDOUT'});
      if(mail.to===failRecipient) throw Object.assign(new Error('Recipient rejected'),{responseCode:550});
      emails.push(mail); return {accepted:[mail.to]};
    }, close() {},
  })};
  if(specifier.startsWith('@/')) specifier=path.join(root,'src',specifier.slice(2));
  return load.call(this,specifier,parent,main);
};
require.extensions['.ts']=function(module,filename) {
  const source=fs.readFileSync(filename,'utf8');
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}});
  module._compile(outputText,filename);
};

(async()=> {
  const repo=require('../src/lib/newsletter/repository.ts');
  const {newsletterDb}=require('../src/lib/newsletter/schema.ts');
  const smtp=require('../src/lib/newsletter/smtp.ts');
  const tokens=require('../src/lib/newsletter/tokens.ts');
  const shared=require('../src/lib/newsletter/shared.ts');
  const subscribers=require('../src/lib/db/repositories.ts').newsletter;
  const db=await newsletterDb();
  await repo.createCampaign('welcome');
  await subscribers.subscribe('first@example.com','test');
  await subscribers.subscribe('second@example.com','test');
  await subscribers.subscribe('optout@example.com','test');
  await repo.unsubscribe('optout@example.com');
  const id=await repo.createCampaign();
  await repo.saveCampaign(id,'DOTM test','<html><body><h1>Hello</h1></body></html>','Hello');
  await assert.rejects(()=>repo.startCampaign(id),/cannot be started/);
  await assert.rejects(()=>smtp.sendOne(id),/Start this campaign/);
  failRecipient=shared.TEST_EMAILS[1];
  await assert.rejects(()=>smtp.testCampaign(id),/Both test addresses/);
  assert.equal((await repo.getCampaign(id)).tested_at,'');
  await assert.rejects(()=>repo.startCampaign(id),/cannot be started/);
  failRecipient='';
  const before=emails.length;
  await smtp.testCampaign(id);
  assert.deepEqual(emails.slice(before).map(mail=>mail.to),shared.TEST_EMAILS);
  assert.equal((await repo.getCampaign(id)).state,'draft');
  assert.ok((await repo.getCampaign(id)).tested_at);
  // Content changes invalidate both test success and approval.
  await repo.saveCampaign(id,'DOTM updated','<h1>Updated</h1>','Updated');
  assert.equal((await repo.getCampaign(id)).tested_at,'');
  const bytes=Buffer.alloc(300000,7);
  const attachment=await repo.addAttachment(id,'photo.bin','application/octet-stream',bytes.length);
  await assert.rejects(()=>smtp.testCampaign(id),/Both test addresses/);
  await repo.putChunk(attachment,0,bytes.subarray(0,shared.CHUNK_BYTES).toString('base64'));
  await repo.putChunk(attachment,0,bytes.subarray(0,shared.CHUNK_BYTES).toString('base64'));
  await assert.rejects(()=>repo.putChunk(attachment,1,Buffer.alloc(10).toString('base64')),/Invalid attachment/);
  await repo.putChunk(attachment,1,bytes.subarray(shared.CHUNK_BYTES).toString('base64'));
  assert.deepEqual((await repo.attachmentBuffers(id))[0].content,bytes);
  await assert.rejects(()=>repo.addAttachment(id,'oversize.pdf','application/pdf',shared.MAX_ATTACHMENTS_BYTES),/under 10 MB/);
  await smtp.testCampaign(id);
  await repo.startCampaign(id); // This is the separate manual approval action.
  await repo.startCampaign(id); // Double-click/retry does not duplicate the snapshot.
  let rows=await db.all('SELECT * FROM newsletter_deliveries WHERE campaign_id=?',[id]);
  assert.equal(rows.length,2);
  assert.ok((await repo.getCampaign(id)).approved_at);
  await assert.rejects(()=>repo.saveCampaign(id,'changed','<p>changed</p>','changed'),/locked/);
  await assert.rejects(()=>repo.putChunk(attachment,0,bytes.subarray(0,shared.CHUNK_BYTES).toString('base64')),/not found/);
  const sentBefore=emails.length;
  await Promise.all([smtp.sendOne(id),smtp.sendOne(id),smtp.sendOne(id)]);
  assert.equal(emails.length-sentBefore,2);
  for(const mail of emails.slice(sentBefore)) {
    assert.equal(typeof mail.to,'string'); assert.equal(mail.bcc,undefined);
    assert.equal(mail.from.name,'DOTM');assert.equal(mail.replyTo,shared.SENDER_EMAIL);
    assert.deepEqual(mail.attachments[0].content,bytes);
    assert.ok(mail.html.includes('Unsubscribe'));assert.ok(mail.text.includes('Unsubscribe:'));
  }
  await repo.refreshDeliveryStates(); assert.equal((await repo.getCampaign(id)).state,'complete');
  // Welcome is inactive until both tests and explicit approval.
  await repo.queueWelcome('first@example.com');
  assert.equal((await db.all('SELECT * FROM newsletter_deliveries WHERE campaign_id=?',[repo.WELCOME_ID])).length,0);
  await repo.saveCampaign(repo.WELCOME_ID,'Welcome','<p>Welcome</p>','Welcome');
  await assert.rejects(()=>repo.approveWelcome(),/successful welcome test/);
  await smtp.testCampaign(repo.WELCOME_ID);await repo.approveWelcome();
  await repo.queueWelcome('first@example.com');await repo.queueWelcome('first@example.com');
  assert.equal((await db.all('SELECT * FROM newsletter_deliveries WHERE campaign_id=?',[repo.WELCOME_ID])).length,1);
  uncertainty=true;
  assert.equal((await smtp.sendOne(repo.WELCOME_ID)).status,'uncertain');
  uncertainty=false;
  assert.equal((await smtp.sendOne(repo.WELCOME_ID)).status,'done');
  const welcomeDelivery=(await db.all('SELECT * FROM newsletter_deliveries WHERE campaign_id=?',[repo.WELCOME_ID]))[0];
  await repo.resolveDelivery(welcomeDelivery.id,true);
  assert.equal((await smtp.sendOne(repo.WELCOME_ID)).status,'sent');
  // Opt-outs after approval are checked again at send time.
  await repo.queueWelcome('second@example.com');await repo.unsubscribe('second@example.com');
  assert.equal((await smtp.sendOne(repo.WELCOME_ID)).status,'done');
  const token=tokens.unsubscribeToken('first@example.com');
  assert.equal(tokens.tokenEmail(token),'first@example.com');assert.equal(tokens.tokenEmail(token+'x'),null);
  const rendered=shared.renderEmail('<html><body>Body</body></html>','Text','https://dotm.in/?a="');
  assert.ok(rendered.html.indexOf('Unsubscribe')<rendered.html.indexOf('</body>'));
  // Adding or removing an attachment requires a fresh two-inbox test.
  const fresh=await repo.createCampaign();
  await repo.saveCampaign(fresh,'Attachment gate','<p>Gate</p>','Gate');
  await smtp.testCampaign(fresh);
  const extra=await repo.addAttachment(fresh,'small.txt','text/plain',3);
  assert.equal((await repo.getCampaign(fresh)).tested_at,'');
  await repo.putChunk(extra,0,Buffer.from('abc').toString('base64'));
  await smtp.testCampaign(fresh);
  await repo.removeAttachment(extra);
  assert.equal((await repo.getCampaign(fresh)).tested_at,'');
  // Atomic quota reservation cannot exceed the cap under concurrent sends.
  await db.run('DELETE FROM newsletter_send_slots');process.env.NEWSLETTER_DAILY_LIMIT='2';
  const slots=await Promise.all(Array.from({length:5},()=>repo.reserveSlot()));
  assert.equal(slots.filter(Boolean).length,2);
  // API report time window and validation are tested without platform credentials.
  const analytics=await import('./lib/youtube-analytics.mjs');
  assert.deepEqual(analytics.analyticsWindow(new Date('2026-10-10T02:00:00Z')),{startDate:'2026-09-11',endDate:'2026-10-08'});
  const env={YOUTUBE_ANALYTICS_CLIENT_ID:'id',YOUTUBE_ANALYTICS_CLIENT_SECRET:'secret',YOUTUBE_ANALYTICS_REFRESH_TOKEN:'refresh',YOUTUBE_CHANNEL_ID:'UCtest'};
  const queries=[];
  const mock=async(url)=> {queries.push(url);return {ok:true,json:async()=>url.includes('oauth2')?{access_token:'access'}:{columnHeaders:[{name:'views'}],rows:[[4321]]}};};
  const result=await analytics.collectYouTubeAnalytics(mock,env,new Date('2026-10-10T12:00:00Z'));
  assert.equal(result.values[0].key,'youtube_views_28d');assert.equal(result.values[0].value,4321);
  assert.ok(queries[1].includes('metrics=views'));assert.ok(queries[1].includes('startDate=2026-09-12'));
  await assert.rejects(()=>analytics.collectYouTubeAnalytics(async(url)=>({ok:true,json:async()=>url.includes('oauth2')?{access_token:'access'}:{columnHeaders:[{name:'views'}],rows:[]}}),env),/no processed views/);
  assert.ok((await analytics.collectYouTubeAnalytics(mock,{})).skipped);
  console.log('Newsletter and YouTube analytics checks passed. SMTP was mocked; no real emails sent.');
})().catch(error=> {console.error(error);process.exitCode=1;});
