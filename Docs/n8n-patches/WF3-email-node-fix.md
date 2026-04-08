# WF3 — Intercompany Processor Fixes

## Bug Fix: Email node references wrong node name

**Node**: "Email — Yannett + Emilka (Confirmacion)"

### Problem
The `subject` and `message` fields reference `$('Prepare Final Update1')` — this node doesn't exist.
The correct name is `$('Prepare Final Update')` (without the "1" suffix).

### Fix
In the Email node, replace ALL occurrences of:
```
$('Prepare Final Update1')
```
with:
```
$('Prepare Final Update')
```

This appears in:
- `subject` field
- `message` field (multiple times in the HTML template)

## Validation: Add IF node after "Odoo - Get SOMX"

Add an IF node between "Odoo - Get SOMX" and "Odoo - Get SOMX Lines":
- Condition: `{{ $json.id }}` is not empty (EXISTS check)
- TRUE path → continues to "Odoo - Get SOMX Lines"
- FALSE path → new Code node "Handle SOMX Error" that updates Sheet status to ERROR:

```javascript
const original = $('Filter Approved').first().json;
return [{ json: {
  somx_name: original.somx_name,
  status: 'ERROR',
  oc_number: '',
  processed_at: new Date().toISOString(),
  error_reason: 'Sales Order not found in Odoo or invalid state'
}}];
```
Then connect to "Sheets - Update Status" to write the error.

## Price Alert: Add Code node after "Odoo - Get SOMX Lines"

Add before "Odoo - Create OC":

```javascript
const allLines = $('Odoo - Get SOMX Lines').all().filter(i => i.json.id);
const lines = allLines.filter(i => i.json.product_id && i.json.product_uom_qty > 0);

let priceAlerts = [];
for (const line of lines) {
  // Compare price_unit vs a reference (list_price from product if available)
  // For now, flag if price_unit is 0 or negative
  if (line.json.price_unit <= 0) {
    priceAlerts.push({
      product: line.json.product_id ? line.json.product_id[1] : 'Unknown',
      price_unit: line.json.price_unit,
      alert: 'ZERO_OR_NEGATIVE_PRICE'
    });
  }
}

// Pass through with alert flag
return [{
  json: {
    has_price_alerts: priceAlerts.length > 0,
    price_alerts: priceAlerts,
    price_alert_summary: priceAlerts.length > 0
      ? priceAlerts.map(a => a.product + ': $' + a.price_unit + ' (' + a.alert + ')').join(' | ')
      : ''
  }
}];
```

Then include `price_alert_summary` in the HubSpot Note body if `has_price_alerts` is true.
