# Tips history

From **Sales → Tips** you can view all orders that collected a tip, with their metrics and dedicated filters.

## How to access

Sidebar → **Sales** → **Tips** tab (`/ventas/propinas`).

> If tips are not enabled in **Operations → Tips**, this screen shows an empty state with a button to open settings.

---

## Period metrics

Three cards at the top, calculated from the active date range and filters:

| Metric | What it shows |
|--------|---------------|
| **Total tips** | Sum of tips collected in the period |
| **Average over sale** | Average tip percentage relative to the subtotal of orders with a tip |
| **Orders with tip** | How many orders recorded a tip |

---

## Filters

| Filter | Options |
|--------|---------|
| Search | Order number |
| Date range | Today · Yesterday · Last week · 15 days · 30 days · 90 days or custom |
| Waiter | Filter by the attributed waiter |
| Channel | POS · Table · Online |
| Payment method | Select a group or a specific method |

Use **Clear filters** to return to the initial state (last 30 days, no restrictions).

---

## Orders with tip table

Each row shows:

- Order **Date**
- **Order** — clickable number that opens the detail at `/ventas/{id}`
- **Channel** — badge with POS, Table, Bar, or Online
- Sale **Subtotal**
- **Tip** collected
- **%** of the subtotal
- **Waiter** — click to refilter the table by that waiter
- **Payment method**

You can sort by date, order, subtotal, tip, or payment method. The table paginates 25 at a time.

---

## Export

The **Export** button sends a report by email with all orders with a tip for the period and active filters. The system shows a modal when the send is processed.

---

## Arrive pre-filtered from other sections

- From **Analytics → Sales**, the "Tips for the period" card opens this screen with the dashboard date range already applied.
- From **Team → Members → View profile**, that waiter's tips open the history pre-filtered by their name.

---

## Configure tips?

Settings (enable/disable, suggested percentages, pre-selection) live in **Operations → Tips**. This screen is read-only: a history for analysis and reconciliation.
