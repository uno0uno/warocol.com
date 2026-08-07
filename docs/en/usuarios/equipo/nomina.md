# Payroll and social benefits

From **Team → Payroll** you manage **Colombian legal social benefits** (Prima, Cesantías, Vacation pay, Work gear, Overtime) and **PILA** payments (social security).

> **Difference from Salaries:** the **Salaries** tab handles monthly **base salary** payments. Payroll is complementary — it handles **legal benefits** and **social security**, which are paid at different frequencies (semiannual, annual, monthly depending on the concept). See [Record salary payment](./registrar-pago).

## How to access

Sidebar → **Team → Payroll**.

---

## Filters

| Filter | Options |
|--------|---------|
| Year | Last 5 years |
| Month | Specific month of the selected year |
| Search | By employee name |

---

## Benefits table

One row per employee, one column per concept:

| Column | What it represents |
|---------|----------------|
| **Service bonus S1** | First-semester service bonus (paid in June) |
| **Service bonus S2** | Second-semester service bonus (paid in December) |
| **Severance** | Annual severance contribution for the employee |
| **Cesantías interest** | Interest on severance (12% annually) |
| **Vacation pay** | Payment for vacation taken |
| **Work gear** | Three payments per year (April, August, December) for employees with salary ≤ 2 SMMLV |
| **Overtime** | Overtime payments for the period |

Each cell shows:

- **Green badge with amount** — the benefit was already paid in that period
- **"Pending"** — the payment has not yet been recorded

### Contract types

- **Employee** — applies to all benefits
- **Day laborer** — applies to benefits except Work gear
- **Contractor** — excluded from this view (managed by fees)

---

## Record benefits

You can select multiple cells at once:

- **Click on a cell** — selects that individual payment
- **Click on a row** — selects all benefits for that employee
- **Click on a column** — selects that concept for all employees
- **Mixed bulk selection** — combine individual cells

When there is an active selection, an **action bar** appears at the top with the total to record and a button to open the side payment panel.

### Side payment panel

| Field | Description |
|-------|-------------|
| Amount | WARO's calculated amount by default; you can adjust it |
| Payment date | Date the disbursement was made |
| Payment method | Transfer, cash, check, etc. |
| Reference | Receipt number (optional) |
| Notes | Additional observation (optional) |

When confirmed, all selected benefits are recorded as paid and the badge turns green.

---

## PILA (Planilla Integrada de Liquidación de Aportes)

The **PILA** section is separated at the bottom of the screen. It is the monthly social security payment (health, pension, occupational risks, parafiscal contributions) covering both the **employee contribution** and the **employer contribution**.

### Pending periods

Lists months with pending social security payment. Each row shows:

- Month and year
- Total to pay (employee + employer contribution)
- Number of employees included

### Record PILA payment

1. Tap the **Record PILA** button on the row.
2. Enter date and payment method.
3. Attach the PILA support document if you have it.
4. Confirm.

### PILA history

Below the pending items appears the list of PILA already paid with their date, amount, and method.

---

## Frequently asked questions

**Does WARO automatically calculate the amount of each benefit?**
Yes, in most cases. The platform uses the employee's configured base salary and Colombian legal percentages to calculate Prima, Cesantías, Interest, Vacation pay, and Work gear. You can always adjust the amount manually before recording the payment.

**What is the difference from Record salary payment?**
"Record payment" in **Salaries** is the disbursement of the current monthly salary. **Payroll** is for legal benefits and social security, which have different frequencies and rules.

**What if I have a contractor?**
Contractors are excluded from this view because they do not generate social benefits. Their payments are handled as **Expenses** (Finance → Expenses) or as an hourly salary scheme as applicable.

**Can I pay benefits for multiple employees at once?**
Yes. Select the column (for example, "Service bonus S1") and all cells for that concept are selected; the payment panel consolidates the total amount.

**How do I know if a PILA month has already been paid?**
If it is in the **history** list and not in **pending**, it has already been recorded. To view the receipt, open the payment detail.
