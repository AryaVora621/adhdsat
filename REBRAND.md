# Rebrand: ADHDSat → Tally

Decided 2026-06-30. The working name "ADHDSat" was a personal placeholder. For
launch we need an original, memorable, non-clinical name that's trademark-safe.

## The name
**Tally** — counting small wins. Ties directly to the existing "Field Notes"
identity (hand-drawn tally marks on warm paper), reads as a friendly verb
("tally up your wins"), and drops "SAT" from the name (College Board owns the SAT
trademark — descriptive use like "SAT prep" in copy is fine; using it in the brand
name is not).

- Spoken/brand name: **Tally**
- Domain: **tally.college** (confirmed AVAILABLE via whois 2026-06-30 — "DOMAIN
  NOT FOUND"). A distinctive TLD sidesteps the crowded bare "tally.com" while
  staying memorable and on-theme for a study tool.
- Positioning line: **"The SAT prep that counts every small win."**
  Alt short: "Small wins, tallied."

## Trademark note
Bare "Tally" is crowded in OTHER categories (tally.so forms, Tally budgeting,
Tally Solutions/TallyPrime accounting). None are in test prep / education software,
so "Tally" in our class is defensible, but: before spending on legal, do a USPTO
TESS search in the relevant class (Int'l Class 41 education / 9 software) and
consider a composite mark (Tally + bolt logo) for a stronger filing.

## Rollout checklist
App UI + meta (keep functional asset URLs on adhdsat.vercel.app until the domain
is live — see Launch step):
- [ ] index.html: <title>, description, OG/Twitter title+desc, apple-mobile-title
- [ ] Wordmark: Sidebar, App (loading + error screens), Onboarding, Landing
      (nav + footer)
- [ ] Copy: Upgrade ("Tally Pro"), Profile, Landing badge/headline
- [ ] manifest.webmanifest: name + short_name
- [ ] sw.js: cache name (bump version)
- [ ] KEEP localStorage key 'adhdsat-theme' (invisible; changing it would drop
      existing users' saved theme — migrate later if ever)
- [ ] favicon.svg: bolt mark is text-free, keep as-is
- [ ] og-image.png: regenerate (currently has "ADHDSat" baked in) via a Remotion
      OG composition (1200x630, Field Notes)

Ads:
- [ ] Logo wordmark "ADHDSat" → "Tally" (centralized in ads/src/brand.ts)
- [ ] CTA URL → tally.college
- [ ] Re-render all 3 cuts

## Launch step (HUMAN, before publishing)
1. Register **tally.college** at a registrar.
2. Add it as a domain in the Vercel project; set as primary; update DNS.
3. Swap absolute asset/canonical URLs (og:image, og:url, twitter:image) from
   adhdsat.vercel.app → tally.college once it resolves.
4. Do NOT publish any ad showing tally.college until the domain resolves.
5. (Optional) update Supabase Auth Site URL + redirect allowlist to the new domain.

## Not changing
- The Field Notes visual system (palette, fonts, sticker devices) — Tally fits it
  perfectly, so the rebrand is name + copy, not a visual redesign.
- Backend table/schema names (adhdsat schema) — internal, no user impact.
