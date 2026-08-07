# Tables

Table management lets you organize your restaurant floor directly from the POS. When active, the point of sale shows the floor plan and each table has its own order session.

## How to access

Sidebar → **Operations → Tables**. From here you can:

- Enable or disable the tables module for the POS
- Enable **order by table QR** and manage each table's QR link
- View the list of configured tables with their current status and, when applicable, the assigned waiter
- Create, edit, deactivate, and reactivate tables

> The module label is configurable. Some businesses call it "Cubicles" (salons), "Rooms" (hotels), "Lanes" (events), etc. Configure it under **Operations → Customize**. This guide uses "Table" as the generic term.

---

## Enable the tables module

At the top of the page you'll see the **Tables management** toggle.

- **Enabled** — the POS shows the floor plan when it opens and each table has its own order session.
- **Disabled** — the POS operates in counter mode only.

> The change is reflected in the POS instantly. If you have an open register session, reload the POS tab to see the change.

---

## Configure tables

### Create a table

Click **+ New table**. Enter:

| Field | Description |
|-------|-------------|
| Name | Table identifier (e.g. "Table 1", "Terrace A") |
| Capacity | Number of guests it can seat (optional) |

### Edit a table

Click the edit icon next to the table you want to modify. You can change the name and capacity.

### Deactivate a table

Click the deactivate icon. WARO will ask for confirmation before proceeding.

You cannot deactivate a table that has an open session. Close the order from the POS first.

### Reactivate a deactivated table

Deactivated tables are not deleted: they remain in a separate list in case you need them later. To reactivate:

1. Filter the list by **Deactivated** (or expand the "Inactive tables" section).
2. Tap the reactivate icon on the corresponding table.
3. Confirm — the table appears on the floor plan immediately.

---

## Table statuses

| Status | Meaning |
|--------|---------|
| **Free** | No active order, available to serve |
| **Occupied** | Has an order in progress |
| **Bill requested** | The customer asked to close the check |

---

## Waiter column (optional)

If your business has **waiter attribution** enabled (under **Operations → Tips**), an extra column shows the effective waiter for each table's current session. This makes it easy to see who is serving each table before collecting payment.

---

## Order by table QR

Lets diners order from their phone by scanning a code at the table. The order **does not enter the POS or kitchen** until staff **accept** it under **Dispatch → Table orders (QR)**.

### Requirements

1. **Tables management** active (top toggle on this page).
2. **Order by table QR** active (second toggle in the modules block).
3. Each table with QR **enabled** and a generated link.
4. Products with **Table order (QR)** checked under **Menu → Products** (independent of delivery).

### Enable the QR module

In the same modules block, below **Tables management**, you'll see **Order by table QR**.

- **Enabled** — you can enable QR per table and customers can submit orders pending confirmation.
- **Disabled** — QR controls are not shown in the list or table panel.

### QR per table

With the QR module active, each table has controls for:

| Action | Purpose |
|--------|---------|
| Enable QR on this table | Generates that table's public link |
| **Copy link** | Paste in WhatsApp or wherever you share the menu |
| **Download PNG** | QR code image to print for the table |
| **Regenerate link** | Invalidates the previous QR and creates a new one (reprint if you already distributed codes) |

The link looks like `https://warocol.com/{your-business}/mesa/{code}` and **remains stable** until you use **Regenerate link**.

On desktop you'll also see a **QR** column in the table list with quick access to copy and download.

### What the customer does

1. Scans the QR or opens the link.
2. Sees the menu (QR-enabled products only).
3. Builds the order, chooses payment method, and submits.
4. Sees a confirmation message: the restaurant will review the order before preparing it.

### What staff does after

Pending orders appear under **Dispatch → Table orders (QR)** as a list (one row per order). Click the order to see details and press **Accept order** or **Reject**. When accepted, items are added to that table's tab in the **POS** and, if tickets are active, sent to the kitchen. See [Dispatch](../despacho#pedidos-en-mesa-qr).

The notification bell opens the order **detail** when available; otherwise, the list filtered by that table.

---

## Frequently asked questions

**Where are table orders taken?**
From the **POS**. When you enter with the module active you'll see the floor plan; click a table to open its order session.

**Can I have tables configured without enabling the module?**
Yes. Tables remain saved even when the module is disabled. When you enable it again, all tables appear on the floor plan.

**What happens if I disable the module with occupied tables?**
The toggle changes the POS view, but open sessions are not closed. We recommend closing all orders before disabling the module.

**Is a deactivated table lost forever?**
No. It stays in the inactive tables list and you can reactivate it anytime.

**How is it different from Delivery QR ordering?**
In **Delivery**, the customer orders through the online channel (delivery, pickup, or dine-in) and the order follows statuses like Pending → Confirmed → In preparation. With **table QR ordering**, the customer is physically at a specific table, the menu is only for that table, and the order stays **pending acceptance** under **Dispatch → Table orders (QR)** until staff confirm it.

**Does the URL change if I open Operations → Tables again?**
No. The link is stable unless you use **Regenerate link** on that table.

**What does the customer see after submitting the order?**
A success screen indicating the restaurant will confirm the order. Items **do not** appear in the POS nor are prepared until someone **accepts** them in Dispatch.

**A product doesn't show in the QR menu?**
Check that **Table order (QR)** is enabled under **Menu → Products**, and that the QR module and that table's QR are turned on.
