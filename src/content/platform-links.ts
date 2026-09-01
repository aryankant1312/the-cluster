/**
 * Where each song lives on the platforms that are not Spotify.
 *
 * SPOTIFY IS NOT HERE. Its ids already live on the `Track` records in
 * `tracks.ts`, because artwork and durations resolve from them too. Duplicating
 * them into a second table would be one more thing to keep in step.
 *
 * ANYTHING MISSING RENDERS AS A DISABLED MARK. There is no search fallback:
 * see the note on `platformLinksFor` at the bottom for why one was removed.
 * Filling an entry in here is the whole of turning that mark live.
 *
 * FIVE FIELDS PER TRACK, of which `spotify` is deliberately almost always
 * empty. Twenty of the twenty-two songs carry a `spotifyId` on their `Track`
 * record in `tracks.ts`, and `PlatformLinkRow` builds the canonical URL from
 * that — writing the same link a second time here would be one more thing to
 * keep in step, which is exactly what the note at the top of this file warns
 * against.
 *
 * ONLY TWO ENTRIES CARRY A `spotify` PLACEHOLDER, and only because those two
 * songs have no Spotify pressing at all: "Goli Baari" and "Let Them Say" are
 * absent from the artist's own catalogue in `spotify-catalogue.json`, so their
 * Spotify mark renders disabled until a URL is pasted in.
 *
 * HOW THESE WERE GATHERED, so the next person can repeat it:
 *   Apple Music  — the public iTunes lookup API, artist id 1690016247:
 *                  https://itunes.apple.com/lookup?id=1690016247&entity=song&limit=200
 *                  `trackViewUrl` is the per-song link, already region-scoped.
 *   JioSaavn     — https://www.jiosaavn.com/api.php?__call=search.getResults
 *                  &q=<title>+DOTM, keeping results whose primary artist
 *                  contains DOTM. Most releases are credited "DOTM, <producer>"
 *                  rather than "DOTM" alone, which an exact match misses.
 *   YouTube Music— the channel's uploads (UCgHraXrcKIpHLCXBytWb1vQ) via the
 *                  YouTube Data API, keeping only titles marked Official Music
 *                  Video / Lyric Video / Audio. A thirty-second clip is not the
 *                  song, and eight tracks have no official upload on the main
 *                  channel — those are the gaps below.
 *
 * TO FILL A GAP: uncomment the line and paste the URL. Keys are the permanent
 * `Track.id` values from `tracks.ts`; renaming one there silently unlinks it
 * here, exactly as it would the lyrics.
 */

export interface PlatformLinks {
  /**
   * Only for a song whose Spotify page is known but whose `Track` record in
   * `tracks.ts` carries no `spotifyId`. Where the id exists, the row builds
   * the URL from it and this stays empty — see `platformLinksFor`.
   */
  spotify?: string;
  appleMusic?: string;
  jioSaavn?: string;
  youtubeMusic?: string;
  /**
   * Amazon Music. Every entry below is currently blank, so every Amazon mark
   * renders in its disabled form until one is pasted in. Filling it in is the
   * whole of turning that mark live; no other file has to change.
   */
  amazonMusic?: string;
}

