# Track A — Meeting Gap Analysis
**Meetings:** KAS Workcenter Review (Mar 30) + Tracking System Review (Mar 31, 2026)
**Attendees:** Marlen Martinez (SC), Alejandra Alvarez (KAS Lead), Yannett Yeomans (Logistics)
**Crossed against:** Live n8n workflow audit (Apr 24, 2026)

---

## TL;DR — What Was Promised vs What Exists

| # | Commitment made in meeting | Built? | Gap |
|---|---------------------------|--------|-----|
| 1 | Price alerts appear IN Odoo during quoting | ❌ No | SC Alert node is a TODO stub — no Odoo activity created |
| 2 | Info visible as tab/section in Odoo | ❌ No | Only HubSpot properties updated; no Odoo-side display |
| 3 | Info card in HubSpot deal overview (center) | ⚠️ Partial | Properties exist but no custom card configured |
| 4 | Email approve/deny for Yannett | ❌ No | Approval is via Google Sheets column change — Yannett doesn't know this |
| 5 | Yannett gets no HubSpot notifications | ❌ Broken | WF3 creates HubSpot tasks Yannett will never see |
| 6 | Notifications to Yannett AND Emilka | ⚠️ Partial | Gmail node exists but credential not configured |
| 7 | Tracking system shows split shipments | ❌ No | Tracking system not built yet |
| 8 | Logistics adds customs/import time estimate | ❌ No | New feature, not started |
| 9 | Logistics reviews tracker before Sales sees it | ❌ No | No gating mechanism |
| 10 | Per-product stock/price lookup | ❌ Broken | Branch B fetches all stock with no product filter |
| 11 | Simplify last price date display | ❌ No | Raw date field, no formatting |
| 12 | Open POs visible per deal | ⚠️ Queried | PO data fetched in Branch B but not displayed clearly |

---

## Meeting 1: KAS Workcenter (Marlen + Alejandra)

### What they asked for

**1. Price alerts MUST be in Odoo, not HubSpot**
> *"Esa alerta sería de mayor utilidad si está brincando el momento en que estamos haciendo esa cotización"*
> — Marlen Martinez

The team generates quotations in Odoo. When a part has no price history, the alert needs to fire as an Odoo activity (internal note or chatter message on the quotation), not a HubSpot task.
A HubSpot notification is useless at quote time because nobody is looking at HubSpot.

**Current state:** `Update Deal + Alert SC` node has a sticky note: "TODO: Add Slack or Email node". There is no Odoo activity creation. The alert currently does nothing.

**Fix needed:**
- When `needs_supply_chain_alert = true`, create an Odoo chatter note/activity on the SO (`mail.activity.create` or `mail.message.post` on `sale.order`, id = odoo_so_id) addressed to Marlen + Alexis
- Also send an email as fallback
- The note should list specifically WHICH products have no price (per-product analysis from the comment lines)

---

**2. Odoo tab showing KAS data**
> *"Sería muy práctico tenerlo con propiedades... una pestañita adicional en Odoo donde tienen la orden"*
> — Alejandra Alvarez

The team wants the stock/price/classification data to appear inside the Odoo SO as a tab (like "Other Information"). Since Odoo doesn't natively allow custom tabs via API, the practical implementation is:
- A formatted **internal note/chatter message** on the SO each time Branch B runs
- OR an Odoo custom field group written via API

**Current state:** WF1 only writes to HubSpot custom properties. Nothing goes to Odoo as visible data.

**Fix needed:**
- After `Consolidate Lookup` completes, POST a formatted chatter message to the SO in Odoo
- Format: KAS Classification | Stock: X/Y products | Last Price: $X (SO name, date) | In Transit: N | Alert: [product list if any]

---

**3. HubSpot card in deal overview (center section)**
> *"En Hotspot tener una card... en la parte de medio"*
> — Alejandra Alvarez

The card should appear in the center column of the HubSpot deal. This requires creating a **CRM Card** via HubSpot's UI Extensibility or using existing custom properties surfaced through a "Property" card in the deal layout.

**Current state:** Custom properties `kas_stock_available`, `kas_last_price`, `kas_lookup_summary` exist in HubSpot but are in the backend only. Not visible in the deal UI.

**Fix needed:**
- In HubSpot Settings → Properties → Pin these properties to the deal overview card
- OR (if more control needed) configure a Custom Card via HubSpot's developer settings
- This is a **HubSpot UI config task**, not a workflow code task — Juan needs to do this in HubSpot settings

