# Ad music bed

The compositions support a music bed via `<Music track="..." />` (see
src/components/Music.tsx). It's **off by default** so renders work without an
audio file. To enable:

1. Get a licensed/royalty-free track (brief below).
2. Save it to `ads/public/audio/` (create the folder), e.g. `bed.mp3`.
3. In each composition (HookVertical / Explainer / Bumper), add inside the root
   `<AbsoluteFill>`: `<Music track="bed.mp3" />`. Adjust `volume` (default 0.32,
   ducked under captions) and `fadeFrames` as needed.
4. Re-render. The bed auto-fades in/out and is ducked so on-screen text stays
   dominant (most viewers watch muted, so music is a bonus, not load-bearing).

## Brief
Warm, building, light percussion. Optimistic but not corporate-EDM. Should feel
like momentum and small wins — matches the Field Notes voice (encouraging, plain).
Avoid lyrics (they fight captions). 15s/30s/6s cuts each want a clean start and a
resolved end; pick tracks you can trim to a satisfying button.

## Royalty-free sources (verify license for paid/social ads before publishing)
- Uppbeat (uppbeat.io) — free tier, ad-friendly, good "uplifting" category.
- Pixabay Music (pixabay.com/music) — CC0-ish, no attribution.
- YouTube Audio Library — free, filter by "Happy/Inspirational", check usage.
- Epidemic Sound / Artlist — paid subscriptions, broadest commercial coverage.

## Licensing note
For PAID social ads (Meta/TikTok/YouTube), confirm the track's license explicitly
permits paid advertising — many "free" licenses cover organic posts only. When in
doubt, use Epidemic/Artlist or a Uppbeat paid credit.
