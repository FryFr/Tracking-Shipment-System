# ============================================================================
# Odoo Server Action 1327 — "Consultar disponibilidad y precio (KAS)"
# Modelo: sale.order   ·   Tipo: Ejecutar código Python
#
# CORREGIDO para Marlen (reunión 16 jun 2026): el botón que ella usa.
#   ✓ Etiqueta Cotización vs Sales Order (sale.order.state).
#   ✓ Stock POR SITE (CA/MX/PA/DR), no solo "Stock CA" (location 8).
#   ✓ Open POs por PRODUCTO, por site, con número de PO + ETA (antes: por
#     partner=cliente → bug, siempre 0). "En tránsito" = POs entrantes.
#   ✓ Historial de precios global por ítem (precio·cliente·SO·fecha) — se
#     conserva tal cual (lo que ya estaba impecable).
# Todo nativo en Odoo (ORM), sin HTTP ni n8n. `record` = la sale.order.
# ============================================================================
so = record
partner_id = so.partner_id.id
SOL = env['sale.order.line']

SITE = {1: 'CA', 2: 'MX', 3: 'PA', 4: 'DR'}   # company_id -> site
SITES = ['CA', 'MX', 'PA', 'DR']


def money(v):
    return u'${:,.2f}'.format(v or 0.0)


def fdate(dt):
    return dt.strftime('%Y-%m-%d') if dt else '?'


def qfmt(v):
    v = v or 0.0
    return str(int(v)) if v == int(v) else str(v)


ref_type = (u'Cotización' if so.state in ('draft', 'sent')
            else u'Sales Order' if so.state in ('sale', 'done')
            else (so.state or u'—'))

current_lines = so.order_line.filtered(lambda l: l.product_id and l.product_uom_qty > 0)
product_ids = current_lines.mapped('product_id').ids

# --- Stock POR SITE (4 inventarios) ---
stock_by_site = {'CA': 0.0, 'MX': 0.0, 'PA': 0.0, 'DR': 0.0}
stock_map = {}
if product_ids:
    quants = env['stock.quant'].search(
        [('location_id.usage', '=', 'internal'), ('product_id', 'in', product_ids)])
    for q in quants:
        spid = q.product_id.id
        site = SITE.get(q.company_id.id if q.company_id else 0)
        qty = q.available_quantity or 0.0
        if spid not in stock_map:
            stock_map[spid] = {'CA': 0.0, 'MX': 0.0, 'PA': 0.0, 'DR': 0.0, 'total': 0.0}
        if site:
            stock_map[spid][site] += qty
            stock_by_site[site] += qty
        stock_map[spid]['total'] += qty
stock_total = stock_by_site['CA'] + stock_by_site['MX'] + stock_by_site['PA'] + stock_by_site['DR']

# --- Open POs entrantes por PRODUCTO, por site, con número de PO ---
po_map = {}
po_names = set()
if product_ids:
    pol = env['purchase.order.line'].search(
        [('order_id.state', '=', 'purchase'), ('product_id', 'in', product_ids)])
    for pl in pol:
        pend = (pl.product_qty or 0.0) - (pl.qty_received or 0.0)
        if pend <= 0:
            continue
        ppid = pl.product_id.id
        po_name = pl.order_id.name or ''
        site = SITE.get(pl.company_id.id if pl.company_id else 0, '?')
        eta = fdate(pl.date_planned) if pl.date_planned else None
        po_map.setdefault(ppid, []).append((po_name, site, eta))
        po_names.add(po_name)
open_pos_count = len(po_names)

# --- Bloques por producto (precio + stock por site + POs) ---
blocks = []
no_hist = 0
for line in current_lines:
    pid = line.product_id.id
    pname = line.product_id.display_name
    order_count = SOL.search_count([('product_id', '=', pid)])

    hist = SOL.search(
        [('product_id', '=', pid), ('price_unit', '>', 0), ('order_id', '!=', so.id)],
        order='id desc', limit=20)
    this_client = hist.filtered(lambda l: l.order_partner_id.id == partner_id)[:1]

    out = [u'<b>%s</b> &mdash; %s orders / órdenes' % (pname, order_count)]
    out.append(u'&nbsp;&nbsp;Now / Ahora: <b>%s</b>' % money(line.price_unit))
    if this_client:
        tc = this_client[0]
        out.append(u'&nbsp;&nbsp;This client / Este cliente: %s (%s · %s)'
                   % (money(tc.price_unit), tc.order_id.name, fdate(tc.create_date)))
    if hist:
        out.append(u'&nbsp;&nbsp;History / Historial (all clients / todos):')
        for h in hist[:6]:
            out.append(u'&nbsp;&nbsp;&nbsp;&nbsp;&bull; %s &middot; %s &middot; %s &middot; %s'
                       % (money(h.price_unit), h.order_partner_id.name or '?',
                          h.order_id.name, fdate(h.create_date)))
    else:
        no_hist += 1
        out.append(u'&nbsp;&nbsp;⚠️ No prior price / Sin precio anterior')

    # stock por site + POs entrantes de este producto
    st = stock_map.get(pid, {'CA': 0.0, 'MX': 0.0, 'PA': 0.0, 'DR': 0.0, 'total': 0.0})
    if st['total'] > 0:
        stk = u'Stock: ' + u' · '.join(u'%s %s' % (s, qfmt(st[s])) for s in SITES if st[s] > 0)
    else:
        stk = u'⚠️ No stock / Sin stock'
    pos = po_map.get(pid, [])
    if pos:
        poss = u'Incoming / En camino: ' + u', '.join(
            u'%s·%s%s' % (e[0], e[1], (u' ETA ' + e[2] if e[2] else u'')) for e in pos)
    else:
        poss = u'No open POs / Sin POs'
    out.append(u'&nbsp;&nbsp;%s &nbsp;|&nbsp; %s' % (stk, poss))

    blocks.append(u'<br/>'.join(out))

needs_alert = no_hist > 0 or (stock_total == 0 and open_pos_count == 0)

if not current_lines:
    body = u'<b>\U0001F4CA KAS Workcenter</b><br/>No products in quote / Sin productos en la cotización.'
else:
    body = u'<b>\U0001F4CA KAS Workcenter — %s %s</b><br/><br/>' % (ref_type, so.name) + u'<br/><br/>'.join(blocks)
    body += (u'<br/><br/><b>Stock by site / por site:</b> '
             u'CA %s &middot; MX %s &middot; PA %s &middot; DR %s (tot %s)'
             u' &nbsp;|&nbsp; <b>Open POs / POs abiertas:</b> %s'
             % (qfmt(stock_by_site['CA']), qfmt(stock_by_site['MX']),
                qfmt(stock_by_site['PA']), qfmt(stock_by_site['DR']),
                qfmt(stock_total), open_pos_count))

so.message_post(body=body, message_type='comment', subtype_xmlid='mail.mt_comment')

# Activity "To Do" para quien dispara la acción
if no_hist > 0:
    act = u'⚠️ No price / Sin precio: %s item(s)/producto(s)' % no_hist
elif needs_alert:
    act = u'⚠️ No stock / Sin stock ni POs — review / revisar'
else:
    act = u'KAS: review prices & availability / revisar precios (%s)' % len(current_lines)

env['mail.activity'].create({
    'res_model_id': 495,
    'res_id': so.id,
    'activity_type_id': 4,
    'summary': act,
    'note': body,
    'user_id': env.user.id,
    'date_deadline': datetime.date.today(),
})