/** Keyed by `Track.id`. Every field optional; missing ones become searches. */
export const platformLinks: Record<string, PlatformLinks> = {
  // Paranoid
  "paranoid": {
    appleMusic: "https://music.apple.com/in/album/paranoid/1895996161?i=6765567178",
    // jioSaavn: not found — falls back to search.
    youtubeMusic: "https://music.youtube.com/watch?v=Sli6FAsKy6U",
    amazonMusic: "https://music.amazon.in/albums/B0GZ6XT92H?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_G3nN51kuCZoEI44881K9MVDQI&trackAsin=B0GZ6Z33S2"
  },
  // Roll No. 666
  "roll-no-666": {
    appleMusic: "https://music.apple.com/in/album/roll-no-666/1836011794?i=1836011800",
    jioSaavn: "https://www.jiosaavn.com/song/roll-no.-666/KQ0xdQF6UXU",
    youtubeMusic: "https://music.youtube.com/watch?v=nlnTJSRlQ2g",
    amazonMusic: "https://music.amazon.in/albums/B0FNYPT3Q7?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_906w0an1URiL08auvAwxRhlJl&trackAsin=B0FNZ2Q76H"
  },
  // DND Trip
  "dnd-trip-mp3": {
    appleMusic: "https://music.apple.com/in/album/dnd-trip/1831059202?i=1831059203",
    jioSaavn: "https://www.jiosaavn.com/song/dnd-trip/ElgYCAFDAnA",
    youtubeMusic: "https://music.youtube.com/watch?v=jpoql8XYkbg",
    amazonMusic: "https://music.amazon.in/albums/B0FL2DJJYL?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_5OErogHT3qPtFFyxnkG9svUS7&trackAsin=B0FL2F95H1"
  },
  // Bhala Kyun
  "bhala-kyun-mp3": {
    appleMusic: "https://music.apple.com/in/album/bhala-kyun/1804498290?i=1804498296",
    jioSaavn: "https://www.jiosaavn.com/song/bhala-kyun/Q11fdhtldHY",
    youtubeMusic: "https://music.youtube.com/watch?v=ObJQEEjVjkA",
    amazonMusic: "https://music.amazon.in/albums/B0F2GYQ8TL?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_SUc7OgVEqr87L4CYPpDX9ax0Q&trackAsin=B0F2GXSTHW"
  },
  // Touch Down
  "touch-down-mp3": {
    appleMusic: "https://music.apple.com/in/album/touch-down/1800274225?i=1800274236",
    jioSaavn: "https://www.jiosaavn.com/song/touch-down/OBhZXjlSBWM",
    youtubeMusic: "https://music.youtube.com/watch?v=rvmkc0ytsho",
    amazonMusic: "https://music.amazon.in/albums/B0DZF2G5Q4?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_bMy9UN8OG26UZkuGL5wi5YWAk&trackAsin=B0DZDZKFQ7"
  },
  // Gaddi Rok
  "gaddi-rok-mp3": {
    appleMusic: "https://music.apple.com/in/album/gaddi-rok/1824372374?i=1824372377",
    jioSaavn: "https://www.jiosaavn.com/song/gaddi-rok/MwE6YxwEBn8",
    youtubeMusic: "https://music.youtube.com/watch?v=enGjRcCtIiA",
    amazonMusic: "https://music.amazon.in/albums/B0FGJ2XG89?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_JVwNQDYqWM7cKqgoGTSLVMh2p&trackAsin=B0FGHZ45JD"
  },
  // Goli Baari
  "goli-baari-mp3": {
    // ONE OF THE TWO SONGS WITH NO SPOTIFY PRESSING. Checked against the
    // artist's own catalogue in `spotify-catalogue.json`, which holds 25
    // entries and contains neither this nor "Let Them Say" — so `tracks.ts`
    // carries no `spotifyId` for it and the Spotify mark renders disabled.
    // Paste a track URL here if one ever appears and the mark goes live.
    spotify: "https://open.spotify.com/track/20VdL96jICeS0ZcR64kN24?si=3c8556a3e54c44a0",
    appleMusic: "https://music.apple.com/us/album/goli-baari/1776596230?i=1776596595",
    jioSaavn: "https://www.jiosaavn.com/song/goli-baari/Qx4iYU0DVFs",
    youtubeMusic: "https://music.youtube.com/watch?v=bOQzY7TxK_I&si=BzB-12B7bHGP-4WD",
    amazonMusic: "https://music.amazon.in/albums/B0DL49B1GJ?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_kvuees6NAE8uFL4fHzjeH8hvB&trackAsin=B0DL48T1WC"
  },
  // Let Them Say
  "let-them-say-mp3": {
    // The other song with no Spotify pressing — see the note on "Goli Baari".
    spotify: "https://open.spotify.com/track/54I8k6qQZ91Xw3mKZxZiDD?si=da1c0f8c5832401b",
    appleMusic: "https://music.apple.com/us/album/let-them-say/1777772141?i=1777772483",
    jioSaavn: "https://www.jiosaavn.com/song/let-them-say/NCAMQj9AdnI",
    youtubeMusic: "https://music.youtube.com/watch?v=x9dyacMRZkY&si=9N4a0bEKxf_iVUxV",
    amazonMusic: "https://music.amazon.in/albums/B0DLGLMQP1?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_LReQEWMRy1Sr3yDq9cn9S33JG&trackAsin=B0DLGQ41V5"

  },
  // KHUD DUKHI
  "khud-dukhi-mp3": {
    appleMusic: "https://music.apple.com/in/album/khud-dukhi/1869372327?i=1869372696",
    jioSaavn: "https://www.jiosaavn.com/song/khud-dukhi/QisYXDJnDwI",
    youtubeMusic: "https://music.youtube.com/watch?v=kQpPl0IDYDs",
    amazonMusic: "https://music.amazon.in/albums/B0GH29Y6CG?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_L5vjwlJT796q9OK9Ehog8lmdv&trackAsin=B0GH2KSMJY"
  },
  // 25TH BDAY (confession)
  "25th-birthday-confession": {
    appleMusic: "https://music.apple.com/in/album/25th-bday-confession/1869372327?i=1869372698",
    jioSaavn: "https://www.jiosaavn.com/song/25th-bday-confession/JxI7VBFffUo",
    youtubeMusic: "https://music.youtube.com/watch?v=hb0dXDRadKU&si=6kQJqDsvUOh7G_WV",
    amazonMusic: "https://music.amazon.in/albums/B0GH29Y6CG?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_C4a81Kbai7VteyiANqLRLFUuG&trackAsin=B0GH2M7DZ6"
  },
  // WINNIE POOH
  "winnie-pooh": {
    appleMusic: "https://music.apple.com/in/album/winnie-pooh/1869372327?i=1869372701",
    jioSaavn: "https://www.jiosaavn.com/song/winnie-pooh/QA8tYQJnZ3o",
    youtubeMusic: "https://music.youtube.com/watch?v=kQpPl0IDYDs",
    amazonMusic: "https://music.amazon.in/albums/B0GH29Y6CG?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_mKwuTx929dhYRvhwn2hEfdGwF&trackAsin=B0GH2B3YV4"
  },
  // D.O.T.M
  "dotm-mp3": {
    appleMusic: "https://music.apple.com/in/album/d-o-t-m/1721673608?i=1721673609",
    jioSaavn: "https://www.jiosaavn.com/song/d.o.t.m/BzA0CD17dkI",
    youtubeMusic: "https://music.youtube.com/watch?v=h557m6sGVZI",
    // amazonMusic: "https://music.amazon.in/albums/B0DL49B1GJ?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_kvuees6NAE8uFL4fHzjeH8hvB&trackAsin=B0DL48T1WC"
  },
  // Thak Thak
  "thak-thak-mp3": {
    appleMusic: "https://music.apple.com/in/album/thak-thak/1721673608?i=1721673612",
    jioSaavn: "https://www.jiosaavn.com/song/thak-thak/BBEDSw4BR0I",
    youtubeMusic: "https://music.youtube.com/watch?v=DFySWI3kQzw",
    amazonMusic: "https://music.amazon.in/albums/B0DL49B1GJ?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_kvuees6NAE8uFL4fHzjeH8hvB&trackAsin=B0DL48T1WC"
  },
  // Lmnopqr
  "lmnopqr-mp3": {
    appleMusic: "https://music.apple.com/in/album/lmnopqr/1721673608?i=1721673613",
    jioSaavn: "https://www.jiosaavn.com/song/lmnopqr/JV4dU0IBZkc",
    youtubeMusic: "https://music.youtube.com/watch?v=6GqN9By_orc",
    amazonMusic: "https://music.amazon.in/albums/B0CPPFNYX7?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_yeqYz3tP5NaMryH7pnzPgwkMO&trackAsin=B0CPPDS66Z"
  },
  // Count Down
  "count-down-mp3": {
    appleMusic: "https://music.apple.com/in/album/count-down/1721673608?i=1721673835",
    jioSaavn: "https://www.jiosaavn.com/song/count-down/FBkNZAUHZlk",
    youtubeMusic: "https://music.youtube.com/watch?v=vnRiRYc6sTQ",
    amazonMusic: "https://music.amazon.in/albums/B0CPPFNYX7?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_UUuUFZzJhukDpvvIbnDYTUyO8&trackAsin=B0CPPGWRP5"
  },
  // Ikr
  "ikr": {
    appleMusic: "https://music.apple.com/in/album/ikr/1707143874?i=1707144291",
    jioSaavn: "https://www.jiosaavn.com/song/ikr/Gw8EB0NTW2k",
    youtubeMusic: "https://music.youtube.com/watch?v=HMuFUT0i4Ck&si=FikCOI0NvcH_mivd",
    amazonMusic: "https://music.amazon.in/albums/B0CHYN6ZFY?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_OoNC1eyEps5YbxOpJNVDtyiF2&trackAsin=B0CHYPRYQR"
  },
  // Sukoon
  "sukoon": {
    appleMusic: "https://music.apple.com/in/album/sukoon/1707143874?i=1707144301",
    jioSaavn: "https://www.jiosaavn.com/song/sukoon/NTsvQg0DRWw",
    youtubeMusic: "https://music.youtube.com/watch?v=L7fgSeZVGis&si=4CUNTeSS5Z2Ow6Lv",
    amazonMusic: "https://music.amazon.in/albums/B0CCW6417Y?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_x7aRECxFu79YqU1x2sLBlVvRZ&trackAsin=B0CCW6CJM7"
  },
  // Ekaki
  "ekaki": {
    appleMusic: "https://music.apple.com/in/album/ekaki/1707143874?i=1707144305",
    jioSaavn: "https://www.jiosaavn.com/song/ekaki/JVEhRStSTWQ",
    youtubeMusic: "https://music.youtube.com/watch?v=HMuFUT0i4Ck&si=FikCOI0NvcH_mivd",
    amazonMusic: "https://music.amazon.in/albums/B0CBBHV6DV?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_Dz77Rs5zxoxwG7vaBzG7VqV4F&trackAsin=B0CBBD8RJD"
  },
  // No Blessings
  "no-blessings-track": {
    appleMusic: "https://music.apple.com/in/album/no-blessings/1734948388?i=1734948390",
    jioSaavn: "https://www.jiosaavn.com/song/no-blessings/AQIzUDdoWEQ",
    youtubeMusic: "https://music.youtube.com/watch?v=E4y8QCWWmn8&si=7k15aZp_cL4FiWe3",
    amazonMusic: "https://music.amazon.in/albums/B0CXJ28RXL?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_LW9y0SGTwQ6KJTigWCnyjo1oJ&trackAsin=B0CXHWBZ3D"
  },
  // Badside
  "badside-track": {
    appleMusic: "https://music.apple.com/in/album/badside/1746237704?i=1746238071",
    jioSaavn: "https://www.jiosaavn.com/song/badside/Ax0xRxVcYGs",
    youtubeMusic: "https://music.youtube.com/watch?v=fQMuFeUEYc8&si=710s58W4hngJzsSO",
    amazonMusic: "https://music.amazon.in/albums/B0D44RDVB3?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_y6vbjtZLvUGOeoa23bT2gqkmz&trackAsin=B0D44TFY99"
  },
  // Us Bhai Us
  "us-bhai-us-track": {
    appleMusic: "https://music.apple.com/in/album/us-bhai-us/1752886133?i=1752886138",
    jioSaavn: "https://www.jiosaavn.com/song/us-bhai-us/HD8ZSTV8TWc",
    youtubeMusic: "https://music.youtube.com/watch?v=CCKy67iwRmk",
    amazonMusic: "https://music.amazon.in/albums/B0D7HY8XRB?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_LsRtV31R4P5HBo6oK4AwFnbtw&trackAsin=B0D7HXP67Y"
  },
  // Selfish Log
  "selfish-log-track": {
    appleMusic: "https://music.apple.com/in/album/selfish-log/1754066702?i=1754066705",
    jioSaavn: "https://www.jiosaavn.com/song/selfish-log/BD8vfllhVEE",
    youtubeMusic: "https://music.youtube.com/watch?v=xwQGwI0m2BI",
    amazonMusic: "https://music.amazon.in/albums/B0D8332YXR?marketplaceId=A3K6Y4MI8GDYMT&musicTerritory=IN&ref=dm_sh_vwC0paS0qRsuJCpBHB84yhTxo&trackAsin=B0D83FPLL3"
  },
};

