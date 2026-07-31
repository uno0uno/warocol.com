# Local print bridge (QZ Tray) — warocol.com#1948

WARO talks to thermal / receipt printers through **QZ Tray** on the cashier machine (Mac, Windows, Linux). The browser never sends PostScript/PDF to a raw ESC/POS queue.

## Install QZ Tray

1. Download from [https://qz.io/download/](https://qz.io/download/)
2. Install and start **QZ Tray** (tray icon running)
3. Open WARO in Chrome/Edge/Firefox on the **same computer**
4. When prompted, allow the WARO site to connect (unsigned prompts are OK for lab/dev; production silent print needs site certificate signing later)

### OS notes

| OS | Notes |
|---|---|
| macOS | Printer names from QZ/`find()` may differ from System Settings (e.g. spaces → underscores). Always copy the **exact** name returned by the harness. |
| Windows | Use the printer name shown in Windows Settings → Printers; prefer a RAW/ESC-POS capable queue for thermals. |
| Linux | CUPS queue name is what QZ usually lists; configure thermal as raw/ESC-POS, not Generic PostScript. |

## Dev harness

With `nuxt dev` running:

1. Open `/dev/print-bridge`
2. **Connect** → should say Connected (QZ Tray must be running)
3. **List printers** → note exact names
4. Select a thermal printer → **Print ESC/POS test**

Expected: short ticket text `WARO print bridge OK` (paper orientation: thermal side toward the print head).

If QZ is stopped: explicit error/toast — **`window.print` is not used**.

## Front API (for later batches)

`composables/useLocalPrintBridge.ts`:

- `connect()` / `isAvailable()`
- `listPrinters()` → `string[]` (stable key = exact name)
- `printRawEscPos(printerName, bytes | string)`
- `printEscPosTestTicket(printerName)`

## Verification checklist (PR)

- [ ] Mac: connect + list + ESC/POS test
- [ ] Windows **or** Linux: connect + list + ESC/POS test
- [ ] QZ stopped: error shown; browser print elsewhere still works
- [ ] Unit tests: `bun test composables/useLocalPrintBridge.test.ts`

## Out of scope here

Printer assignment UI (`/operaciones/impresoras`), POS/comanda wiring — epic batches #1949–#1951.
