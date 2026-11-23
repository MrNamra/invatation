# Design Document: Invitation Image Download & Multi-Page PDF Export

**Date:** 2026-11-23  
**Status:** Pending Approval  
**Target Route:** `/invite/[code]` (e.g. `/invite/JARI7M2K`)

---

## 1. Intent & Purpose
Enable guests visiting their personalized wedding invitation link to:
1. Download any individual invitation card (Cover, ceremony, or closing) as a high-resolution, branded image file (PNG).
2. Export the complete invitation deck as a single, multi-page PDF where each card is a page, and every ceremony card retains working clickable hyperlinks (e.g., Google Maps location links) so guests can navigate directly from the downloaded PDF.

---

## 2. Scope & Goals
- **Goals:**
  - Provide a clean, intuitive "Download Image" button on each card (or in the card actions bar alongside "Click for location" and "Add to calendar").
  - Provide a dedicated "Export PDF" action in the viewer controls (header/pagination dock).
  - High fidelity: rendered images and PDF pages must capture the exact fonts (`Cormorant Garamond`, `Allura`, `Instrument Sans`), royal crest SVG, floral arch / starlight illustrations, guest personalization, and ceremony timings.
  - Multi-page PDF must preserve active links over the venue map button (`pdf.link(x, y, w, h, { url })`).
  - Seamless performance: 100% client-side rasterization and PDF generation without backend latency or external server dependencies.
  - Support both the primary 9:16 Heritage format (`royal-jharokha`) and classic stationery templates.
- **Non-Goals:**
  - Automated WhatsApp dispatch of binary attachments (WhatsApp web links continue to send invitation text + URL).
  - Server-side headless browser rendering (Puppeteer).

---

## 3. Approaches Considered & Selected Approach

- **Approach 1 (Selected): Client-Side Rasterization with `html-to-image` and `jspdf`**
  - Uses `html-to-image` at $2.5\times$ pixel ratio for high-resolution card capture.
  - Uses `jspdf` to compile a 9:16 aspect ratio multi-page document (`Cover` $\rightarrow$ `Permitted Ceremonies` $\rightarrow$ `Closing & Regards`).
  - Measures the bounding box of the "Click for location" button on each ceremony card and adds a clickable link annotation to the PDF page via `pdf.link(...)`.
- **Approach 2 (Rejected): Server-Side Puppeteer**
  - Rejected due to heavy resource usage, serverless function payload/bundle limits, and slow response times (5–12s).
- **Approach 3 (Rejected): Raw Canvas 2D Manual Painting**
  - Rejected due to duplicate layout logic, complex font rendering, and fragile maintenance.

---

## 4. UI & UX Architecture

### A. Download Image (Scope A)
- On the sealed cover, open cover, ceremony cards, and closing card:
  - Add a **"Download Image"** button.
  - On ceremony cards in `royal-jharokha`, place it in the action row alongside `Click for location` and `Add to calendar`.
  - **Export Display Rules for Image:**
    - The "Click for location" link button is **hidden** in the downloaded image (since images cannot contain clickable web links).
    - The "Add to calendar" and "Download Image" buttons are **hidden** in the downloaded image.
    - The artwork, crest, couple names, date, time, venue address text, and attire are cleanly rendered without interactive UI buttons.
  - Filename conventions:
    - Cover: `Abhishek-Maitri-Invitation-Cover.png`
    - Ceremony: `Abhishek-Maitri-[CeremonyName].png`
    - Closing: `Abhishek-Maitri-Warm-Regards.png`

### B. Export PDF (All Pages with Active Links)
- Added to the viewer navigation bar / header action area as "Export PDF".
- **Export Display Rules for PDF:**
  - The "Add to calendar" button is **hidden** on ceremony pages in the PDF (interactive .ics download does not apply to PDF readers).
  - The "Download Image" button is **hidden** in the PDF.
  - The "Click for location" link button remains **visible**, styled cleanly, and receives an active PDF hyperlink annotation (`pdf.link(...)`) pointing to the ceremony's Google Maps URL.
- When clicked:
  - Displays progress indicator ("Generating PDF...").
  - Sequentially compiles all permitted cards into a 9:16 aspect ratio PDF.
  - Downloads: `Abhishek-Maitri-Wedding-Invitation-[GuestName].pdf`.

---

## 5. Technical Requirements & Dependencies
- Add `html-to-image` and `jspdf` to dependencies.
- Ensure CORS/local asset loading for `/cards/*.jpg` and web fonts are handled cleanly during rasterization.
- Clean error handling with accessible notifications if rasterization encounters any issue.
