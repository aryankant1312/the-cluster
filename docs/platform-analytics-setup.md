# YouTube Views and Spotify Streams: last 28 days

## YouTube

The Views tile reads **youtube_views_28d** from the existing cached stats pipeline. Subscribers remain the current total. The panel carries a **Last 28 days** banner.

Rolling views come from the **YouTube Analytics API**, using the channel owner's OAuth permission. The public YouTube Data API channel viewCount is a lifetime total and is never substituted here.

1. In Google Cloud Console, enable **YouTube Analytics API** and **YouTube Data API v3**.
2. Configure the OAuth consent screen with the channel owner's account as a test user while testing. For continuing scheduled access, complete the appropriate production consent setup; external OAuth apps in Testing can have refresh tokens that expire after seven days for these scopes.
3. Create a separate OAuth client of type **Desktop app**. Download its JSON to the ignored `.data/youtube-oauth-client.json`. Visitor sign-in credentials and scopes remain separate.
4. From the project folder run `npm run authorize:youtube`. Open the printed URL, sign in as the owner of the channel configured in YOUTUBE_CHANNEL_ID, and grant only the two requested read-only scopes: youtube.readonly and yt-analytics.readonly.
5. The helper saves `.data/youtube-analytics-credentials.json` locally without printing its tokens. Copy its values into the repository's GitHub Actions secrets:

   - YOUTUBE_ANALYTICS_CLIENT_ID
   - YOUTUBE_ANALYTICS_CLIENT_SECRET
   - YOUTUBE_ANALYTICS_REFRESH_TOKEN

6. Keep YOUTUBE_CHANNEL_ID set to the correct UC... channel ID. Run **Sync platform stats** manually in GitHub Actions. The existing schedule then refreshes the figure every two days.

The query requests `metrics=views` for the last 28 full Pacific calendar days, ending yesterday. YouTube processing can lag, so the most recent days may be incomplete. Failed requests or empty/malformed reports retain the last valid figure; they do not become a fabricated zero. Until the first valid report or a real admin override, the tile displays a dash. Clear any admin override to use the synced number.

API and freshness documentation: https://developers.google.com/youtube/analytics/reference/reports/query and https://developers.google.com/youtube/analytics/data_model.
OAuth setup and token expiration: https://developers.google.com/identity/protocols/oauth2/native-app and https://developers.google.com/identity/protocols/oauth2#expiration.

## Spotify

The Streams tile reads **spotify_streams_28d**, distinct from playlist adds and monthly listeners. It has no automatic Web API feed: Spotify's public artist/track endpoints do not expose an artist's streams over a selected time range.

Sign in to Spotify for Artists, select the artist, open its stream statistics and choose **Last 28 days**. Enter the real stream total into **admin → Live Stats → Spotify → Streams**, then save. Repeat whenever you want the website's figure updated. Leave it empty until you have the real number. The old playlist-adds value is never reused as a stream count.

Official public API reference: https://developer.spotify.com/documentation/web-api/reference/get-an-artist and https://developer.spotify.com/documentation/web-api/reference/get-track.
