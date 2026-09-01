# The Vault — technical specification

How an interactive star-drawing sky is built, and how this one is built.

The brief was to study `neal.fun/constellation-draw` as a reference for the
*kind* of experience wanted, write down how that kind of thing works, and then
build an original version on this project's stack. This document is the
written-down part: section 1 is what the study found, section 2 is the
specification that follows from it, section 3 is what was actually built.

No code, shader, asset or data file from the reference was copied. Where a
number here matches one there, it is because both are derived from the same
astronomy — the colour of a B-type star is not a design decision.

---

## 1. What the reference does

Findings from the live page: DOM, network, and the shipped bundles.

**Stack.** A Nuxt (Vue 2) page with one `<canvas>` running WebGL2 through
three.js. Everything on screen except the HUD is in that single canvas; the HUD
— star name, coordinates, hint, controls — is ordinary DOM positioned over it.

**Data.** Two CSVs fetched at boot:

- `stars.csv`, ~805 KB, ~20 000 rows, columns `ra,dec,mag,ci,proper,hip,spect,gl`.
  This is the shape of the **HYG database**, a public compilation of the
  Hipparcos, Yale Bright Star and Gliese catalogues.
- `constellations_hip.csv`, ~11.5 KB, 700 rows, columns `iau,hip1,hip2` — the
  IAU stick figures as pairs of Hipparcos ids.

**Rendering.** Stars are one `THREE.Points` with a custom `ShaderMaterial`:
per-vertex colour, size, brightness and a highlight attribute, additive
blending, depth testing off. Point size is scaled by `projectionMatrix[1][1]` —
the cotangent of half the field of view — so zooming magnifies stars rather
than merely spreading them apart. Constellation lines and user-drawn lines use
the fat-line helper (`Line2`/`LineMaterial`), because native WebGL line width is
one pixel; each drawn connection also carries a separate additive glow mesh
whose intensity lerps up when the connection is hovered.

**Camera.** A `PerspectiveCamera` at the centre of the sphere. Zoom is animated
field of view, not translation. Look-at moves are quaternion slerps over
~1500 ms. The "globe view" pulls the camera outward and shrinks point size by
roughly `1/sqrt(distance/156)`, so the sphere does not become a solid ball of
overlapping sprites.

**Picking.** `THREE.Raycaster` with `params.Points.threshold` around 0.8–1.0
world units on a sphere of radius 100 — about half a degree — widened on touch.

**Audio.** Tone.js: a `Sampler` of five notes — A3, C4, D♯4, F♯4, A4 — through
`FeedbackDelay` → `Chorus` → `Reverb`. Those five pitches are stacked minor
thirds: a **diminished seventh**, the one chord with no root and no resolution,
so connections drawn in any order never sound wrong and never sound finished.

**Interaction.** The hint reads "Select two stars to connect them" — it is
tap-tap, not drag. Controls sit bottom-right: colour, constellations, globe
view, clear, name, my sky, share.

---

## 2. Specification for building one independently

### 2.1 Data

Source a public star catalogue and reduce it at build time. Required per star:
right ascension (hours), declination (degrees), apparent magnitude, colour
index; optional proper name, designation, spectral class, constellation.

Cut at **magnitude 6.5**, the naked-eye limit. This is the single most
effective decision in the build: it takes a 120 000-row catalogue down to about
8 900 stars, which is both the correct sky and a trivial amount of geometry.

Store as **parallel arrays**, not an array of objects — an object per star costs
roughly four times the bytes and has to be flattened into typed arrays for WebGL
anyway. Keep name/designation/spectral maps **sparse**, keyed by index: only a
few hundred stars have any of them.

Constellation figures usually arrive as loose RA/Dec polylines. **Snap each
vertex to the nearest catalogue star at build time** and store index pairs.
Skipping this draws figure lines that miss their own stars by a fraction of a
degree, which reads as blur.

### 2.2 Projection

Place stars on a sphere of fixed radius *R* (100 works):

```
a = −(ra / 24) · 2π           b = (dec / 180) · π
x = R · cos(b) · cos(a)
y = R · sin(b)
z = R · cos(b) · sin(a)
```

**Negate the right-ascension angle.** The sky is seen from inside the sphere;
without the negation every constellation renders mirrored, which nobody notices
until an astronomer does.

### 2.3 Appearance

Magnitude is logarithmic — five magnitudes is a hundredfold in received light —
so radius must not come from it linearly, or you get a sky of identical dots or
one where Sirius eats the screen. Take flux, then a fractional power:

```
flux  = 10^(−0.4 · mag)
size  = clamp(3.4 · flux^0.38, 0.3, 9)
alpha = clamp(0.16 + 0.84 · (6.7 − mag) / 8.2, 0.12, 1)
```

Colour comes from the B−V colour index, interpolated between stops rather than
stepped (stepping bands visibly). Desaturate against the textbook values: real
stars are near-white to the eye, and saturated primaries read as a screensaver.

Draw stars as **one `Points` draw call** with additive blending and depth
testing off. Stars are light, and light adds — two overlapping should be
brighter, not one occluding the other. In the fragment shader, combine a tight
core, a soft halo, and a four-point diffraction spike weighted so it stays off
the faint stars, where it would only look like dirt.

### 2.4 Camera

Camera at the centre, turning in place. Zoom is field of view (16°–72°), never
translation. Track yaw and pitch; clamp pitch just short of the poles.

Scale the drag rate by field of view, or a zoomed-in sky whips past under the
same hand movement.

