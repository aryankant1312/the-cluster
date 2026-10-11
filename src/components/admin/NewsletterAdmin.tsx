"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHUNK_BYTES, MAX_ATTACHMENTS_BYTES, MAX_CONTENT_BYTES, SENDER_EMAIL, TEST_EMAILS, renderEmail, type NewsletterPayload } from "@/lib/newsletter/shared";

const field = "w-full rounded border border-gray-300 px-3 py-2 text-sm";
const button = "rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40";

export function NewsletterAdmin() {
  const [data,setData] = useState<NewsletterPayload | null>(null);
  const [selected,setSelected] = useState("welcome-template");
  const [subject,setSubject] = useState("");
  const [html,setHtml] = useState("");
  const [text,setText] = useState("");
  const [busy,setBusy] = useState(false);
  const [running,setRunning] = useState(false);
  const [notice,setNotice] = useState("");
  const [error,setError] = useState("");
  const stop = useRef(false);
  const mounted = useRef(true);
  const campaign = data?.campaigns.find(item=>item.id===selected);
  const welcome = campaign?.kind === "welcome";
  const editable = campaign?.state === "draft";
  const dirty = Boolean(campaign && (subject !== campaign.subject || html !== campaign.html || text !== campaign.text));
  const files = data?.attachments.filter(file=>file.campaign_id===selected) || [];
  const fileBytes = files.reduce((sum,file)=>sum+Number(file.size),0);

  const load = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/newsletter?id=${encodeURIComponent(id)}`,{ cache:"no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load newsletters.");
    if (!mounted.current) return;
    setData(payload);
    const item = payload.campaigns.find((entry: {id:string})=>entry.id===id);
    setSubject(item?.subject || ""); setHtml(item?.html || ""); setText(item?.text || "");
  },[]);

  useEffect(()=> {
    mounted.current=true;
    void load(selected).catch(error=> { if(mounted.current) setError(error.message); });
    return ()=> { mounted.current=false; stop.current=true; };
  },[load,selected]);

  async function post(action: string, extra: Record<string,unknown> = {}) {
    const response = await fetch("/api/admin/newsletter",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action,id:selected,...extra}),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Newsletter action failed.");
    return payload;
  }
  async function perform(work:()=>Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); } catch(error) { setError(error instanceof Error ? error.message : "Newsletter action failed."); }
    finally { if(mounted.current) setBusy(false); }
  }
  async function upload(file: File) {
    if (file.size+fileBytes >= MAX_ATTACHMENTS_BYTES) throw new Error("Attachments must total under 10 MB.");
    const result = await post("attachment",{ filename:file.name,contentType:file.type,size:file.size });
    for(let offset=0,part=0;offset<file.size;offset+=CHUNK_BYTES,part++) {
      const bytes = new Uint8Array(await file.slice(offset,offset+CHUNK_BYTES).arrayBuffer());
      let binary="";
      for(const byte of bytes) binary+=String.fromCharCode(byte);
      await post("chunk",{ id:result.id,part,data:btoa(binary) });
      setNotice(`Uploading ${file.name}: ${Math.round(Math.min(offset+CHUNK_BYTES,file.size)/file.size*100)}%`);
    }
    await load(selected); setNotice(`${file.name} uploaded. Send a new test before approval.`);
  }
  async function processQueue(start: boolean) {
    stop.current=false; setRunning(true); setError(""); setNotice("");
    try {
      if(start) await post("start");
      while(!stop.current && mounted.current) {
        const result = await post("process");
        await load(selected);
        if(["done","limit","failed","uncertain","paused"].includes(result.status)) {
          setNotice(result.status==="done" ? "All pending recipients have been processed."
            : result.status==="limit" ? "Sending paused at the application cap. Resume after slots become available."
            : "Sending paused. Review the delivery status before continuing.");
          break;
        }
      }
      if(stop.current && mounted.current) setNotice("Sending paused after the current email. Resume when ready.");
    } catch(error) { if(mounted.current) setError(error instanceof Error ? error.message : "Sending interrupted. Refresh and review delivery status before resuming."); }
    finally { if(mounted.current) {setRunning(false); await load(selected).catch(()=>{});} }
  }
  const locked = busy || running;
  const preview = renderEmail(html,text,"https://dotm.in/api/newsletter/unsubscribe?preview=1").html;
  const summary = data?.summary || {};

  return <section className="mt-8 rounded-lg border border-gray-300 p-5" aria-labelledby="newsletter-title">
    <h2 id="newsletter-title" className="text-lg font-semibold">Newsletter studio</h2>
    <p className="mt-2 text-sm text-gray-600">DOTM · {SENDER_EMAIL} · Reply-to uses the same address.</p>
    <p className="mt-2 text-sm">{data?.subscribers ?? "—"} active subscribers. {data?.used ?? 0}/{data?.dailyLimit ?? "—"} application sending slots used in the last 24 hours, including tests and welcome emails.</p>
    {data && !data.smtpConfigured && <p className="mt-3 rounded bg-amber-50 p-3 text-sm">SMTP is not configured. Add GMAIL_APP_PASSWORD and NEWSLETTER_TOKEN_SECRET in Vercel. You can prepare drafts now.</p>}
    <p className="mt-2 text-sm text-gray-600">No recurring schedule is set. Keep this page open during a broadcast; you can pause and resume saved progress.</p>
    {error && <p role="alert" className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded bg-green-50 p-3 text-sm">{notice}</p>}
    <div className="mt-4 flex flex-wrap gap-3">
      <label className="flex-1 text-sm">Campaign<select className={field} value={selected} disabled={locked || dirty} onChange={e=>{setSelected(e.target.value);setNotice("");setError("");}}>
        {(data?.campaigns || []).map(item=><option key={item.id} value={item.id}>{item.kind==="welcome" ? "Welcome template" : item.subject || "Untitled newsletter"} · {item.state}</option>)}
      </select></label>
      <button className={button} disabled={locked || dirty} onClick={()=>void perform(async()=> {const result=await post("create");setSelected(result.id);})}>New newsletter</button>
      <button className={button} disabled={locked || dirty} onClick={()=>void perform(()=>load(selected))}>Refresh</button>
    </div>
    {campaign && <>
      <p className="mt-3 text-sm">{welcome ? campaign.enabled ? "Welcome email approved and active for new signups." : "Welcome email is inactive. Upload your HTML, save, test, then approve it." : campaign.state==="draft" ? "Save → test both inboxes → check the received emails → approve and send." : "This newsletter is locked. New signups will be included in your next campaign."}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm">Subject<input className={field} maxLength={200} value={subject} disabled={!editable || locked} onChange={e=>setSubject(e.target.value)} /></label>
          <label className="block text-sm">Upload HTML<input className="mt-1 block text-sm" type="file" accept=".html,.htm,text/html" disabled={!editable || locked} onChange={e=>{
            const file=e.target.files?.[0];e.target.value="";
            if(file) void perform(async()=> {if(file.size>MAX_CONTENT_BYTES) throw new Error("HTML must be under 500 KB.");setHtml(await file.text());setNotice("HTML loaded. Save this draft before testing.");});
          }}/></label>
          <label className="block text-sm">HTML<textarea className={`${field} min-h-36 font-mono`} value={html} disabled={!editable || locked} onChange={e=>setHtml(e.target.value)} /></label>
          <label className="block text-sm">Plain text / email fallback<textarea className={`${field} min-h-28`} value={text} disabled={!editable || locked} onChange={e=>setText(e.target.value)} /></label>
          <p className="text-xs text-gray-600">Leave HTML empty to send a simple text newsletter. Use absolute HTTPS image URLs in HTML. An unsubscribe link is added automatically.</p>
          <button className={button} disabled={!editable || locked} onClick={()=>void perform(async()=> {await post("save",{subject,html,text});await load(selected);setNotice("Draft saved. A new test is required before approval.");})}>Save draft{dirty ? " · unsaved changes" : ""}</button>
          {!welcome && <div>
            <label className="block text-sm">Attachment · total under 10 MB<input type="file" className="mt-1 block" disabled={!editable || locked || dirty} onChange={e=> {
              const file=e.target.files?.[0];e.target.value="";
              if(file) void perform(()=>upload(file));
            }}/></label>
            <ul className="mt-2 space-y-2 text-sm">{files.map(file=><li key={file.id} className="flex items-center justify-between gap-2"><span>{file.filename} · {(Number(file.size)/1e6).toFixed(2)} MB {Number(file.uploaded)!==Number(file.size) ? "· incomplete" : ""}</span><button className={button} disabled={!editable || locked || dirty} onClick={()=>void perform(async()=> {await post("remove_attachment",{id:file.id});await load(selected);})}>Remove</button></li>)}</ul>
          </div>}
        </div>
        <div>
          <h3 className="text-sm font-medium">Browser preview</h3>
          <p className="mt-1 text-xs text-gray-600">Gmail rendering can differ. Inspect both test emails before approving.</p>
          <iframe title="Newsletter HTML preview" sandbox="" referrerPolicy="no-referrer" className="mt-2 h-[540px] w-full rounded border border-gray-300 bg-white" srcDoc={preview}/>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className={button} disabled={!editable || locked || dirty || !data?.smtpConfigured} onClick={()=>void perform(async()=> {await post("test");await load(selected);setNotice(`Tests accepted for ${TEST_EMAILS.join(" and ")}. Inspect both inboxes before approval.`);})}>Send test to both inboxes</button>
        {welcome ? <>
          <button className={`${button} bg-gray-900 text-white`} disabled={locked || dirty || !campaign.tested_at || !editable || !data?.smtpConfigured || Boolean(campaign.enabled)} onClick={()=>void perform(async()=> {await post("approve_welcome");await load(selected);setNotice("Welcome email approved. New signups will receive this template.");})}>Approve welcome & enable</button>
          <button className={button} disabled={locked || !campaign.enabled} onClick={()=>void perform(async()=> {await post("disable_welcome");await load(selected);})}>Disable welcome</button>
          <button className={button} disabled={locked || dirty || !campaign.enabled || !summary.pending} onClick={()=>void processQueue(false)}>Send pending welcome emails</button>
        </> : <>
          {campaign.state==="draft" && <button className={`${button} bg-gray-900 text-white`} disabled={locked || dirty || !campaign.tested_at || !data?.smtpConfigured || !data.subscribers} onClick={()=>void processQueue(true)}>Approve & send to {data?.subscribers ?? 0} subscribers</button>}
          {campaign.state==="sending" && <button className={button} disabled={locked || !data?.smtpConfigured} onClick={()=>void processQueue(false)}>Resume sending</button>}
        </>}
        {running && <button className={button} onClick={()=> {stop.current=true;}}>Pause after current email</button>}
      </div>
      <p className="mt-2 text-xs text-gray-600">{campaign.tested_at ? `Both tests accepted at ${new Date(campaign.tested_at).toLocaleString()}. Approval is still your decision.` : "Successful tests to both inboxes are required. Editing the content or attachments clears test approval."}</p>
      {campaign.approved_at && <p className="mt-1 text-xs text-gray-600">Manually approved at {new Date(campaign.approved_at).toLocaleString()}.</p>}
      <div className="mt-5 text-sm"><strong>Delivery status:</strong> {Object.entries(summary).map(([status,count])=>`${count} ${status}`).join(" · ") || "No recipient sends yet."}</div>
      <div className="mt-3 max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Recipient</th><th>Status</th><th>Action / note</th></tr></thead><tbody>{data?.deliveries.map(delivery=><tr key={delivery.id} className="border-t border-gray-200"><td className="p-2">{delivery.email}</td><td>{delivery.status}</td><td className="p-2">{delivery.error}{["failed","uncertain"].includes(delivery.status) && <div className="mt-2 flex gap-2"><button className={button} disabled={locked || dirty} onClick={()=>void perform(async()=> {await post("resolve",{id:delivery.id,retry:true});await load(selected);})}>Retry · may duplicate if already sent</button><button className={button} disabled={locked || dirty} onClick={()=>void perform(async()=> {await post("resolve",{id:delivery.id,retry:false});await load(selected);})}>I verified it in Gmail Sent</button></div>}</td></tr>)}</tbody></table></div>
      <p className="mt-2 text-xs text-gray-600">Showing up to 200 deliveries, prioritizing failures. Totals include all recipients.</p>
    </>}
  </section>;
}
