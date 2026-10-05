# Botanical UI extension — 2026-10-05

## Brief and boundary

Extend the owner's approved illustrated emerald/gold salad card through the
existing v1.0 customer UI. Make S → M → L progressively more luxurious without
increasing component dimensions. Identify the two unlaunched home products as
pasta and sandwiches/tortillas. Preserve the restored bright background,
particles, guest-first journey, real prices and all backend/payment boundaries.

No new dependency, provider change, environment edit, database write, real
order/payment or production deployment belongs to this phase. Preview publication
requires a fresh owner go-ahead; earlier Preview URLs do not contain these edits.

## Scoped visual audit and changes

The before captures are from the actual app at 393×852, guest, closed-shop UI
fixture, reduced motion: `.playwright-cli/art-system-2026-10-05/01-home-before.png`,
`02-size-before.png`, `03-entry-before.png`, `04-orders-before.png`.

- Home's third card concealed the future product. It now clearly says pasta;
  the other future card says sandwiches/tortillas. Both remain locked, including
  keyboard activation and artwork failure. Pasta is not an OrderProduct.
- The size cards lacked material progression. Their original 210×272 footprint
  is unchanged: S restrained engraving, M richer glazed/engraved bowl, L lavish
  gold relief with a pedestal and double botanical perimeter. Real selection
  feedback remains code, not baked into the art.
- The entry card, 12 small chef-recipe buttons and compact live bowl now share a
  quiet botanical nine-slice texture. No larger boxes, extra fixed-height region
  or repeated animation. Live recipe prices and ingredient selections remain
  native content. The live bowl stays 114px high at 393px width.
- Final price/promo panel, signed-in history cards and account panels opt into
  that surface. Error panels remain distinct. Existing bespoke nutrition,
  confirmation and tracking artwork is preserved rather than redundantly framed.
- Guest orders/profile use a dedicated blank journal illustration instead of
  generic emoji, with a same-width guest CTA alongside Google sign-in. Login
  reuses the existing real brand logo, enlarges its guest link and brightens its
  supporting copy without darkening the background.
- Visual QA found and repaired a pre-existing short-height size-stage overlap:
  reserve the actual 272px card height at ≤600px and let the modal scroll. No
  canonical-screen card or control grows. Confirmation and Back remain reachable.

No auth fetch, order total computation, ingredient rule, recipe contents,
checkout consent, pickup scheduling or provider callback was modified.

## Asset manifest

All seven new assets were generated with built-in ImageGen; source PNGs were
preserved. Sharp was used only for mechanical resizing, WebP compression and
equal-scale QA boards. Existing artwork has not been deleted or replaced.

| Asset under public/ | Pixels | Bytes | Embedded facts |
| --- | --- | ---: | --- |
| homepage-assets/size-s-botanical-54-v1.webp | 630×816 | 128810 | קטן / S / 54 ₪ / 750 מ״ל / קומפקטי |
| homepage-assets/size-m-botanical-59-v1.webp | 630×816 | 149578 | בינוני / M / 59 ₪ / 1000 מ״ל / הקלאסי |
| homepage-assets/size-l-botanical-72-v1.webp | 630×816 | 184538 | גדול / L / 72 ₪ / 1500 מ״ל / הכי גדול שלנו |
| homepage-assets/card-pasta-botanical-v1.webp | 630×858 | 162042 | פסטה / משהו חדש מתבשל |
| homepage-assets/card-wraps-botanical-v1.webp | 630×858 | 166278 | כריכים וטורטיות / בקרוב בתפריט |
| builder-assets/botanical-panel-v1.webp | 960×320 | 20104 | None |
| homepage-assets/order-journal-botanical-v1.webp | 512×384 | 48436 | None; genuine alpha |

Total source-file addition: 859786 bytes (about 840KiB); this is not a measurement
of per-route transfer, decode time or device performance. Cards are 3× display
resolution. The reusable panel is only 20KB and does not introduce JS animation.

## Generation prompt set — reproducible briefs

Shared visual reference: `public/homepage-assets/card-salad-botanical-54-v1.webp`.
These are condensed generation briefs, not a claim of verbatim raw transcripts.

- S: one full-bleed portrait 630:816 card for 210×272 display; dark emerald,
  ivory Hebrew, sparse leafy gold perimeter, small glazed salad bowl, restrained
  gold engraving. Exactly קטן, S, 54 ₪, 750 מ״ל, קומפקטי. Quiet upper-right area
  for the native selected marker; no availability, extra words or baked controls.
