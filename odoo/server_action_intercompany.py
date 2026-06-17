# ============================================================================
# Odoo Server Action — "Solicitar intercompany / Request intercompany"
# Modelo: sale.order   ·   Tipo: Ejecutar código Python
#
# Yannett/ventas lo dispara desde una SOMX (orden de México) cuando la mercadería
# tiene que venir de Canadá. El click NO crea nada todavía: marca la SO para que
# n8n mande el email de aprobación (a Yannett + Emilka). Recién al APROBAR por
# email se crean la OC (México compra a Canadá 3716) y la SO-CA (Canadá vende a
# México 2252). Aprobación ANTES de crear porque es irreversible.
#
# Requiere campos custom en sale.order (crear en Studio):
#   - x_intercompany_request (Char/Text)  → estado del flujo
#   - x_intercompany_done    (Boolean)    → idempotencia (ya creado)
#
# El puente a la creación lo hace n8n (polling de x_intercompany_request).
# `record` = la sale.order desde la que se ejecuta.
# ============================================================================

so = record

# Guardas: no re-disparar si ya está en curso o ya se creó
if so.x_intercompany_done:
    so.message_post(
        body=u'ℹ️ Intercompany ya creado para esta orden / already created. No action.',
        message_type='comment', subtype_xmlid='mail.mt_comment')
elif so.x_intercompany_request in ('requested', 'sent', 'approved'):
    so.message_post(
        body=u'ℹ️ Intercompany ya solicitado (estado: %s) / already requested. '
             u'Esperando aprobación por email.' % so.x_intercompany_request,
        message_type='comment', subtype_xmlid='mail.mt_comment')
else:
    lines = so.order_line.filtered(lambda l: l.product_id and l.product_uom_qty > 0)
    if not lines:
        so.message_post(
            body=u'⚠️ La orden no tiene líneas de producto / no product lines. '
                 u'No se puede solicitar intercompany.',
            message_type='comment', subtype_xmlid='mail.mt_comment')
    else:
        detail = u'<br/>'.join(
            u'&bull; %s &times; %s @ %s'
            % (l.product_id.display_name, l.product_uom_qty, l.price_unit)
            for l in lines)
        # Marca para que n8n mande el email de aprobación
        so.write({'x_intercompany_request': 'requested'})
        so.message_post(
            body=u'\U0001F501 <b>Intercompany solicitado / requested</b><br/>'
                 u'Se pedirá aprobación por email a Logística (Yannett + Emilka).<br/>'
                 u'Al aprobar se crearán: OC México→Canadá (3716) y SO Canadá→México (2252) '
                 u'con estas líneas:<br/>' + detail,
            message_type='comment', subtype_xmlid='mail.mt_comment')