For a globe view, interpolate one scalar `orbit` from 0 to 1 and derive
everything from it: camera position `direction · R_orbit · orbit`, look target
`direction · 2R · (1 − orbit)`. Interpolating the *target* rather than switching
it is what makes the trip out and back one continuous move. Shrink point size as
`orbit` rises.

### 2.5 Picking

Raycast against the points with a threshold that **scales with field of view** —
the threshold is an angle in disguise, and a fixed world-space value becomes
unhittable when zoomed out. Among hits, prefer the smallest ray distance, nudged
toward brighter stars so a faint neighbour cannot steal a click aimed at
something obvious.

Distinguish a look from a click by accumulated pointer movement (~6 px). Without
it the sky selects a star every time the user turns their head.

### 2.6 Drawing connections

Do **not** use `THREE.Line`: WebGL line width is one pixel on effectively every
platform regardless of what is requested.

Either use a fat-line helper, or — simpler, and free of dependencies — build
each connection as a **four-vertex quad** oriented in the vertex shader:

```glsl
side = normalize(cross(normalize(B - A), normalize(P)));
P   += side * aSide * halfWidth;
```

Because the camera sits at the centre of the sphere, the radial direction
`normalize(P)` *is* the view direction, so the quad is always face-on. That is
the whole trick: no per-frame billboarding, no library.

Animate the draw-on by carrying a birth time per vertex and interpolating the
far endpoint — geometry stays static, only a uniform advances. Mark restored
connections with a sentinel birth time so reopening does not replay every line
ever drawn.

Rebuild the whole connection geometry on change. Wasteful in principle and free
in practice — a busy sky is a few dozen lines — and it removes the entire class
of bug where geometry drifts out of step with the edge list.

### 2.7 Sound

One note per connection, climbing as a figure grows and dropping back when a new
figure is started. Compute "how big is the figure this connection just joined"
with a flood fill over the edge list; a few dozen edges does not justify a
union-find.

The diminished seventh (A3, C4, D♯4, F♯4, A4) is the right chord because every
note in it is equivalent — a constellation drawn in any order cannot sound
wrong. Sampling is unnecessary: two detuned oscillators through a lowpass that
closes as the note decays, then a shared chorus → delay → reverb, is
indistinguishable in context and ships no audio files. Generate the convolution
impulse from decaying noise; a reverb needs an impulse, not a recording.

Build the audio graph lazily on the first note — an `AudioContext` created
before a user gesture starts suspended, and browsers are right to insist.

### 2.8 HUD

Keep it DOM, over the canvas. Star readout anchored away from the cursor, since
the star it describes is already under the cursor. A hint that retires itself
once the user has demonstrably read it. Coordinates throttled — formatting them
every frame is a string allocation and a re-render for something that changes by
arc-minutes.

---

## 3. What was built here

| Concern | File |
| --- | --- |
| Build the atlas from public data | `scripts/build-sky-atlas.mjs` (`npm run build:sky`) |
| Atlas schema, projection, colour/size maths | `src/lib/sky-atlas.ts` |
| Connection chime | `src/lib/sky-audio.ts` |
| Scene, interaction, HUD | `src/components/shared/ConstellationSky.tsx` |
| Mounted behind the code lock | `src/components/dev/window-content/VaultWindow.tsx`, `src/components/dotm/window-content/DotmVaultWindow.tsx` |

**Data.** 8 920 stars brighter than magnitude 6.5 and all 89 line figures, in one
542 KB JSON (~150 KB over the wire). Built from the **HYG catalogue v4.0**
(astronexus/HYG-Database, CC BY-SA 2.5) and **d3-celestial** constellation lines
(ofrohn/d3-celestial, BSD-3-Clause). Every figure vertex snapped to a catalogue
star inside 1° — zero vertices dropped.

> **Licence note.** HYG is CC BY-SA 2.5: attribution is required, and the
> share-alike term attaches to the derived data file. The Vault carries the
> credit on screen. If that is unwanted, the atlas can be regenerated from a
> permissively licensed or synthetic catalogue by pointing
> `build-sky-atlas.mjs` at a different source — nothing else changes.

**Deviations from the reference, all deliberate:**

- **One control, not seven.** Globe view only. Everything else is direct
  manipulation — drag to look, wheel to zoom, click a star — or a keystroke.
- **No `Line2`.** Connections are the billboarded quads of §2.6, so the Vault
  adds no dependency beyond the `three` already in the project.
- **No audio files.** The chime is synthesised (§2.7).
- **Removing a line without a Clear button:** choosing the same pair again takes
  that line out, and backspace undoes the last one. Losing the only exit from a
  mistake was not an acceptable reading of "clear the other controls".
- **Persistence** to `localStorage` under `dotm-vault-constellations-v1`, shape
  `{ v: 1, edges: [[a, b], …] }` — star indices only.
- **Reduced motion** is honoured: twinkle stops and lines appear at full length
  rather than growing.

**Verified in the browser.** WebGL2 context in both personas; picking returns a
real star (index 1889 at the view centre, nearest star 0.378° from the ray
against a 0.516° threshold); hover reports real catalogue data
("Star 2952 · Gemini · K0 · mag 6.07"); a chain of clicks produces
`[[2952,2961],[2961,2931],[2931,2928]]`; clicking a pair again removes that
line; backspace undoes; the chime fires at 311 Hz (D♯4) then 370 Hz (F♯4),
climbing the chord as designed; exactly one control button exists in the overlay.

The scene's *appearance* could not be verified visually — this environment never
composites frames, so `requestAnimationFrame` does not run and nothing paints.
The component renders one frame synchronously at setup for that reason, which is
also why picking works here at all.
