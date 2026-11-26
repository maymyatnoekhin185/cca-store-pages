# Carpet Court store pages: clickable prototype

A clickable prototype of the Carpet Court **Store Locator** and **Store Details** pages, built in plain HTML, CSS and JS from the Figma designs (CC Style Guide components, "Store Pages" screens). It lets the team and the client click through both pages on a computer or a phone before the real build.

**Live link:** https://maymyatnoekhin185.github.io/cca-store-pages/

## What's in it
- **Store Locator** (`#/` list, `#/map` map view):
  - The search field shows recent searches and suburb suggestions as you type, with the matching part in bold. Arrow keys and Enter pick a suggestion, and Esc closes the list.
  - Searching shows loading skeletons, then results.
  - Use my location goes through Locating…, then My location, or a notice if location is blocked.
  - Filters on desktop are dropdowns (Services, State, Weekends) with Clear and Apply, plus sort chips. On mobile, one Filters button opens a bottom sheet with "Show N stores".
  - There are empty and error states (No stores match those filters, We couldn't load stores) with ways out.
  - Map view: pins, a selected store bar, drag the map to get "Search this area", and zoom.
- **Store Details** (`#/store/<id>`, e.g. `#/store/south-melbourne`):
  - Hero with View full hours (a popover on desktop, a sheet on mobile).
  - A sticky sub-nav that highlights the section you're on.
  - Team, awards, promotions, services, reviews, why us, service areas, socials, FAQ accordion and visit.
  - A sticky booking panel: pick a day and time, then Continue.
  - Videos play in place, with a full-screen button and an exit-full-screen button.
  - On mobile, a sticky "Free Measure & Quote" bar.
- **Booking and callbacks open the AI chat** (old flow). The chat is a placeholder panel here; booking forms aren't part of the store pages.

## Reviewing
- **Computer and phone:** it's responsive. The desktop layout is from 1024px wide, and the mobile layout is below that.
- **"Prototype" button** (bottom left): jump straight to any state, such as No results, Error, Location blocked, Filters open, Video full screen or Booking with a time picked.
- Each page has its own address, so a copied link opens the same page. A refresh keeps your search, filters and view for the session.

## Run it locally
You only need Node. There's nothing to install.

```powershell
node dev-server.mjs
```

Then open http://localhost:5173.

## Deploy
GitHub Pages serves the `main` branch from the repo root. Work happens on `dev`; merge `dev` into `main` when a version is approved, and the live link updates within a minute or two.

## Files
| File | What it is |
|---|---|
| `index.html` | Page shell: header, footer, overlay root, prototype panel |
| `app.js` | Router, Store Locator, Store Details, overlays, prototype states |
| `data.js` | Sample stores, suburbs, FAQs and opening hours |
| `styles.css` | Styles and CC tokens (colours, type, buttons), desktop and mobile |
| `assets/` | Icons, images and Brother 1816 fonts from the Figma files |
| `dev-server.mjs` | Local preview server with no dependencies |
| `UX.md` | Scenarios and intended behaviour |

## Design source
- Design file `BPvKdah6zVHvlVq2mpH2b0`: sections "Locator - CC Design System", "Locator - Interaction states", "Locator - More interaction states" and "Store Details - Interaction states".
- Components: CC Style Guide `YHQ7wXojE9Xgpv5bgX8gEC`, page "Store Pages - New Components".

Store data, times and ratings are sample content.
