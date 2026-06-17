// ============================================================================
// WF1 — KAS Workcenter · Branch B (lookup)
// Code node "Odoo Lookup (JSON-RPC)" — reemplaza 8 nodos Odoo de n8n.
//
// Por qué: los nodos Odoo de n8n filtran mal (trajeron 3 de 3008 líneas) y son
// ~250x más lentos (In Transit tardó 78s; el mismo query vía JSON-RPC = 0.3s).
//
// Requiere estas env vars en n8n (VPS) + N8N_BLOCK_ENV_ACCESS_IN_NODE=false:
//   ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY
//
// Mode del Code node: "Run Once for All Items".
// Input: Get Deal Details (HubSpot). Output: igual schema que el viejo
// Consolidate Lookup (deal_id, summary, kas props, product_prices, etc.)
// ============================================================================

const ODOO_URL = $env.ODOO_URL;
const DB = $env.ODOO_DB;
const LOGIN = $env.ODOO_LOGIN;
const KEY = $env.ODOO_API_KEY;
const H = this.helpers;

const rpc = async (service, method, args) => {
  const resp = await H.httpRequest({
    method: 'POST',
    url: ODOO_URL + '/jsonrpc',
    body: { jsonrpc: '2.0', method: 'call', params: { service, method, args } },
    json: true,
    timeout: 30000,
  });
  if (resp && resp.error) throw new Error('Odoo RPC error: ' + JSON.stringify(resp.error));
  return resp.result;
};

const uid = await rpc('common', 'authenticate', [DB, LOGIN, KEY, {}]);
if (!uid) throw new Error('Odoo auth failed: revisar ODOO_LOGIN / ODOO_API_KEY / ODOO_DB');
const exec = (model, method, params, kw) =>
  rpc('object', 'execute_kw', [DB, uid, KEY, model, method, params, kw || {}]);

// --- Deal info (de HubSpot) ---
const dealData = $('Get Deal Details').first().json;
const props = dealData.properties || {};
const getP = (n) => (props[n] && props[n].value !== undefined) ? props[n].value : (props[n] || '');
const dealId = dealData.dealId || dealData.id;
const dealName = getP('dealname');
const partnerId = Number(getP('odoo_partner_id')) || null;
const soRaw = String(getP('odoo_so_id') || '').trim();
const ownerIdRaw = getP('hubspot_owner_id');
const amountRaw = getP('amount');
const pipelineRaw = getP('pipeline');

const pipelineLabels = { '764732207': 'Pumps Pipeline', '765276498': 'Parts Pipeline', '765142838': 'Service Pipeline' };
const pipeline = pipelineLabels[pipelineRaw] || pipelineRaw;
const ownerLabels = {
  '79638583': 'Ian Trottier', '79634109': 'Amanda Qiao', '80144391': 'Wilka Nunez',
  '79428823': 'Alexis Gil Lamadrid', '79427456': 'Marlen Martinez', '79404133': 'Eduardo Talamantes',
  '79678411': 'Emilka Guerra', '81348575': 'Leriel Reyes', '80117750': 'Carlos Tarazon',
  '80435637': 'Oziel Garcia', '80435685': 'Dulce Ramirez', '82864240': 'Aleksandar Stankovic',
  '82963023': 'Diego Martinez', '87207701': 'Juan Silva', '1938187171': 'Jon Bell',
  '78444507': 'Gerardo Garcia', '82962253': 'Pierre Dupuis',
};
const ownerName = ownerLabels[ownerIdRaw] || ownerIdRaw;

// 1. SO actual (id numérico o nombre)
const soDomain = /^\d+$/.test(soRaw) ? [['id', '=', Number(soRaw)]] : [['name', '=', soRaw]];
const sos = soRaw
  ? await exec('sale.order', 'search_read', [soDomain], { fields: ['id', 'name', 'partner_id', 'currency_id'], limit: 1 })
  : [];
const currentSO = sos[0] || {};
const soNumericId = currentSO.id || null;
const soName = currentSO.name || soRaw;
const partnerName = (currentSO.partner_id && currentSO.partner_id[1]) || '';

// 2. Líneas de la SO actual (productos cotizados)
let currentLines = [];
if (soNumericId) {
  currentLines = await exec('sale.order.line', 'search_read',
    [[['order_id', '=', soNumericId], ['product_id', '!=', false]]],
    { fields: ['product_id', 'name', 'product_uom_qty', 'price_unit'], limit: 100 });
}
const productIds = currentLines.map((l) => l.product_id[0]);

// 3. Historial de precios (este cliente + estos productos, EXCLUYENDO la SO actual)
let history = [];
if (partnerId && productIds.length) {
  history = await exec('sale.order.line', 'search_read',
    [[['order_partner_id', '=', partnerId], ['product_id', 'in', productIds], ['order_id', '!=', soNumericId]]],
    { fields: ['product_id', 'price_unit', 'order_id', 'create_date'], order: 'id desc', limit: 300 });
}
const priceMap = {};
for (const h of history) {
  const pid = h.product_id[0];
  if (!priceMap[pid]) priceMap[pid] = { price: h.price_unit, ref: (h.order_id && h.order_id[1]) || '', date: h.create_date };
}

// 4. Stock CA (location 8) de esos productos
let stockTotal = 0;
if (productIds.length) {
  const quants = await exec('stock.quant', 'search_read',
    [[['location_id', '=', 8], ['product_id', 'in', productIds]]],
    { fields: ['product_id', 'available_quantity'], limit: 500 });
  for (const q of quants) stockTotal += (q.available_quantity || 0);
}

