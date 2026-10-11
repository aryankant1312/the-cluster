// Channel analytics require owner OAuth; a public YouTube Data API key is insufficient.
export function analyticsWindow(now = new Date()) {
  // YouTube reports dates in Pacific time. Use the last 28 full calendar days.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(now);
  const read = type => parts.find(part=>part.type===type).value;
  const today = Date.UTC(Number(read('year')),Number(read('month'))-1,Number(read('day')));
  const day = 86400000;
  return { startDate:new Date(today-28*day).toISOString().slice(0,10),endDate:new Date(today-day).toISOString().slice(0,10) };
}
export async function collectYouTubeAnalytics(fetcher = fetch, env = process.env, now = new Date()) {
  const clientId = env.YOUTUBE_ANALYTICS_CLIENT_ID;
  const clientSecret = env.YOUTUBE_ANALYTICS_CLIENT_SECRET;
  const refreshToken = env.YOUTUBE_ANALYTICS_REFRESH_TOKEN;
  const channel = env.YOUTUBE_CHANNEL_ID;
  if (!clientId || !clientSecret || !refreshToken || !channel) return { skipped:'YouTube Analytics owner OAuth secrets/channel ID not configured' };
  const tokenResponse = await fetcher('https://oauth2.googleapis.com/token', {
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({ client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token' }),
  });
  if (!tokenResponse?.ok) throw new Error(`YouTube Analytics token refresh failed (${tokenResponse?.status ?? 'no response'})`);
  const token = (await tokenResponse.json()).access_token;
  if (!token) throw new Error('YouTube Analytics token response is missing an access token');
  const window = analyticsWindow(now);
  const params = new URLSearchParams({ ids:`channel==${channel}`,metrics:'views',...window });
  const response = await fetcher(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`,{ headers:{Authorization:`Bearer ${token}`} });
  if (!response?.ok) throw new Error(`YouTube Analytics report failed (${response?.status ?? 'no response'}). Verify the authorized account owns the configured channel.`);
  const report = await response.json();
  const column = report.columnHeaders?.findIndex(header=>header.name==='views');
  if (column === undefined || column<0 || !Array.isArray(report.rows) || !report.rows.length) throw new Error('YouTube Analytics returned no processed views; retaining the previous figure');
  const value = report.rows[0]?.[column];
  if (!Number.isSafeInteger(value) || value<0) throw new Error('YouTube Analytics returned an invalid views figure');
  return { values:[{ source:'youtube',metric:'views_28d',key:'youtube_views_28d',value }],window };
}