---

**4. Renewal classification criteria confirmed**
Marlen confirmed 2-3 criteria are enough for commission pre-filtering:
- Client has purchased before (history in Odoo)
- Buying same part

New part for existing partner = **New Opportunity** (not renewal). This is already correctly implemented in WF1 Branch A. ✅ No change needed.

---

**5. Gradual migration — show data in Odoo while HubSpot is not primary tool**
> *"Si lo hacemos de manera gradual me ayuda mucho más... desde donde estamos generando la cotización que es ODO"*
> — Marlen Martinez

Agreement: data should appear in Odoo NOW, with HubSpot as the final destination once helpdesk migration is complete. This reinforces gaps #1 and #2 above.

---

**6. Simplify last price date format**
> *"Lo puedo simplificar para que sea mucho más fácil de leer"* — Juan

The `kas_lookup_summary` text and the last price display should show something like:
`$1,440.98 · SO19167 · Apr 23, 2026` instead of raw ISO timestamps.

**Fix needed:** Format the date in `Consolidate Lookup` Code node as human-readable before writing to HubSpot and Odoo.

---

**7. Open POs tracking**
Marlen's original KAS Workcenter Excel had an open POs column. Juan offered to add this.

**Current state:** Branch B already fetches `purchase.order` with state=purchase for the partner. But the data is only used to check `needs_supply_chain_alert`. It's not surfaced in the summary.

**Fix needed:** Include open PO count + total value in `kas_lookup_summary` output. Example: `POs abiertas: 2 ($12,400)`.

---

## Meeting 2: Tracking System Review (Yannett + Alejandra)

### What they asked for

**8. Yannett does NOT use HubSpot — all notifications via email**
> *"La verdad yo no utilizo Hotspot, entonces si tendría que ser al correo"*
> — Yannett Yeomans

**Current state in WF3:**
- Creates a HubSpot Task for Alexis (owner 79428823) → Alexis will see it ✅
- Creates a HubSpot Note on the deal ✅
- Has a Gmail node for Yannett + Emilka BUT credential is not configured ❌
- The Google Sheets "APPROVED" trigger means Yannett has to find the sheet and change a cell — she has no idea this is the mechanism

