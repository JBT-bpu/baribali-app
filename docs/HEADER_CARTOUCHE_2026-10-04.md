# Builder header: selected Botanical Cartouche (option 2)

The owner selected displayed option **2** on 2026-10-04. This is a scoped
implementation in the existing Next.js app, not a replacement prototype.

## Scope

- Starter and summary use one shared `BuilderBrandHeader`.
- The full centered logo sits inside its own gold botanical arch. Native UI
  controls, the order title and the current price occupy a separate toolbar.
- Active ingredient selection retains its quiet dedicated header surface and
  existing space-efficient controls; no tall decorative masthead was added there.
- Checkout locking, back navigation, nutrition calculations, opening hours and
  payment/order behavior are unchanged. No database or provider settings changed.
- Short screens scale the complete masthead with `object-fit: contain`, rather
  than cropping the logo. Safe-area padding lives in the shared component.

## Asset provenance

- Selected reference: `exec-a75703f1-9cee-437c-9308-0667ed5a855b.png`
  in the conversation's generated image set.
- Built-in Image Gen, using the selected reference and existing authentic
  `public/homepage-assets/logo.webp`; no external API/CLI image generation.
- Original output: `exec-d5c93896-9793-4bb7-a1a6-47475ea239df.png`.
- Production asset: `public/builder-assets/builder-brand-cartouche-v2.webp`,
  1280 x 427, 122,396 bytes. Sharp resize/WebP compression only; original kept.
- The logo lettering belongs to the artwork. Prices, headings and buttons remain
  live text and controls. No screenshot is used as the interface.

## Generation prompt

```text
Use case: precise-object-edit / production UI asset extraction.
Input image 1 is the USER-SELECTED Botanical Cartouche app concept. Input image 2 is the authentic BariBali logo.
Produce ONE standalone production raster masthead/banner asset, landscape, aspect ratio exactly 3:1 (ideally 1536 x 512), opaque deep emerald background.
Faithfully recreate ONLY the top brand artwork of input 1: the symmetrical embossed metallic gold arch with pointed botanical crown at the center, fresh green leaves and subtle tomato accents at both shoulders, delicate gold botanical scrollwork near the lower corners, complete legible centered BariBali salad-bowl logo in yellow/lime green, luxurious dark emerald lightly textured background. Match input 1 extremely closely; this is implementation of the selected concept, not a new direction.
The entire BariBali logo must be INSIDE the art with all letters, top leaves and the full bowl visible. Keep the logo centered, ~37% of canvas width, generous breathing room; keep the crest and the gold arch inside the image. Edge-to-edge art, no external margins. A very fine horizontal gold rail along the lower edge.
Do not include the toolbar, back button, price, Hebrew text, calorie card, body content, controls, device frame or any screenshot remnants. No numbers. The ONLY text allowed is the original exact brand wordmark "BariBali" (B-a-r-i-B-a-l-i) incorporated into the original logo. No new slogans. No watermark.
This asset will be displayed at 430 x 143 CSS pixels in a real mobile app, so keep detailing crisp, silhouette clear and readable at that size. Flat front-on view, no perspective distortion, opaque #061a0b to #0b2b13 emerald edges that blend into existing UI.
```

## Verification

See root `design-qa.md` for browser evidence and visual comparison status.
Targeted regression coverage lives in `tests/payment/uiPolish.test.ts` and
`tests/payment/customerFlow.test.ts`.
