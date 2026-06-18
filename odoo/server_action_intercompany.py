# ============================================================================
# Odoo Server Action — "Solicitar intercompany / Request intercompany"
# Modelo: PURCHASE.ORDER   ·   Tipo: Ejecutar código Python
#
# CORREGIDO: va en COMPRAS, no en ventas. El flujo real (Yannett):
#   1. Ella crea la OC en México (purchase.order, MX compra a Canadá) → ORIGEN.
#   2. El botón (este) marca la OC; al APROBAR por email, n8n crea en Canadá:
#        - PO Canadá (purchase.order, company 1): mismos ítems, SIN proveedor
#          (queda en draft; Yannett pone el proveedor real).
#        - SO Canadá (sale.order, company 1): cliente = Dynapro México (2252),
#          mismos ítems.
#   Aprobación por email ANTES de crear (irreversible).
#
# Campos custom en purchase.order (creados por API):
#   x_intercompany_request (Char) · x_intercompany_done (Boolean)
# `record` = la purchase.order (OC México) desde la que se ejecuta.
# ============================================================================

po = record

if po.x_intercompany_done:
    po.message_post(
        body=u'ℹ️ Intercompany ya creado para esta OC / already created. No action.',
        message_type='comment', subtype_xmlid='mail.mt_comment')
elif po.x_intercompany_request in ('requested', 'sent', 'approved'):
    po.message_post(
        body=u'ℹ️ Intercompany ya solicitado (estado: %s) / already requested. '
             u'Esperando aprobación por email.' % po.x_intercompany_request,
        message_type='comment', subtype_xmlid='mail.mt_comment')
else:
    lines = po.order_line.filtered(lambda l: l.product_id and l.product_qty > 0)
    if not lines:
        po.message_post(
            body=u'⚠️ La OC no tiene líneas de producto / no product lines.',
            message_type='comment', subtype_xmlid='mail.mt_comment')
    else:
        detail = u'<br/>'.join(
            u'&bull; %s &times; %s @ %s'
            % (l.product_id.display_name, l.product_qty, l.price_unit)
            for l in lines)
        po.write({'x_intercompany_request': 'requested'})
        po.message_post(
            body=u'\U0001F501 <b>Intercompany solicitado / requested</b><br/>'
                 u'Se pedirá aprobación por email a Logística (Yannett + Emilka).<br/>'
                 u'Al aprobar se crearán en Canadá: <b>PO</b> (mismos ítems, sin proveedor, draft) '
                 u'y <b>SO</b> (cliente Dynapro México) con estas líneas:<br/>' + detail,
            message_type='comment', subtype_xmlid='mail.mt_comment')
