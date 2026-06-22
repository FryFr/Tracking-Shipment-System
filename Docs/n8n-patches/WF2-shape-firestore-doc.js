// WF2 · Nodo "Shape Firestore Doc" — v2 (22 jun 2026)
// ROOT CAUSE encontrado: para órdenes SIN guía, la cadena "Get sales" (Odoo
// getAll devuelve una LISTA de SOs recientes) → "Enrich with Odoo Data" PIERDE
// la SO original (order_references queda vacío). Por eso no se guardaban.
// FIX: las órdenes sin guía se leen DIRECTO del nodo "No Tracking (Pass-through)"
// (que tiene la SO/PO limpia), salteando la cadena que la rompe.
const up = (v) => (v ? String(v).trim().toUpperCase() : '');
const now = () => new Date().toISOString();
const out = [];
const seen = new Set();

// A) Envíos CON tracking (flujo normal)
for (const item of $input.all()) {
  const d = item.json;
  const tn = String(d.tracking_number || '').trim();
  if (!tn || seen.has(tn)) continue;
  seen.add(tn);
  const refs = d.order_references || {};
  const courier = d.courier_slug || d.courier || (d.carrier_info && d.carrier_info.slug) || '';
  out.push({ json: {
    tracking_number: tn,
    courier_slug: courier === 'unknown' ? '' : courier,
    status: d.status && d.status !== 'notfound' ? d.status : 'transit',
    status_detail: (d.status_detail && d.status_detail !== 'No tracking data found')
      ? d.status_detail : 'From shipping notification',
    last_location: d.last_location || '',
    last_update: d.last_update || d.last_event_date || d.processed_at || now(),
    eta: d.eta || d.etd || '',
    sales_order: up(d.sales_order || refs.sales_order),
    purchase_order: up(d.purchase_order || refs.purchase_order),
    order_confirmation: up(d.order_confirmation || refs.order_confirmation),
    source: 'email',
    updated_at: now(),
  }});
}

// B) Órdenes SIN guía pero con SO/PO → leer del nodo limpio "No Tracking (Pass-through)"
let noTrack = [];
try { noTrack = $('No Tracking (Pass-through)').all(); } catch (e) { noTrack = []; }
for (const item of noTrack) {
  const d = (item && item.json) || {};
  if (String(d.tracking_number || '').trim()) continue;
  const refs = d.order_references || {};
  const so = up(d.sales_order || refs.sales_order);
  const po = up(d.purchase_order || refs.purchase_order);
  if (!so && !po) continue;
  const key = 'ORDER-' + (so || po);
  if (seen.has(key)) continue;
  seen.add(key);
  out.push({ json: {
    tracking_number: key,                     // clave sintética para el upsert
    courier_slug: '',
    status: 'pending',
    status_detail: 'Order received - awaiting shipment / Orden recibida - pendiente de envío',
    last_location: '',
    last_update: d.last_update || d.processed_at || now(),
    eta: '',
    sales_order: so,
    purchase_order: po,
    order_confirmation: up(d.order_confirmation || refs.order_confirmation),
    source: 'email-order',
    updated_at: now(),
  }});
}

return out;