- M: matching full card and grid, lush glazed emerald bowl with richer raised
  botanical gold relief and gold plaque. Exactly בינוני, M, 59 ₪, 1000 מ״ל,
  הקלאסי. Same quiet selected-marker area and no fabricated claims.
- L: same component grid; most luxurious craftsmanship, lavish engraved gold
  botanical relief, pedestal, double gold perimeter and mirrored gold-leaf crest,
  no royal crown/jewels. Exactly גדול, L, 72 ₪, 1500 מ״ל, הכי גדול שלנו. Footer
  within CSS y239–261; plaque within y190–231; no larger component footprint.
- Pasta: portrait 630:858 matching the approved home card, appetizing pasta
  ribbons/spirals with vegetables and basil in an emerald engraved bowl.
  Exactly פסטה and משהו חדש מתבשל, no price, date, availability or native badge.
- Sandwiches/tortillas: same frame, filled sliced wrap and rustic sandwich with
  vegetables, exact two-line heading כריכים / וטורטיות and בקרוב בתפריט.
  No launch date, price, ingredients promise, CTA or embedded lock/badge.
- Shared panel: landscape 3:1 quiet dark emerald ceramic center (central 80%
  stays empty), fine gold leaf corners and thin perimeter. No text, numbers,
  food, logo or icon. Use actual nine-slicing, not handcrafted CSS ornament.
- Journal: transparent 4:3 open emerald/gold journal with blank cream pages,
  matching small salad bowl and leaf sprig. Tight crop, real botanical engraving;
  no text, fake order history, logo, numbers or other symbols. Preserve real alpha.

Original PNG locations retained on the generation host under
`C:/Users/COMP13/.codex/generated_images/`:

- S: `01a10b9d-5c19-7921-965e-b6ad014488e2/exec-3910a550-a446-4d87-8b86-fe3d80e6dba1.png`
- M: `01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-c7272702-d6b3-4d69-97b2-bd8c72b95495.png`
- L: `01a10b9d-5c19-7921-965e-b6ad014488e2/exec-06b483e6-b373-4a9a-8737-3da16aa4705f.png`
- Pasta: `01a10b9d-654d-7c51-9c80-3735ce1a36e2/exec-a9194d40-e6bd-4d6e-857e-7b2830ea6901.png`
- Wraps: `01a10b9d-654d-7c51-9c80-3735ce1a36e2/exec-fa04487e-272d-4fb8-9055-31be81d42bc5.png`
- Panel: `01a10b9d-6e7c-78a1-bae1-747ef0dc3518/exec-b24d49b8-25f8-4558-a949-713284899641.png`
- Journal: `01a10b9d-6e7c-78a1-bae1-747ef0dc3518/exec-4b8fd039-77ff-4301-aeb9-5aa513222951.png`

## Price, launch and failure safety

`catalogArtwork.ts` is presentation metadata, not pricing authority. Illustrated
size offers display only when id, name, price, volume and descriptor all match
the current effective offer exactly. Any changed price/content or image failure
reveals native live content. Future art requires matching copy AND a locked
product; future assets have no price. Server product/price rules are untouched.

Native offers also display in forced colors and short/zoomed viewports (home
≤560px height, size picker ≤600px). Real buttons, ARIA facts, keyboard focus,
Escape, modal trapping and touch activation remain intact. Raster text does not
inherit every OS/browser text preference: this is not a full WCAG certification.

The common panel is opt-in (`ornate` defaults false), decorative, pointer-safe,
and hidden in forced colors. It is not applied to kitchen/admin or error states.

## Evidence and remaining limits

See the current phase at the top of `design-qa.md` for browser results and actual
combined comparisons. Files are in `.playwright-cli/art-system-2026-10-05/`.
`source-and-render-board.png` shows source above / actual browser below at equal
scale; `before-after-*` compares actual same-turn captures, before left / after
right. `size-luxury-progression.png` presents S, M, L left-to-right.

Guest/responsive/keyboard/ingredient/summary flows are tested with mock APIs,
external hosts and non-GET requests blocked. Authenticated history/profile,
real-device performance, Google OAuth, staff and card-payment round trips are
not claimed by this visual pass. Main and production remain untouched.
