# Products

## What is a product?

A product is what your customers see and can order: it has a name, price, description, and a photo. It is what appears on your menu.

**Examples:** Margherita Pizza, Classic Burger, Natural Lemonade.

---

## Before creating a product

Each product can be linked to a base recipe. The recipe tells WARO which warehouse items that product consumes, which enables cost calculation and inventory control.

If you want that control, create the recipe first. If you only need to register the product for now, you can create it without a recipe and add one later.

**Recommended order:** recipe → product.

---

## How to create a product

Go to **Menu → Products → New product**.

The form has 3 steps:

### Step 1 — General information

| Field | What to enter | Required |
|-------|---------------|:----------:|
| Product name | The name customers will see. E.g. `Margherita Pizza` | Yes |
| Description | A short description of the dish | No |
| Category | Which group it belongs to (Starters, Main courses, Drinks...) | Yes |
| Sale price | Price in Colombian pesos | Yes |
| Real cost (system) | Calculated by WARO from the recipe and warehouse item purchases (read-only) | — |
| My dish cost | Operating cost you define for margins and reports; the system does not overwrite it | No |
| Preparation time | How many minutes to prepare | No |
| Available | If it is active on your menu | — |
| Available for delivery | If it appears in online orders (delivery / pickup) | — |
| Table order (QR) | If it appears on the table QR menu (only if the QR module is active in Operations) | — |

> If you turn off **Available**, the product does not appear on any menu until you enable it again.
>
> **Table order (QR)** is independent of delivery: a product can be on table QR without being on delivery, and vice versa.

### Step 2 — Recipe / Warehouse items

Here you link the product to one or more base recipes you already created.

- Click **+ Add Base Recipe**
- Search and select the recipe
- If the product has no recipe yet, you can leave this step empty and continue

### Step 3 — Review and confirmation

Review the summary: name, category, and status. If everything looks good, click **Create product**.

---

## Real cost vs my dish cost

WARO tracks two costs per product:

| Concept | Who defines it | Purpose |
|---------|----------------|---------|
| **Real cost (system)** | WARO, when saving the product with a recipe | Reflects warehouse items and purchase prices; updates if purchases or recipe change |
| **My dish cost** | You, optional | Your operating reference (labor, waste, different supplier, etc.) |

In the list you see **Real margin** (price vs system cost) and **Operating margin** (price vs your cost), when you have set "My dish cost".

If both costs differ significantly, the row is highlighted in amber so you can review whether to adjust your perceived cost or the recipe.

---

## Does the product appear on the online menu immediately?

- **Delivery / online orders:** yes, if **Available for delivery** is checked.
- **Table QR:** yes, if **Table order (QR)** is checked and the business has the QR module active in **Operations → Tables**.

If you do not check either, the product exists in the system but is not visible on those channels.

---

## Frequently asked questions

**Can I change the price later?**
Yes. Go to **Menu → Products**, open the product, and edit it.

**What if I do not assign a recipe?**
The product works for sales, but WARO cannot calculate its cost or deduct warehouse items from inventory automatically.

**Can the same product be in several categories?**
No. Each product belongs to one category. If you need it in more than one place, consider variants or modifiers.

**How do I add a photo to the product?**
From the product edit screen after creating it.

**Why does a product not appear on the table QR menu?**
Check **Table order (QR)** on the product and that the module is active in **Operations → Tables**. See [Tables](../../operaciones/mesas#pedido-por-qr-en-mesa).
