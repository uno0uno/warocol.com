# Shifts

**Shifts** are reusable schedule templates (name + start and end time) you use when recording a **By template** cash drawer count in Finance. They do not replace staff scheduling or attendance tracking: they only define the time window the cash count will reconcile.

## How to access

Sidebar → **Operations → Shifts**.

At the top you'll see how many shifts are active and inactive. The list shows name, schedule, and status.

> **Permissions:** configuring shifts requires access to the **Operations** module. Recording a count with that template is done under **Finance → Cash drawer** ( **Finance** module). See [Cash drawer](../finanzas#arqueo-de-caja).

---

## Create a shift

Click **+ New shift**. Complete:

| Field | Description |
|-------|-------------|
| **Name** | Visible identifier (e.g. Morning, Afternoon, Night). Required, up to 80 characters. |
| **Start** | Shift start time (24-hour format). |
| **End** | Shift end time. |
| **Crosses midnight** | Enable if the shift ends the next day (e.g. 22:00 – 06:00). |

Confirm with **Create shift**. The shift is **active** immediately and appears in the by-template cash count dropdown.

---

## Edit a shift

Click the pencil icon next to the shift. You can change the name, times, and **Crosses midnight**. Save with **Save changes**.

**Already recorded** cash counts keep the name label they had at close time; changing the template does not rewrite history.

---

## Deactivate and reactivate

- **Deactivate** — the shift no longer appears when creating a new cash count, but stays visible in the list as inactive. Past counts that used it are not modified.
- **Reactivate** — it becomes available again under Finance → Cash drawer → **By template**.

Shifts are not deleted from the interface; deactivating is how you retire one you no longer use.

---

## Relationship with cash drawer counts

| Action | Where |
|--------|--------|
| Define templates (Morning, Afternoon…) | **Operations → Shifts** |
| Close register with a template | **Finance → Cash drawer → By template** |
| Close with manual hours without a template | **Finance → Cash drawer → Custom window** |
| Close the full calendar day | **Finance → Cash drawer → Full day** |

When counting by template you choose the **shift** and **day**; times are filled from the template. You can record several counts the same day if the windows **do not overlap** (for example Morning and Afternoon). See the *Several counts the same day* section in [Cash drawer](../finanzas#arqueo-de-caja).

---

## Frequently asked questions — Shifts

**Do shifts control who can charge in the POS?**
No. They only define time windows for cash drawer counts.

**Can I have two templates with the same schedule?**
Yes, if the names are different (e.g. "Morning dining room" and "Morning terrace"). When counting you choose which one applies.

**I deactivated a shift and it no longer appears when counting. What should I do?**
Reactivate it from the circular arrow icon in the list, or create a new template.

**Night shift that spans two days?**
Enable **Crosses midnight** when creating or editing the template (e.g. 22:00 – 06:00).
