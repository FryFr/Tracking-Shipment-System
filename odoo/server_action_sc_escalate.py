# ============================================================================
# Odoo Server Action 1330 — "Escalar a Supply Chain / Escalate to Supply Chain"
# Modelo: sale.order   ·   Tipo: Ejecutar código Python
#
# CORREGIDO para Marlen (16 jun 2026):
#   ✓ Stock evaluado en los 4 SITES (CA/MX/PA/DR), no solo location 8 (CA).
#     Un ítem es "sin stock" solo si NO hay en NINGÚN site.
#   ✓ Detalle con desglose por site.
#   ✓ Texto del chatter: "correo a Supply Chain" (ya NO crea ticket en HubSpot).
#
# Marca el campo x_kas_sc_request → lo levanta el workflow de n8n, que manda el
# CORREO a Supply Chain (Emilka + Yannett, CC Marlen) y mueve el stage en
# HubSpot (cronómetro SLA). `record` = la sale.order.
# ============================================================================
so = record
current_lines = so.order_line.filtered(lambda l: l.product_id and l.product_uom_qty > 0)
product_ids = current_lines.mapped('product_id').ids

SITE = {1: 'CA', 2: 'MX', 3: 'PA', 4: 'DR'}
SITES = ['CA', 'MX', 'PA', 'DR']


def qfmt(v):
    v = v or 0.0
    return str(int(v)) if v == int(v) else str(v)


# Stock por site + total por producto (4 inventarios)
stock_map = {}
if product_ids:
    quants = env['stock.quant'].search(
        [('location_id.usage', '=', 'internal'), ('product_id', 'in', product_ids)])
    for q in quants:
        pid = q.product_id.id
        site = SITE.get(q.company_id.id if q.company_id else 0)
        qty = q.available_quantity or 0.0
        if pid not in stock_map:
            stock_map[pid] = {'CA': 0.0, 'MX': 0.0, 'PA': 0.0, 'DR': 0.0, 'total': 0.0}
        if site:
            stock_map[pid][site] += qty
        stock_map[pid]['total'] += qty

# Ítems sin stock suficiente en NINGÚN site
no_stock = []
for line in current_lines:
    st = stock_map.get(line.product_id.id, {'CA': 0.0, 'MX': 0.0, 'PA': 0.0, 'DR': 0.0, 'total': 0.0})
    if st['total'] < line.product_uom_qty:
        sites_txt = u' · '.join(u'%s %s' % (s, qfmt(st[s])) for s in SITES if st[s] > 0) or u'0'
        no_stock.append(u'%s (need/necesita %s · stock por site: %s = %s)'
                        % (line.product_id.display_name, qfmt(line.product_uom_qty),
                           sites_txt, qfmt(st['total'])))

if not no_stock:
    so.message_post(
        body=u'✅ KAS: all items in stock (any site) / todos con stock en algún site. '
             u'No escalation needed / no hace falta escalar.',
        message_type='comment', subtype_xmlid='mail.mt_comment')
else:
    payload = u'SO %s — %s\nItems without stock in any site / sin stock en ningún site:\n%s' % (
        so.name, so.partner_id.name or '', u'\n'.join(no_stock))
    # Marca para que n8n mande el correo a Supply Chain + mueva el stage SLA
    so.write({'x_kas_sc_request': payload})
    so.message_post(
        body=u'\U0001F39F️ <b>Escalado a Supply Chain / Escalated to Supply Chain</b><br/>'
             + u'<br/>'.join(no_stock)
             + u'<br/><i>Sending email to Supply Chain… / Enviando correo a Supply Chain…</i>',
        message_type='comment', subtype_xmlid='mail.mt_comment')