/**
 * A search on each platform, for the entries that have no direct link yet.
 *
 * The artist name is appended because half these titles are common words —
 * "Paranoid" alone lands on Black Sabbath, and "Sukoon" on several hundred
 * other songs.
 */
/** Every field resolved: a real destination, or null when there is none yet. */
export type ResolvedLinks = Record<keyof PlatformLinks, string | null>;

/**
 * The five links for a track. Direct, or nothing.
 *
 * THERE IS NO SEARCH FALLBACK ANY MORE, and removing it is the point. Each of
 * these used to fall back to a search for the title on that platform, on the
 * argument that a working link beats a dead icon. What it actually produced
 * was a mark that looked identical whether it opened the record or a results
 * page for a word — and half these titles are common words, so "Paranoid"
 * landed on Black Sabbath. An icon that promises the song and delivers a
 * search is worse than one that visibly has nothing behind it.
 *
 * A MISSING LINK NOW RETURNS null, and `PlatformLinkRow` draws the greyed
 * placeholder it already had for tracks with no Spotify pressing. The row
 * keeps its geometry, the mark says plainly that it is not there, and filling
 * the entry in above turns it live with nothing else to change.
 *
 * `spotify` IS AN OVERRIDE, NOT THE USUAL ROUTE. Spotify ids live on the
 * `Track` records in `tracks.ts`, because artwork and durations resolve from
 * them too, and `PlatformLinkRow` builds the canonical URL from the id it is
 * handed. This field is for songs that have a Spotify page but no pressing id
 * on the record; set it and it wins.
 */
export function platformLinksFor(trackId: string): ResolvedLinks {
  const known = platformLinks[trackId] ?? {};
  return {
    spotify: known.spotify ?? null,
    appleMusic: known.appleMusic ?? null,
    jioSaavn: known.jioSaavn ?? null,
    youtubeMusic: known.youtubeMusic ?? null,
    amazonMusic: known.amazonMusic ?? null,
  };
}
