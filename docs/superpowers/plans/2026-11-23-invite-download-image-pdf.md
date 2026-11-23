# Invitation Image Download & Multi-Page PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow wedding guests on `/invite/[code]` to download any card as an image and export all permitted invitation cards as a single multi-page PDF with working Google Maps hyperlinks.

**Architecture:** Client-side generation using `html-to-image` for high-resolution 9:16 card rasterization and `jspdf` for compiling the multi-page PDF document. Export filter rules cleanly strip non-applicable buttons (link button and calendar button hidden in images; calendar button hidden in PDF; location link visible with clickable PDF hyperlink annotation).

**Tech Stack:** Next.js 16 (React 19), `html-to-image`, `jspdf`, Tailwind CSS, Lucide React, TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-23-invite-download-image-pdf-design.md`

## Global Constraints
- Target route: `/invite/[code]` (e.g. `/invite/JARI7M2K`).
- Image download: Hide "Click for location" button, "Add to calendar" button, and export trigger buttons.
- PDF export: Hide "Add to calendar" button and export trigger buttons; keep "Click for location" button visible and attach working PDF hyperlink (`pdf.link(...)`).
- High-resolution: Render at least $2\times$ pixel ratio to prevent pixelation on mobile screens and print.
- Offline/Client-side: Zero external server dependencies or timeouts.

## Review Focus
- High-DPI screens: Ensure SVG crest and web fonts render crisply without layout shift during rasterization.
- Link bounding box accuracy: Relative coordinates for `pdf.link(...)` must match the "Click for location" button across all screen sizes.
- Missing venue/mapUrl: If an event has no mapUrl, use standard Google Maps search query fallback without breaking PDF link creation.
- Disabled/Busy states: Show loading spinner and disable duplicate clicks while rasterization / PDF compilation is in progress.
- Clean filenames: Sanitize guest name and ceremony names for file downloads.

---

### Task 1: Install Dependencies (`html-to-image` & `jspdf`)

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `html-to-image` and `jspdf` packages available in `node_modules` and `package.json`.

- [ ] **Step 1: Install `html-to-image` and `jspdf`**
Run: `npm install html-to-image jspdf`

- [ ] **Step 2: Verify packages in `package.json`**
Run: `npm list html-to-image jspdf`
Expected: Both packages listed without peer dependency conflicts.

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "deps: add html-to-image and jspdf for invitation export"
```

---

### Task 2: Create Export Utility Module (`src/lib/export-invitation.ts`)

**Files:**
- Create: `src/lib/export-invitation.ts`

**Interfaces:**
- Produces:
  - `downloadElementAsImage(element: HTMLElement, filename: string): Promise<void>`
  - `generateMultiPagePdf(cards: Array<{ element: HTMLElement; mapUrl?: string | null }>, filename: string, onProgress?: (current: number, total: number) => void): Promise<void>`
  - Class constants: `EXPORT_HIDE_IMAGE = "export-hide-image"`, `EXPORT_HIDE_PDF = "export-hide-pdf"`, `EXPORT_LOCATION_LINK = "export-location-link"`

- [ ] **Step 1: Implement `src/lib/export-invitation.ts`**
Write helper functions:
- `downloadElementAsImage`: calls `toPng(element, { pixelRatio: 2.5, filter: (node) => !node.classList?.contains(EXPORT_HIDE_IMAGE) })`, creates temporary `<a download>`, triggers click, revokes URL.
- `generateMultiPagePdf`: loops over card elements, calls `toJpeg` or `toPng` with `filter: (node) => !node.classList?.contains(EXPORT_HIDE_PDF)`, adds 9:16 page to `new jsPDF({ orientation: "portrait", unit: "pt", format: [720, 1280] })`, finds `.export-location-link` in element, calculates relative `(x, y, w, h)`, calls `pdf.link(...)`, and finally saves PDF.

- [ ] **Step 2: Verify typechecking**
Run: `npm run typecheck`
Expected: Exits with 0 errors.

- [ ] **Step 3: Commit**
```bash
git add src/lib/export-invitation.ts
git commit -m "feat: add client-side image and PDF export utilities"
```

---

### Task 3: Integrate Export Controls into `GuestInvitationViewer.tsx`

**Files:**
- Modify: `src/components/GuestInvitationViewer.tsx`

**Interfaces:**
- Consumes: `downloadElementAsImage`, `generateMultiPagePdf`, `EXPORT_HIDE_IMAGE`, `EXPORT_HIDE_PDF`, `EXPORT_LOCATION_LINK` from `src/lib/export-invitation.ts`.
- Produces:
  - Download Image button on cards.
  - Export PDF button in the pagination/header navigation dock.
  - Hidden offscreen deck rendering for multi-page PDF generation of all permitted ceremonies.

- [ ] **Step 1: Add export-hide classes to action buttons**
- Add `EXPORT_HIDE_IMAGE` and `EXPORT_LOCATION_LINK` to "Click for location" / "Open map" links.
- Add `EXPORT_HIDE_IMAGE` and `EXPORT_HIDE_PDF` to "Add to calendar" buttons.
- Add `EXPORT_HIDE_IMAGE` and `EXPORT_HIDE_PDF` to any on-card export buttons.

- [ ] **Step 2: Add "Download Image" button to ceremony cards, cover, and closing cards**
- Place "Download card" button in the ceremony action bar.
- On click, reference the current card DOM ref and call `downloadElementAsImage(...)` with sanitized filename e.g. `${payload.couple.groom}-${payload.couple.bride}-${ev.shortLabel}.png`.

- [ ] **Step 3: Add "Export PDF" button and hidden export deck**
- Add an "Export PDF" action button in the bottom pagination dock alongside `Previous` and `Next`.
- When clicking "Export PDF", render all chapters into an offscreen export container with id `invitation-export-deck`, process each page, attach map hyperlinks, and download `${payload.couple.groom}-${payload.couple.bride}-Wedding-Invitation-${payload.guest.guest_name}.pdf`.
- Display a progress spinner or state (e.g., "Exporting PDF (3/8)...") so the user receives live feedback.

- [ ] **Step 4: Verify typecheck and build**
Run: `npm run typecheck && npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 5: Commit**
```bash
git add src/components/GuestInvitationViewer.tsx
git commit -m "feat: integrate download image and export PDF options in invitation viewer"
```

---

### Task 4: End-to-End Verification on `/invite/JARI7M2K`

**Files:**
- Verify: `http://localhost:3000/invite/JARI7M2K`

- [ ] **Step 1: Start Next.js development server if not running**
Run dev server and test `/invite/JARI7M2K`.

- [ ] **Step 2: Test single image download**
Verify that clicking "Download card" downloads a sharp PNG, and that "Click for location" and "Add to calendar" are hidden from the downloaded image.

- [ ] **Step 3: Test multi-page PDF export**
Verify that clicking "Export PDF" downloads a multi-page PDF containing Cover, all 6 ceremonies, and Closing, with "Add to calendar" hidden and "Click for location" links functioning as clickable PDF hyperlinks.

- [ ] **Step 4: Commit any adjustments**
```bash
git commit -m "chore: final verification for invitation image download and PDF export"
```
