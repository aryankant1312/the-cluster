# DOTM newsletter setup

Sender: **DOTM <dotmoriginal@gmail.com>**. Reply-to: **dotmoriginal@gmail.com**.
Test recipients: **dotmoriginal@gmail.com** and **aryankant1312@gmail.com**.

## Free Gmail SMTP setup

Gmail's authenticated SMTP server is smtp.gmail.com. This implementation uses port 465 with TLS. No paid email provider subscription is needed to start with the existing Gmail account. Gmail is quota-limited; do not treat it as an unlimited newsletter service.

1. Turn on 2-Step Verification for dotmoriginal@gmail.com.
2. Open https://myaccount.google.com/apppasswords and create an App Password for the DOTM website. App Passwords may be unavailable with Advanced Protection or certain account configurations; if unavailable, use OAuth rather than the normal account password.
3. In Vercel → project → Settings → Environment Variables, add these to Production. Use a separate setup for Preview if you want previews to send real emails.

| Variable | Value |
| --- | --- |
| GMAIL_APP_PASSWORD | The generated App Password, never your normal Gmail password |
| NEWSLETTER_TOKEN_SECRET | A separate random secret of at least 32 characters |
| NEWSLETTER_SITE_URL | https://dotm.in |
| NEWSLETTER_DAILY_LIMIT | 100 initially: the app's conservative cap, not a promise of Google's allowance |
| DATABASE_DRIVER | postgres |
| DATABASE_URL | Your existing production Postgres connection string |
| ADMIN_PASSWORD_HASH | Your existing admin authentication hash |

Generate the token secret locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep it stable: changing it invalidates existing unsubscribe links. Set real secrets in Vercel or the ignored .env.local, never .env.example or chat.

4. Redeploy the project after setting its environment variables.
5. Visit https://dotm.in/admin and sign in. The Newsletter studio reports whether the SMTP variables are configured. That indicator does not prove Gmail credentials work; send the two tests to validate delivery.

Google documents consumer Gmail account limits of more than 500 emails/day or more than 500 recipients in one message. Actual sending can be restricted earlier. The website reserves a slot for each recipient attempt in a rolling 24-hour ledger, including tests, welcome emails and failed attempts. Mail sent from Gmail outside this website is not counted by that ledger. If Gmail rejects a send, review the error and account limits before resuming.

Sources: https://support.google.com/a/answer/176600, https://support.google.com/accounts/answer/185833, https://support.google.com/mail/answer/22839.

## Send a newsletter

1. Create a newsletter in admin.
2. Enter your subject and paste/upload HTML. For a simpler process, leave HTML empty and write a plain-text message; the website formats it as a basic email. For uploaded HTML, supply a plain-text fallback when possible and use absolute HTTPS image URLs.
3. Save the draft. Upload attachments one at a time. Their combined size must be strictly under 10 MB. Gmail may reject certain attachment types; review Gmail's file restrictions before attaching executables or archives.
4. Check the sandboxed browser preview, then choose **Send test to both inboxes**. Each test recipient gets a separate message with the saved subject, content and attachments.
5. Inspect the actual Gmail rendering in both inboxes. Successful SMTP acceptance is required, but only your team can approve the visual result.
6. Choose **Approve & send** to give manual approval and start the broadcast. No broadcast can start before both tests succeed. Editing the content or changing attachments clears the test status.
7. Keep admin open while sending. Each server request processes one recipient and persists its status. Pause finishes the current email before stopping; resume continues pending recipients. Closing the tab pauses further requests. An already-running request may still finish.

The recipient snapshot contains all active subscribers captured when the campaign starts, without the old 500-row admin list limit. Later signups join the next newsletter. Each receives an individual email with an unsubscribe link; no address list is exposed to subscribers.

If a function or network connection drops during an SMTP attempt, its outcome can be uncertain. Review Gmail Sent before marking it as sent or retrying. Automatic retries never resend uncertain deliveries. SMTP acceptance does not guarantee inbox placement. Failed deliveries pause a run for review.

There is no recurring campaign schedule. Biweekly/monthly timing can be added after dates, times and unattended sending requirements are decided.

## Welcome email

The welcome template starts empty and inactive, awaiting your HTML. Upload it, set the subject and optional plain text, save, send the tests to both inboxes, inspect both, then choose **Approve welcome & enable**. No email confirmation is required for signup.

An approved welcome email is queued once per subscriber and attempted during signup. If SMTP is unavailable or the app quota is exhausted, saved pending welcomes can be processed from admin. Editing the template disables it and clears its tests; it must be tested and approved again. Existing subscribers are not retroactively queued just by enabling the welcome template.

Unsubscribes are saved separately from subscriber records and prevent future broadcasts. Re-entering an unsubscribed address in the public signup form does not silently remove that opt-out. Ask for an explicit re-subscription flow if you want this behavior later.

## Attachment storage and hosting

Uploads are sent in 256 KB binary chunks (base64 in requests), below Vercel's 4.5 MB request limit. Chunks are stored in the existing database, then assembled server-side for SMTP. This adds no object-storage provider, but database storage quotas still apply; base64 adds roughly one-third overhead. Do not keep unlimited attachment-heavy campaigns on a small free database. Production must use persistent Postgres, not local SQLite or Vercel's temporary disk.

Newsletter API functions request 60 seconds to allow TLS and attachment sends. Confirm the effective duration in your Vercel project. No long-running process is assumed to continue after a request ends.

Vercel limits: https://vercel.com/docs/functions/limitations.
