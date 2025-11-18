# Steel Web App (Pure Web Version)

## Overview
A pure web version of the steel management app, originally packaged with Capacitor, now fully browser-based. It manages steel components across planning, receiving, usage, progress visualization, reporting and backup. All data is stored in localStorage. All exports use browser Blob + a.download. Pages navigate via location.href.

## Files
- index.html : Main dashboard (progress rings, quick actions, backups)
- library.html : Components library listing
- manage.html : Component management (search/list/edit)
- planned.html : Planned receiving registration
- confirm.html : Receiving confirmation and daily Excel export
- progress.html : Progress overview
- report.html : Reporting (Excel/CSV export, preview)
- styles.css : Shared UI styles (cards, buttons, progress rings, tables)
- back.js : Shared web utilities, data layer, export helpers, Excel preview
  - getJSON / setJSON
  - keyOf / thousand
  - buildStatusMaps / buildSummaryRows
  - buildExcelFromRows / buildCSVFromRows
  - showExcelPreview / saveBlobWithPicker (web-only)
  - db_read / db_write (localStorage via JSON)
  - remote_get / remote_insert / remote_update (reserved, not implemented)

## Deployment (GitHub Pages)
1. Upload all files to repository root (same level paths, no subfolders required)
2. Go to Settings → Pages
3. Select branch: main, folder: root
4. Save and wait for deployment (1–3 minutes)

## Usage
- Desktop (Chrome/Edge/Firefox/Safari): open index.html; operations run entirely in browser. Exports download to your browser Downloads folder.
- Mobile (Android/iOS): open the deployed URL; localStorage persists data; Excel/CSV export uses browser download.

## Notes
- No Capacitor/native plugins. All exports use Blob + a.download.
- Navigation uses location.href.
- Data is stored in localStorage via db_read/db_write, with remote_* hooks reserved.
- Excel preview uses SheetJS via CDN.

## Future Expansion
Supabase hooks reserved in back.js:
- remote_get(table)
- remote_insert(table, row)
- remote_update(table, id, patch)

Set `USE_REMOTE_DB = true` and implement these functions to switch from localStorage to Supabase.