// 5. En tránsito (stock.picking assigned del cliente)
let inTransit = [];
if (partnerId) {
  inTransit = await exec('stock.picking', 'search_read',
    [[['partner_id', '=', partnerId], ['state', '=', 'assigned']]],
    { fields: ['name', 'scheduled_date', 'carrier_tracking_ref'], limit: 20 });
}
const inTransitCount = inTransit.length;
let inTransitETA = null, trackingRef = null;
for (const p of inTransit) {
  if (!inTransitETA || (p.scheduled_date && p.scheduled_date < inTransitETA)) inTransitETA = p.scheduled_date;
  if (p.carrier_tracking_ref) trackingRef = p.carrier_tracking_ref;
}

// 6. POs abiertas del cliente
let openPOs = [];
if (partnerId) {
  openPOs = await exec('purchase.order', 'search_read',
    [[['partner_id', '=', partnerId], ['state', '=', 'purchase']]],
    { fields: ['name', 'amount_total'], limit: 20 });
}
const openPOsCount = openPOs.length;
let openPOsValue = 0;
for (const po of openPOs) openPOsValue += (po.amount_total || 0);

// 7. Precio por producto (lo que pidió Marlen)
const productPrices = currentLines.map((l) => {
  const pid = l.product_id[0];
  const hist = priceMap[pid];
  return {
    product_id: pid,
    product_name: l.product_id[1],
    qty: l.product_uom_qty,
    current_price: l.price_unit,
    last_price: hist ? hist.price : null,
    last_price_ref: hist ? hist.ref : null,
    has_history: !!hist,
  };
});
const noHist = productPrices.filter((p) => !p.has_history);
const needsAlert = noHist.length > 0 || (stockTotal === 0 && inTransitCount === 0 && openPOsCount === 0);

const fmt = (n) => '$' + (Math.round(n * 100) / 100).toLocaleString();
const summary = productPrices.length === 0
  ? 'Sin productos en la cotizacion.'
  : productPrices.map((p) => p.has_history
    ? '• ' + p.product_name + ': anterior ' + fmt(p.last_price) + ' (' + p.last_price_ref + ') | ahora ' + fmt(p.current_price)
    : '⚠️ ' + p.product_name + ': SIN PRECIO ANTERIOR para este cliente').join('\n');

const firstHist = productPrices.find((p) => p.has_history);
const lastPriceDisplay = firstHist ? fmt(firstHist.last_price) + ' · ' + firstHist.last_price_ref : 'N/A';

// === Lap 1: visibilidad en Odoo para Marlen ===
// Postea el resumen KAS en el chatter de la SO (y una activity TODO si hay alerta).
// Solo en producción (no en Execute step manual, para no ensuciar al testear).
if (soNumericId && $execution.mode !== 'manual') {
  const chatterBody = '<b>📊 KAS Workcenter</b><br/>' +
    productPrices.map((p) => p.has_history
      ? '• ' + p.product_name + ': anterior ' + fmt(p.last_price) + ' (' + p.last_price_ref + ') | ahora ' + fmt(p.current_price)
      : '⚠️ ' + p.product_name + ': SIN PRECIO ANTERIOR').join('<br/>') +
    '<br/><br/>Stock CA: ' + stockTotal + ' | En tránsito: ' + inTransitCount + ' | POs abiertas: ' + openPOsCount;
  try {
    await exec('sale.order', 'message_post', [[soNumericId]],
      { body: chatterBody, message_type: 'comment', subtype_xmlid: 'mail.mt_comment' });
  } catch (e) { /* no romper el flujo si el chatter falla */ }

  // Activity TODO SIEMPRE (asignada a Marlen) — le salta en su bandeja de Odoo
  const actSummary = needsAlert
    ? (noHist.length > 0
        ? '⚠️ Faltan precios anteriores: ' + noHist.length + ' producto(s)'
        : '⚠️ Sin stock / envío / POs — revisar proveedor')
    : 'KAS: revisar disponibilidad y precios (' + productPrices.length + ' productos)';
  try {
    await exec('mail.activity', 'create', [{
      res_model_id: 495,          // ir.model de sale.order
      res_id: soNumericId,
      activity_type_id: 4,        // To Do
      summary: actSummary,
      note: summary.replace(/\n/g, '<br/>'),
      user_id: 14,                // Marlen Martinez
      date_deadline: new Date().toISOString().slice(0, 10),
    }]);
  } catch (e) { /* no romper el flujo si la activity falla */ }
}

return [{ json: {
  deal_id: dealId, deal_name: dealName, pipeline: pipeline, owner: ownerName, amount: amountRaw,
  action: 'lookup',
  odoo_so_id: soName, odoo_so_numeric_id: soNumericId,
  partner_name: partnerName, odoo_partner_id: partnerId,
  stock_available: stockTotal,
  product_prices: productPrices,
  products_total: productPrices.length,
  products_no_history_count: noHist.length,
  last_price_display: lastPriceDisplay,
  last_price_ref: firstHist ? firstHist.last_price_ref : '',
  in_transit_count: inTransitCount, in_transit_eta: inTransitETA, tracking_ref: trackingRef,
  open_pos_count: openPOsCount, open_pos_value: Math.round(openPOsValue * 100) / 100,
  needs_supply_chain_alert: needsAlert,
  summary: summary,
  processed_at: new Date().toISOString(),
}}];
