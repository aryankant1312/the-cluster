import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { randomBytes,createHash,timingSafeEqual } from 'node:crypto';

const filename = process.argv[2] || '.data/youtube-oauth-client.json';
const config = JSON.parse(await fs.readFile(filename,'utf8')).installed;
if (!config?.client_id || !config.client_secret) throw new Error('Use the downloaded OAuth Desktop app client JSON; visitor sign-in credentials stay separate.');
const state = randomBytes(32).toString('base64url');
const verifier = randomBytes(48).toString('base64url');
const redirect = 'http://127.0.0.1:8765';
const scopes = ['https://www.googleapis.com/auth/youtube.readonly','https://www.googleapis.com/auth/yt-analytics.readonly'];
let finish;
const done = new Promise(resolve=> {finish=resolve;});
const server = http.createServer(async (request,response)=> {
  const url = new URL(request.url,redirect);
  if(url.pathname!=='/') {response.writeHead(404).end();return;}
  const received = Buffer.from(url.searchParams.get('state') || '');
  const expected = Buffer.from(state);
  if(received.length!==expected.length || !timingSafeEqual(received,expected)) {response.writeHead(400).end('Invalid OAuth state.');return;}
  if(!url.searchParams.get('code')) {response.writeHead(400).end('Authorization was not completed.');finish(false);return;}
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_id:config.client_id,client_secret:config.client_secret,redirect_uri:redirect,
        grant_type:'authorization_code',code:url.searchParams.get('code'),code_verifier:verifier}),
    });
    if(!tokenResponse.ok) throw new Error('OAuth token exchange failed.');
    const tokens = await tokenResponse.json();
    if(!tokens.refresh_token) throw new Error('No refresh token returned. Re-authorize with consent.');
    const granted = new Set((tokens.scope || '').split(' '));
    if(scopes.some(scope=>!granted.has(scope))) throw new Error('Both read-only permissions must be granted.');
    const output = path.resolve('.data/youtube-analytics-credentials.json');
    await fs.mkdir(path.dirname(output),{recursive:true});
    await fs.writeFile(output,JSON.stringify({
      YOUTUBE_ANALYTICS_CLIENT_ID:config.client_id,
      YOUTUBE_ANALYTICS_CLIENT_SECRET:config.client_secret,
      YOUTUBE_ANALYTICS_REFRESH_TOKEN:tokens.refresh_token,
    },null,2),{mode:0o600});
    response.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'}).end('Read-only YouTube Analytics authorized. You can close this tab.');
    console.log(`Credentials saved locally to ${output}. Copy the three values into GitHub Actions secrets; never commit this file.`);
    finish(true);
  } catch(error) {response.writeHead(500).end('Authorization failed. See the terminal.');console.error(error.message);finish(false);}
});
await new Promise((resolve,reject)=> {server.once('error',reject);server.listen(8765,'127.0.0.1',resolve);});
const params = new URLSearchParams({ client_id:config.client_id,redirect_uri:redirect,response_type:'code',
  access_type:'offline',prompt:'consent',scope:scopes.join(' '),state,
  code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256' });
console.log('Open this URL and sign in as the owner of the DOTM YouTube channel:');
console.log(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
const timer = setTimeout(()=>finish(false),10*60*1000);
const success = await done;
clearTimeout(timer); server.close();
if(!success) process.exitCode=1;
