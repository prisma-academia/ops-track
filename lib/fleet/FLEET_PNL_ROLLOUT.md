# Fleet P&L attribution rollout

## Business policies (fleet configuration)

### Local supplier

- Set supplier type to **Local** under Management → Suppliers.
- Delivery shortages are credited to the **supplier** (`order.supplierShortageLiters`).
- Supplier payable = landed cost × (**litres ordered − credited shortage**). Admin pays only for billable litres.

### Depot supplier

- Set supplier type to **Depot**.
- Delivery shortages are charged to the **transporter** and deducted from the trip **transport fee** (`netTransportFeePaid`).
- If deductions exceed the fee, recover the balance **outside** the fee payment.
- Use **Attribution P&L** so company margin aligns with litres already sold.

### Company loss logs

- Under **System → Settings → Fleet accounting**, choose which incident types reduce company P&L when Attribution P&L is on.
- **Shortage** on deliveries is never company loss — it routes to supplier (Local) or transporter (Depot).
- **New workspaces default to Accident only** as company-absorbed loss; existing tenants keep saved settings until changed.

## Rollout steps

1. Apply migration `20261016120000_supplier_type_loss_attribution` (adds nullable `supplierType`, `supplierShortageLiters`, loss log metadata).
2. Set **Local** or **Depot** on each supplier under **Management → Suppliers** (existing suppliers stay unset until configured).
3. Open **System → Settings → Fleet accounting** and review the three policy sections. Enable **Attribution P&L** when ready to switch reports to sold-litre margin and company-only incident loss.
4. Optionally enable **Require supplier type for new orders** to block orders for untyped suppliers.
5. Do not mass-recompute completed transport fees. Open `IN_TRANSIT` trips reconcile automatically on delivery receive.
