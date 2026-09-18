# Brand campaign media

Drop campaign assets directly into the matching folder, then reload the site.
The Portfolio viewer discovers supported files automatically; no import or
manifest edit is needed.

| Brand | Folder | Current heading |
| --- | --- | --- |
| Nothing / CMF | `nothing-cmf/` | CMF 2 Pro |
| MTV | `mtv-hustle/` | Goli Baari |
| Saregama | `saregama/` | Heading |
| Hero | `hero-xtreme/` | Hero Xtreme |
| Spotify | `spotify/` | Flow Unchained |
| Roulette | `roulette/` | Heading |
| TuneCore | `tunecore/` | Tunecore Accelerator |

Supported images: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`.
Supported looping videos: `.mp4`, `.webm`.

File names determine display order, so numeric prefixes such as `01-hero.mp4`,
`02-detail.jpg`, and `03-comments.jpg` are recommended. Hidden files and all
unsupported extensions are ignored.

Campaign headings and social links live in
`src/content/brand-cases.ts`. Replace each `socialUrl: null` with the supplied
post URL to activate its **Check comments** button.
