# Google Search Console setup for dotm.in

Revised 29 October 2026. Hosting: Vercel. Authoritative DNS: GoDaddy
(ns07.domaincontrol.com and ns08.domaincontrol.com).

## Current status

- Live /enter returned HTTP 200; no Google verification meta tag was present.
- Live /robots.txt returned HTTP 404 before these changes. The sitemap request timed out.
- No local GOOGLE_SITE_VERIFICATION value is configured. Public TXT queries returned only an SOA response (no TXT records), including via Google DNS; no Google DNS verification record was visible.
- The owner confirmed that the new dotm.in Domain property is verified in Search Console. Browser inspection of the account was unavailable.
- Source includes robots.txt and sitemap.xml metadata routes, plus an /enter canonical URL. All three passed local HTTP checks on port 3100, including browser navigation headers. TypeScript passed after regenerating malformed Next.js dev cache types. Deployment and live checks are pending.

## 1. Verify ownership in the intended Google account

Open https://search.google.com/search-console and first check for an existing
dotm.in property. Reuse it if already verified.

Otherwise add a Domain property for dotm.in. Copy the exact Google TXT value
beginning google-site-verification=. In GoDaddy's dotm.in DNS records, add a
TXT record with host @ and Google's complete value, using the default TTL.
Keep all existing records. Return to Google and select Verify after DNS
propagation. Retain the record for ongoing verification.

A Domain property covers protocols and subdomains and requires DNS verification.
If DNS access is unavailable, a URL-prefix property for https://dotm.in/ can
instead use HTML-tag verification. Set GOOGLE_SITE_VERIFICATION in Vercel
production to only the tag's content token, redeploy, and confirm the meta tag
is served at /enter before clicking Verify. Do not invent a token or overwrite
another owner's verification record.

## 2. Deploy and check the website changes

Deploy the reviewed source to the existing Vercel project for dotm.in.
Confirm all of the following on the live domain:

- https://dotm.in/robots.txt returns HTTP 200 as plain text and advertises https://dotm.in/sitemap.xml.
- https://dotm.in/sitemap.xml returns HTTP 200 as XML and lists only https://dotm.in/enter.
- /enter returns HTTP 200 and has canonical https://dotm.in/enter.
- The root continues to redirect to /enter and desktop sign-in requirements remain intact.

The sitemap omits the root redirect, login flow, admin, API, countdown, and
persona routes. robots.txt discourages crawling those internal routes; it is
not access control. Existing authentication continues to protect desktop data.
No new public content or changes to the site's visual experience are included.

## 3. Submit and inspect

In the verified property's Sitemaps report, submit:
https://dotm.in/sitemap.xml

Use URL Inspection on https://dotm.in/enter, run Test live URL, review Google's
rendered page, and request indexing if eligible. Record the submission status
and indexing response rather than treating a submitted request as indexed.

The entrance currently presents an intro video and a play button. Most artist,
music, portfolio and stats content remains inside authenticated desktops. A
sitemap and ownership verification cannot make that content searchable. If
broader search visibility is wanted, plan public artist/music pages separately.

## Completion checklist

- [x] New dotm.in property created by the owner.
- [x] Domain ownership verified in Search Console (owner confirmed).
- [ ] Website changes deployed and live crawler endpoints verified.
- [ ] Sitemap submitted successfully in Search Console.
- [ ] Live URL Inspection completed; indexing result recorded.

## Official references

- Verification: https://support.google.com/webmasters/answer/9008080
- Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- DNS TXT records: https://www.godaddy.com/help/add-a-txt-record-19232


