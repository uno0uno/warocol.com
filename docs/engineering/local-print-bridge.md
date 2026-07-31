# Local print bridge (PrintBridge) — replaces QZ Tray

WARO talks to thermal / receipt printers through **[PrintBridge](https://github.com/vergil-lai/print-bridge)** on the cashier machine (Mac, Windows, Linux). The browser never sends jobs through QZ Tray.

## Install PrintBridge (each POS / caja PC)

1. Download from Operaciones → Impresoras → **Download PrintBridge** (modal with Windows / macOS / Linux), or from [PrintBridge releases](https://github.com/vergil-lai/print-bridge/releases)
2. Install and start **PrintBridge** (tray icon running)
3. In PrintBridge settings:
   - Choose default printer (optional)
   - **Website whitelist** — add:
     - `https://warocol.com`
     - `https://www.warocol.com` (if used)
     - `http://localhost:8080` (local Nuxt)
     - `http://127.0.0.1:8080` (local Nuxt)
4. Open WARO on the **same computer**
5. Go to **Operaciones → Impresoras** → Detectar → assign caja / stations → Guardar → test icon

Silent print works because the origin is whitelisted (no per-job Allow dialog / no QZ subscription).

### OS notes

| OS | Notes |
|---|---|
| macOS | Use the **exact** printer name returned by Detectar |
| Windows | Prefer RAW/ESC-POS capable queue for thermals |
| Linux | CUPS queue name; thermal as raw/ESC-POS |

## Dev harness

With `nuxt dev` running and PrintBridge up:

1. Open `/dev/print-bridge`
2. **Connect** → Connected
3. **List printers** → note exact names
4. Select a thermal → **Print ESC/POS test**

Expected: short ticket `WARO print bridge OK`.

If PrintBridge is stopped: explicit error/toast — POS still falls back to `window.print` where wired.

## Front API

`composables/useLocalPrintBridge.ts` (SDK: `print-bridge-sdk`):

- `connect()` / `isAvailable()`
- `listPrinters()` → `string[]`
- `printRawEscPos(printerName, bytes | string)`
- `printEscPosTestTicket(printerName)`
- `printHtml(printerName, html)` → `raw-html` job (~58mm; needs local Chromium — prefer raw for POS tickets)
- POS/caja/station tickets use `printRawEscPos` via `utils/escPosTicket` (no Chromium)

Default agent: `ws://127.0.0.1:17890/ws`

## Verification checklist

- [ ] Mac: connect + list + ESC/POS test + HTML ticket
- [ ] Windows: same
- [ ] Agent stopped: error shown; browser print fallback still works
- [ ] Unit tests: `bun test composables/useLocalPrintBridge.test.ts`

## Provisioning (restaurants)

Install PrintBridge once per caja PC during onboarding. Whitelist WARO origins. Re-run **Detectar** after install so saved names match the OS/agent.
