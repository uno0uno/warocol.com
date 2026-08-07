# Operations activity log

The **Operations activity log** is the POS audit trail: who did what, on which channel (table, bar, or counter), when, and — when applicable — with what reason. Owners, administrators, and supervisors use it to review product removals, tab or cart clears, and partial payment voids.

## How to access

Sidebar → **Operations → Activity log**.

You'll see a paginated list of events. At the top you can filter by dates, channel, action type, and search by product name. Click a row to see the technical event detail (useful for support).

> **Permissions:** only users with access to the **Operations** module can open the activity log (typically owner, administrator, and supervisor). Cashiers without that module will not see the tab or be able to consult the history.

---

## What the activity log records (POS)

Each row is an automatic event generated when the team uses the POS after the feature is active for your business.

| Activity log action | What it means |
|----------------------|-----------------|
| **Product added to tab** | An item was added to a table or bar tab |
| **Product removed from tab** | An item was removed from the tab (table/bar) |
| **Quantity changed** | The quantity of an item in the tab was changed |
| **Tab cleared** | The tab for a table or bar session was cleared |
| **Cart line removed** | A product was removed from the counter or bar cart |
| **Cart cleared** | The entire cart was cleared |
| **Payment voided** | A partial payment already recorded at checkout was voided |

On each event you'll see, among other data:

- **When** — date and time
- **User** — who performed the action in the system
- **Channel** — Table, Bar, or Counter
- **Summary** — product and quantity, or voided payment details
- **Table** — table name when applicable
- **Reason** — text captured in the POS (see policies below)
- **Order** — link to the sale when one exists

---

## What it does not record

| Situation | Why it does not appear |
|-----------|------------------------|
| Products in the cart **before sending them to the tab** or before the cart is synced with the server | Only actions that reach the server are audited |
| Actions **before the activity log was deployed** for your business | Recording starts when the feature goes live in production; it does not backfill the past |
| Voiding a **complete sale** from Sales → Orders | That is a different flow; not the same as voiding a partial payment at checkout |
| Price changes, discounts, or menu configuration | Outside the POS MVP scope |

If the list is empty right after enabling the feature, that is normal: events appear when staff start operating with the version that includes the activity log.

---

## How to filter

| Filter | Purpose |
|--------|---------|
| **Date range** | Limits the period (calendar with shortcuts such as Today, Last week, etc.) |
| **Channel** | Table only, Bar only, Counter only, or all |
| **Action** | A specific type (e.g. only "Payment voided" or "Product removed from tab") |
| **Search product** | Free text on the summary (product name in the payload) |

Use **Clear** to remove all filters. The list updates when you change filters or use the panel header refresh button.

---

## Reason policies

### Product already sent to kitchen (table or bar)

If **tickets** are active and the product **already went to the kitchen** (no longer in "new" status), removing it from the tab requires a **mandatory reason** before confirming. That text is stored in the activity log **Reason** column and the kitchen still sees the voided line on the KDS.

If the product **has not been sent to the kitchen yet**, you can remove it without entering a reason.

### Voiding a partial payment

At **checkout**, when removing a payment already recorded (trash icon on partial payment), you can enter an optional reason. If left blank, the system records **"No reason"** in the activity log.

> If the payment was **cash**, the POS reminds you to return the physical money to the customer before confirming. See [Partial payment](../pos#cobro-parcial-split) in the POS guide.

---

## Event detail

Click any row (or card on mobile) to open the detail. There you'll see the full **reason**, the **order** link if one exists, and the **payload** in technical format (JSON) with all data the system stored — useful if support needs to investigate a case.

---

## Related screens

| You need… | Go to… |
|-----------|--------|
| Configure tables, tickets, or tips | [Operations](../operaciones) |
| How to void a payment or remove a product in POS | [Process a sale in the POS](../pos) |
| Sales history and voiding a complete order | [Sales](../ventas) |
| Discarded DIAN billing numbers | [Billing — Burned numbers log](../facturacion#bitácora-de-números-quemados) (a separate log) |

---

## Frequently asked questions — Activity log

**Does the activity log replace cameras or cash drawer counts?**
No. It is a log of sensitive POS actions, not video or a cash close.

**Can the cashier see the reason the manager entered?**
Only if their role has access to **Operations**. Most cashiers do not see the activity log.

**Can I export to Excel?**
There is no export from the screen in the MVP; use filters and pagination to review by period.

**Why don't I see yesterday's events if we were already using WARO?**
Recording started when your business had the version that includes the activity log; it does not reconstruct prior history.

**Is removing a product from the counter cart always recorded?**
Yes, when the cart is synced with the server. Changes only in the local cart, before the system saves them, do not generate an event.
