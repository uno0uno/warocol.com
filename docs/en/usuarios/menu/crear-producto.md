# Create a product

## What is a product?

A product is what your customers see and can order: it has a name, price, description, and category. It is what appears on your menu.

**Examples:** Margherita Pizza, Classic Burger, Natural Lemonade.

---

## How product composition works

Each product can have warehouse items assigned in three ways — you can use any of them or combine them:

| Option | When to use it |
|--------|----------------|
| **Warehouse items only (direct)** | The product is unique; it does not share its preparation with other dishes |
| **Recipes only** | The preparation is an existing recipe used in several products |
| **Recipes + additional warehouse items** | You have a common base (recipe) plus warehouse items specific to this dish |

> **With recipe** in the wizard: WARO deducts inventory according to the recipe when you sell.
>
> **Direct sale** (resale): sold by piece (`und`); the system creates the stock item and the equivalence in gr or ml.

**When should you create a recipe first?** Only when that preparation is reused in several products. If the dish is unique, add warehouse items directly to the product. → [see recipes guide](./recetas.md)

---

## How to create a product

Go to **Menu → Products → New product**.

The wizard has **4 steps** if you choose **With recipe**, or **3 steps** if you choose **Direct sale** (no recipe step).

### Product tax

If your business uses **commercial taxes** (lines in Invoicing), the product **inherits** the tax from its **menu category**. You can leave it as is, mark it **exempt**, or choose **another line**. That override takes precedence over the category map.

In Colombia with a column-based tax matrix, you still choose Food/Beverage, Liquor, or Exempt.

### Step 1 — Product type

Choose how it is prepared or sold:

| Option | Meaning |
|--------|---------|
| **With recipe** | Kitchen · warehouse items and base recipes; each sale deducts inventory |
| **Direct sale** | Resale · piece (`und`) with equivalence in gr or ml |

### Step 2 — General information

| Field | What to enter | Required |
|-------|---------------|:----------:|
| Product name | The name customers will see. E.g. `Margherita Pizza` | Yes |
| Description | A short description of the dish | No |
| Category | Which group it belongs to (Starters, Main courses, Drinks...) | Yes |
| Sale price | Price in Colombian pesos | Yes |
| Preparation time | How many minutes it takes (only **With recipe**) | No |
| gr/ml equivalence | Weight or volume per sold unit (only **Direct sale**) | Yes |
| Available | If it is active on your menu | — |
| Available for delivery | If it appears in online orders (delivery / pickup) | — |
| Table order (QR) | If it appears on the table QR menu | — |

> If you turn off **Available**, the product does not appear on any menu until you enable it again.
>
> **Table order (QR)** is independent of delivery.

### Step 3 — Recipe (With recipe only)

Here you define what the product is made of:

**Add recipes** — click **+ Add Base Recipe** and search for an existing recipe.

**Add direct warehouse items** — add warehouse items one by one with their quantity.

**If the warehouse item does not exist:** the search shows **+ Create warehouse item** (side panel without leaving the form).

→ [Learn more about custom warehouse items](https://warocol.com/docs/usuarios/compras#artículos de bodega-propios)

You can leave recipes and warehouse items empty when creating; you can complete them later, but cost and inventory deduction will be more accurate with the recipe defined.

### Step 4 — Review and confirmation

Review the summary: name, category, recipe or resale data, and status. If everything looks good, click **Create product**.

---

## Does the product appear on the online menu immediately?

Yes, as long as **Available for delivery** is checked. If you do not check it, the product exists in the system but is not visible to online customers.

---

## Frequently asked questions

**Can I change the price later?**
Yes. Go to **Menu → Products**, open the product, and edit it.

**What if I do not assign recipes or warehouse items (With recipe)?**
The product works for sales, but WARO cannot calculate its cost or deduct warehouse items from inventory automatically until you define the recipe.

**Can I assign several recipes to the same product?**
Yes. You can combine multiple recipes and also add additional warehouse items.

**How do I add modifiers (sizes, extras, sauces)?**
Modifiers are created separately and assigned to one or more products. See [modifiers guide](./modificadores.md).

**How do I add a photo to the product?**
In the general information step, or from the product edit screen after creating it.
