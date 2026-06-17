# ============================================================================
# Odoo Server Action — "Escalar a Supply Chain / Escalate to Supply Chain"
# Modelo: sale.order   ·   Tipo: Ejecutar código Python
#
# Marlen/KAS lo dispara desde la cotización cuando el KAS muestra ítems sin
# stock y quiere pedirle a Supply Chain lead time + costo (pedido de Wilka,
# reunión 7 may). El click ES la confirmación → evita tickets fantasma.
#
# Qué hace:
#   - Calcula qué ítems de la cotización NO tienen stock suficiente en CA.
#   - Si hay → marca el campo x_kas_sc_request con el detalle (lo levanta n8n
#     para crear el ticket en HubSpot Service) + postea aviso en el chatter.
#   - Si todos tienen stock → avisa que no hace falta escalar.
#
# El puente a HubSpot lo hace un workflow de n8n (polling de este campo).
# `record` = la sale.order.
# ============================================================================

so = record
current_lines = so.order_line.filtered(lambda l: l.product_id and l.product_uom_qty > 0)
product_ids = current_lines.mapped('product_id').ids

# Stock disponible por producto en WH/Stock CA (location 8)
stock_by_product = {}
if product_ids:
    quants = env['stock.quant'].search(
        [('location_id', '=', 8), ('product_id', 'in', product_ids)])
    for q in quants:
        pid = q.product_id.id
        stock_by_product[pid] = stock_by_product.get(pid, 0.0) + (q.available_quantity or 0.0)

# Ítems sin stock suficiente
no_stock = []
for line in current_lines:
    avail = stock_by_product.get(line.product_id.id, 0.0)
    if avail < line.product_uom_qty:
        no_stock.append(u'%s (need/necesita %s, stock %s)'
                        % (line.product_id.display_name, line.product_uom_qty, avail))

if not no_stock:
    so.message_post(
        body=u'✅ KAS: all items in stock / todos los ítems con stock. '
             u'No Supply Chain ticket needed / no hace falta ticket.',
        message_type='comment', subtype_xmlid='mail.mt_comment')
else:
    detail = u'<br/>'.join(no_stock)
    payload = u'SO %s — %s\nItems without stock / sin stock:\n%s' % (
        so.name, so.partner_id.name or '', u'\n'.join(no_stock))
    # Marca para que n8n cree el ticket en HubSpot (Parts & Service Quotes)
    so.write({'x_kas_sc_request': payload})
    so.message_post(
        body=u'\U0001F39F️ <b>Supply Chain ticket requested / Ticket a Supply Chain solicitado</b><br/>'
             + detail
             + u'<br/><i>Creating ticket in HubSpot… / Creando ticket en HubSpot…</i>',
        message_type='comment', subtype_xmlid='mail.mt_comment')
