# Modifiers

## What is a modifier?

A modifier is an additional option the customer can choose when ordering a product. Options are grouped in what is called a **modifier group**.

**Examples:**
- Group "Size" → options: Personal, Medium, Large
- Group "Sauce" → options: BBQ, Pink sauce, Spicy
- Group "Without..." → options: No onion, No tomato, No lettuce
- Group "Extras" → options: Extra cheese (+$2,000), Bacon (+$3,000)

Each group is assigned to one or more products. When a customer orders that product, they see the group options to customize their order.

---

## Key concepts before you start

**Group:** the name of the option category (e.g. "Size").

**Modifiers:** each option within the group (e.g. "Personal", "Medium", "Large"). Each can have an additional price or be free.

**Required vs. optional:** if the group is required, the customer cannot order the product without choosing at least one option. If optional, they can skip it.

**Minimum and maximum selection:** how many options the customer can/must choose.
- Min 0, Max 1 → the customer can choose one option or none
- Min 1, Max 1 → the customer must choose exactly one option
- Min 0, Max 3 → the customer can choose up to 3 options (such as extras)

---

## How to create a modifier group

Go to **Menu → Modifiers → New group**.

The form has 3 steps:

### Step 1 — Group information

| Field | What to enter | Required |
|-------|---------------|:----------:|
| Products | The products this group applies to | Yes |
| Group name | What the customer sees. E.g. `Size`, `Extras`, `Sauce` | Yes |
| Minimum selection | Minimum number of options the customer must choose | Yes |
| Maximum selection | Maximum number of options the customer can choose | Yes |
| Display order | If you have several groups, which appears first (lower number = first) | No |
| Required | Whether the customer must choose before ordering | — |

> **Tip:** For a size group where the customer must pick one, set Min: 1 and Max: 1, and mark it as required.

### Step 2 — Group options (modifiers)

Here you add each available option. For each one you define:

| Field | What to enter |
|-------|---------------|
| **Type** | How inventory is deducted when sold (see table below) |
| Name | The option name. E.g. `Large`, `BBQ`, `Extra cheese` |
| Additional price | How much it adds to the base price. If free, enter 0. |
| Max / Order | Maximum quantity per line and display order |

Click **+ Add Modifier** to add more options.

#### Option types (composition and inventory)

| Type on screen | When to use it | What you configure | Inventory when sold |
|----------------|----------------|-------------------|---------------------|
| **Warehouse item** | A catalog supply without a linked menu product (raw material, supply, service) | Warehouse item + quantity + unit; you can also **add options by category** | That warehouse item × modifier quantity × product quantity is deducted |
| **Resale** | A resale product (linked 1:1 to a warehouse item) | Resale product + quantity + unit | The warehouse item linked to the product is deducted |
| **Base recipe** | Several raw materials per an existing preparation | Base recipe + multiplier (quantity × recipe) | **All** warehouse items in the recipe are deducted, scaled by the multiplier |
| **Menu product** | The option consumes another menu product's composition (dish with recipe, not resale) | Menu product + multiplier | That product's recipe/composition is deducted (as if selling one portion) |
| **Price only** | Extra with no warehouse impact (e.g. packaging, service, "no ice") | Name and price only | **Does not** move inventory; only adds to the sale total |

> **Resale vs warehouse item:** both deduct inventory via a **warehouse item**. With resale you choose the **menu product** and WARO resolves the linked item (1 und). With warehouse item you choose directly from the catalog (no associated product).

If a warehouse item does not appear in search, use **+ Create warehouse item** in the side panel (Name, Measure type, and Category required).

→ [Learn more about custom warehouse items](/docs/usuarios/abastecimiento#catálogo-de-bodega)

### Step 3 — Review

Review the summary and click **Create group**.

---

## When does the modifier add to the price?

When the customer chooses an option with an additional price, that amount is automatically added to the product price at checkout (includes POS, tables, and online orders).

---

## Inventory and costs when selling

- The modifier **sale price** is always stored on the order (what you charged).
- **Warehouse deduction** depends on the option **type**: warehouse item, resale, base recipe, or menu product deduct according to their composition; **Price only** deducts nothing.
- If you edit a sale and **remove** a modifier, WARO returns to inventory the supplies that were deducted for that option.
- Food cost / accounting close costs use the exploded supply detail for each modifier (not just one warehouse item when the option is base recipe or menu product).

---

## Frequently asked questions

**Can I assign a group to several products?**
Yes. When creating the group, select all products that need it.

**Can I edit options after creating the group?**
Yes. Go to **Menu → Modifiers**, open the group, and edit it.

**What if I do not add any options in step 2?**
The group is created empty. Customers will see nothing to select. Add them later from the edit screen.

**Can the customer order a product without choosing a required modifier?**
No. If the group is required, the **Add to cart** button stays disabled until the customer chooses.

**Can I mix types in the same group?**
Yes. For example: sizes with **Price only**, extras with **Warehouse item** or **Resale**, and a combo with **Base recipe**.

**Does the customer choose the option type?**
No. You configure the type only in administration; at checkout the customer sees name and price.
