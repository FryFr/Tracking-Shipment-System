# ============================================================================
# Odoo Server Action — "Consultar disponibilidad y precio (KAS)"
# Modelo: sale.order   ·   Tipo: Ejecutar código Python
#
# Qué hace (todo nativo en Odoo, sin HTTP ni n8n):
#   Para cada producto de la cotización actual:
#     - Precio actual de la cotización (Now)
#     - Último precio que ESTE cliente pagó (This client)
#     - Listado del historial GLOBAL del ítem: precio · cliente · SO · fecha,
#       SIN importar el cliente (lo que pidió Marlen: listado, no promedio)
#     - En cuántas órdenes ha estado el ítem
#   Más: stock CA, envíos en tránsito y POs abiertas del cliente.
#   Postea todo en el chatter de la SO + crea una activity "To Do".
#
# Bilingüe EN/ES. Disparado on-demand desde un botón/acción en la cotización.
# `record` = la sale.order desde la que se ejecuta.
# ============================================================================

so = record
partner_id = so.partner_id.id
SOL = env['sale.order.line']

def money(v):
    return u'${:,.2f}'.format(v or 0.0)

def fdate(dt):
    return dt.strftime('%Y-%m-%d') if dt else '?'

current_lines = so.order_line.filtered(lambda l: l.product_id and l.product_uom_qty > 0)

blocks = []
no_hist = 0
for line in current_lines:
    pid = line.product_id.id
    pname = line.product_id.display_name
    order_count = SOL.search_count([('product_id', '=', pid)])

    # Historial global del ítem (cualquier cliente), excluyendo la cotización actual
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
    blocks.append(u'<br/>'.join(out))

# Stock CA (location 8) de los productos de la cotización
product_ids = current_lines.mapped('product_id').ids
stock_total = 0.0
if product_ids:
    quants = env['stock.quant'].search(
        [('location_id', '=', 8), ('product_id', 'in', product_ids)])
    stock_total = sum(quants.mapped('available_quantity'))

in_transit_count = env['stock.picking'].search_count(
    [('partner_id', '=', partner_id), ('state', '=', 'assigned')])
open_pos_count = env['purchase.order'].search_count(
    [('partner_id', '=', partner_id), ('state', '=', 'purchase')])

needs_alert = no_hist > 0 or (stock_total == 0 and in_transit_count == 0 and open_pos_count == 0)

if not current_lines:
    body = u'<b>\U0001F4CA KAS Workcenter</b><br/>No products in quote / Sin productos en la cotización.'
else:
    body = u'<b>\U0001F4CA KAS Workcenter</b><br/><br/>' + u'<br/><br/>'.join(blocks)
    body += (u'<br/><br/><b>Stock CA:</b> %s &nbsp;|&nbsp; '
             u'<b>In transit / En tránsito:</b> %s &nbsp;|&nbsp; '
             u'<b>Open POs / POs abiertas:</b> %s'
             % (stock_total, in_transit_count, open_pos_count))

so.message_post(body=body, message_type='comment', subtype_xmlid='mail.mt_comment')

# Activity "To Do" para quien dispara la acción
if no_hist > 0:
    act = u'⚠️ No price / Sin precio: %s item(s)/producto(s)' % no_hist
elif needs_alert:
    act = u'⚠️ No stock / Sin stock ni POs — review / revisar'
else:
    act = u'KAS: review prices & availability / revisar precios (%s)' % len(current_lines)

env['mail.activity'].create({
    'res_model_id': 495,              # ir.model de sale.order
    'res_id': so.id,
    'activity_type_id': 4,            # To Do
    'summary': act,
    'note': body,
    'user_id': env.user.id,           # quien dispara la acción (KAS / Marlen)
    'date_deadline': datetime.date.today(),
})
