// WF2 · Nodo "Shape Firestore Doc" — CORREGIDO (22 jun 2026)
// Antes: descartaba todo correo SIN tracking number → las órdenes que entraban
// sin guía (correos "SHIPMENT:" de KAS) no se guardaban → no aparecían en el
// dashboard hasta despacharse.
// Ahora: si NO hay tracking pero SÍ hay SO o PO → guarda una "orden pendiente
// de envío" (clave sintética ORDER-<SO>, status 'pending'). Cuando llega la guía
// despues, se crea el doc real del envío bajo la misma SO. Ruido sin SO/PO se ignora.
const up = (v) => (v ? String(v).trim().toUpperCase() : '');
const out = [];

for (const item of $input.all()) {
  const d = item.json;
  const tn = String(d.tracking_number || '').trim();
  const refs = d.order_references || {};
  const so = up(d.sales_order || refs.sales_order);
  const po = up(d.purchase_order || refs.purchase_order);
  const oc = up(d.order_confirmation || refs.order_confirmation);

  if (tn) {
    // --- Envío CON tracking (igual que antes) ---
    const courier = d.courier_slug || d.courier || (d.carrier_info && d.carrier_info.slug) || '';
    out.push({ json: {
      tracking_number: tn,
      courier_slug: courier === 'unknown' ? '' : courier,
      status: d.status && d.status !== 'notfound' ? d.status : 'transit',
      status_detail: (d.status_detail && d.status_detail !== 'No tracking data found')
        ? d.status_detail : 'From shipping notification',
      last_location: d.last_location || '',
      last_update: d.last_update || d.last_event_date || d.processed_at || new Date().toISOString(),
      eta: d.eta || d.etd || '',
      sales_order: so,
      purchase_order: po,
      order_confirmation: oc,
      source: 'email',
      updated_at: new Date().toISOString(),
    }});
  } else if (so || po) {
    // --- Orden SIN guía pero con SO/PO → "pendiente de envío" ---
    out.push({ json: {
      tracking_number: 'ORDER-' + (so || po),   // clave sintética para el upsert
      courier_slug: '',
      status: 'pending',
      status_detail: 'Order received - awaiting shipment / Orden recibida - pendiente de envío',
      last_location: '',
      last_update: d.last_update || d.processed_at || new Date().toISOString(),
      eta: '',
      sales_order: so,
      purchase_order: po,
      order_confirmation: oc,
      source: 'email-order',
      updated_at: new Date().toISOString(),
    }});
  }
  // sin tracking ni SO ni PO → ruido, se ignora
}

return out;