**Fix needed:**
- Configure the Gmail credential in WF3 `Email — Yannett + Emilka` node
- Rethink the approval flow (see #9 below)
- Remove/redirect the HubSpot task creation for Yannett's approval — send email instead

---

**9. Email-based approve/deny (not Google Sheets)**
> *"Tú le das en aprobar y todo lo hace en el backend"*
> — Juan (promising Yannett an email button)

**Critical mismatch:** Juan promised Yannett an **email with approve/deny buttons**. The actual implementation uses a Google Sheets status column. Yannett doesn't know she's supposed to open a spreadsheet and type "APPROVED".

**Fix needed:** Two options:
- **Option A (simpler):** Send the approval email with a link to the Google Sheet pre-filtered to the row, with clear instructions to change the status column
- **Option B (proper):** Replace Google Sheets approval with an n8n webhook-based email approval: email contains a link like `https://juansesn8n.duckdns.org/webhook/approve?somx=SOMX00797&token=xxx` — clicking it triggers WF3 directly without needing to touch the spreadsheet

Option B is the right long-term solution. Option A is the quick fix.

---

**10. Notifications go to Yannett AND Emilka — for BOTH price alerts AND approvals**
> *"Sería a mí y a Emilka"* — Yannett

Confirmed recipients:
- `yannett@dynaproco.com` — intercompany approval + price alerts
- `emilka.guerra@dynaproequipment.com` — intercompany confirmation (already in WF3 Gmail node)

**Fix needed:**
- WF3 Gmail node: add both recipients ✅ (already in the template)
- WF1 Branch B SC Alert: send to Yannett + Emilka as well (currently only mentions Alexis + Marlen in TODO note)
- Clarify: Marlen gets price alerts (quoting team), Yannett + Emilka get intercompany approval + stock alerts

---

**11. No HubSpot line items — product info comes from Odoo SO only**
> *"Actualmente no tenemos line items en HubSpot... únicamente pasa por ODU"*
> — Alejandra Alvarez

**Confirms the Branch B fix from our audit:** WF1 must read SO lines from Odoo using `odoo_so_id` (numeric record ID). It cannot rely on HubSpot line items. This was already identified as a critical fix. Meeting confirms it is 100% necessary.

---

**12. Tracking system: Logistics reviews FIRST, then Sales sees it**
> *"Ese tracking system es de logística y de ahí tenemos que encontrar la manera de comunicarlo a CAS y a ventas"*
> — Yannett Yeomans

**Not started.** The tracking system hasn't been built yet (only the Email Tracking Processor workflow, which is incomplete).

**Requirements confirmed:**
- Tracking system is a **logistics tool first**
- Shows: PO, SO, OC → carrier → tracking number → current location → ETA
- Handles split shipments (same order, different carriers/vessels)
- Yannett reviews, then shares status to CAS/Sales
- Should link to the Odoo order records

---

**13. Customs/import time input — new feature**
> *"Necesito agregar un tiempo de cuánto más o menos le calculo se va a tardar en la aduana, en la desconsolidación... espera dos semanas más o menos en fila para que lo suban al tren"*
> — Yannett Yeomans

The tracking number gives a carrier ETA that is NOT the real delivery date for Dynapro's clients. Customs + deconsolidation + import + train queue add 4–8 weeks.

**Requirements:**
- Add an input field (in Odoo OR tracking app) where Logistics enters the estimated additional time in weeks
- System adds this to the carrier ETA to show the real expected date
- Future automation: default estimate by port of entry (Ensenada → +3w, Los Angeles → +4w, etc.)
- This is a **new feature** not in any current plan

**Fix needed:**
- For the tracking system web app: add an "Additional logistics time" editable field per shipment
- Write this value back to... somewhere (Odoo field? Google Sheet? tracking app DB?)
- Only show the adjusted ETA to Sales/CAS; show both raw + adjusted to Logistics

---

## Prioritized Fix List for Claude Code

### 🔴 P0 — Must fix before any team can test

1. **Configure WF3 Gmail credential** — Without this, zero emails go out. Yannett gets nothing.
2. **WF1 Branch B: Read SO lines by odoo_so_id** — Current stock lookup is broken for multi-product deals. Confirmed critical by both meetings.
3. **WF1 `Update Deal - Lookup OK`: Wire properties to HubSpot update** — Fields are computed but never written.
4. **Fix intercompany detection (Bug A+B)** — Use deal name for SOMX detection, use numeric ID for SO lookup.

### 🟠 P1 — Core promises made to teams

5. **WF1: Post Odoo chatter note when Branch B runs** — Marlen explicitly asked for Odoo visibility.
6. **WF1: Create Odoo activity for price alerts** (when `needs_supply_chain_alert=true`) — Not just email, an actual Odoo alert on the SO.
7. **WF3: Replace HubSpot task for Yannett with email notification** — She will never see a HubSpot task.
8. **WF3: Add email approve/deny link** — Either webhook URL or clear sheet link.
9. **WF1: Add Yannett + Emilka to SC Alert recipients** (alongside Alexis + Marlen).

### 🟡 P2 — Quality and completeness

10. **HubSpot UI config: Pin KAS properties to deal overview card** — Not code; UI config in HubSpot settings.
11. **WF1: Format last price display** — Human-readable date: `$X · SO##### · MMM DD, YYYY`.
12. **WF1: Include open PO count in lookup summary** — Already fetched, just not surfaced.
13. **WF3: Fix price alert passthrough** to Note - Orders Created node.
14. **WF1: Add qty_delivered and qty_invoiced** to per-product display (already in SO line data).

### 🔵 P3 — New features (not in any current workflow)

15. **Tracking system app: Build logistics view** with PO/SO/OC → carrier → tracking → ETA.
16. **Tracking system: Customs time input field** — weeks field per shipment, added to carrier ETA.
17. **Tracking system: Port-based default estimates** — Ensenada = 3w, LA = 4w, etc.
18. **Tracking system: Logistics-gated view** — Logistics sees full data; CAS/Sales see adjusted ETA only after Logistics approves.

---

## One Critical Process Clarification Needed

**Who approves intercompany orders?**

- Marlen said it's **Supply Chain's process** (not hers)
- Yannett confirmed she wants the approval
- But WF1 currently creates the HubSpot approval Task for **Alexis** (Supply Chain)
- WF3 currently emails **Yannett + Emilka**

**Current routing:**
- WF1 → Task for Alexis in HubSpot
- WF3 → Email to Yannett + Emilka

**Question for Juan:** Should Alexis approve via HubSpot AND Yannett approve via email? Or is it just one of them? The system shouldn't require two separate approvals for the same order.

