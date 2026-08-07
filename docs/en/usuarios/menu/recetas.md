# Recipes

## What is a recipe?

A recipe is a **reusable composition of warehouse items** that you can assign to one or more products. It helps you avoid repeating the same list of warehouse items on every product.

**Practical example:** You have a house sauce used in 5 different dishes. Instead of adding the same 6 warehouse items to each product, you create a recipe called "House Sauce" with those warehouse items and link it to all 5 products. If you change the recipe, the change applies to every product that uses it.

Customers do not see recipes. They are internal: they control costs and automatically deduct warehouse items from inventory.

---

## When to use recipes

Recipes are **optional**. A product can have:

| Configuration | When to use it |
|---------------|----------------|
| Warehouse items only (direct) | The product is simple and unique — no other dish uses those warehouse items in that combination |
| Recipes only | The preparation is shared with other products |
| Recipes + additional warehouse items | You have a common base (recipe) plus warehouse items specific to this dish |

> If a product is unique and simple, add warehouse items directly without creating a recipe. Recipes are valuable when they are **reused**.

---

## How to create a recipe

Go to **Menu → Recipes → New base recipe**.

The form has 3 steps:

### Step 1 — General information

| Field | What to enter |
|-------|---------------|
| Name | The internal name of the recipe. E.g. `House Sauce`, `Meat Base`, `Pizza Dough` |
| Status | Active or Inactive. Set it active if you are already using it. |

> The name is for internal use. Use names that describe the preparation, not the final product.

### Step 2 — Warehouse items

Here you add each warehouse item with its quantity.

- Search for the warehouse item by name in the search box
- Enter the quantity and unit (grams, milliliters, units, etc.)
- Repeat for each warehouse item

**If the warehouse item does not exist:** the search shows the option **+ Create warehouse item**. Click it to open a side panel without leaving the form.

When creating the warehouse item from here you must complete:

| Field | Required | Notes |
|-------|:----------:|-------|
| Name | Yes | E.g. `Special Angus beef` |
| Measure type | Yes | Weight (gr/kg), Volume (ml/lt), or Piece (und). Defined only at creation — it cannot be changed later. |
| Category | Yes | E.g. `Meats`, `Sauces`, `Dairy` |

Purchase units are generated automatically based on the measure type. When you save the warehouse item, it is immediately available to select in the recipe.

→ [Learn more about custom warehouse items](https://warocol.com/docs/usuarios/compras#artículos de bodega-propios)

### Step 3 — Review and confirmation

Review the summary: name, number of warehouse items, and status. If everything looks good, click **Create recipe**.

---

## Can I edit a recipe later?

Yes. Go to **Menu → Recipes**, find the recipe, and click it to edit. The change applies to all products that use it going forward — already recorded orders are not affected.

---

## Frequently asked questions

**Is a recipe required to create a product?**
No. You can create a product with direct warehouse items, without any recipe.

**Can a product have several recipes?**
Yes. You can assign more than one recipe to the same product, and also add additional warehouse items outside those recipes.

**Can I have two recipes with the same name?**
Yes, the system allows it, but it is not recommended. Use descriptive names so you do not get confused.

**What happens if I change the warehouse items in a recipe?**
The change applies going forward to all products that use that recipe. Sales already recorded do not change.
