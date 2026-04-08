// ══════════════════════════════════════════════════════════════
// MERGE: Combine tracking data + Odoo SO data
// Prefers Odoo-sourced client_name and salesperson if AI left blank
//
// UPDATED: Adds order_references, carrier_info, shipment_grouping
// for the Tracking System app
// ══════════════════════════════════════════════════════════════

const currentData = items[0].json;
let enrichedData = { ...currentData };

try {
  const odooResult = currentData.result || currentData;

  if (Array.isArray(odooResult) && odooResult.length > 0) {
    const so = odooResult[0];
    enrichedData.odoo_so_confirmed = true;
    enrichedData.odoo_client_name = so.partner_id ? so.partner_id[1] : '';
    enrichedData.odoo_salesperson = so.user_id ? so.user_id[1] : '';
    enrichedData.odoo_so_total = so.amount_total || 0;
    enrichedData.odoo_so_state = so.state || '';
    enrichedData.odoo_commitment_date = so.commitment_date || '';

    // Enrich: prefer Odoo data if AI left fields blank
    if (!enrichedData.client_name && enrichedData.odoo_client_name) {
      enrichedData.client_name = enrichedData.odoo_client_name;
    }
    if (!enrichedData.salesperson && enrichedData.odoo_salesperson) {
      enrichedData.salesperson = enrichedData.odoo_salesperson;
    }
  } else {
    enrichedData.odoo_so_confirmed = false;
    enrichedData.odoo_salesperson = '';
    enrichedData.odoo_client_name = '';
  }
} catch (e) {
  enrichedData.odoo_so_confirmed = false;
  enrichedData.odoo_error = e.message;
}

// ── NEW: Add structured fields for Tracking System app ──
enrichedData.order_references = {
  sales_order: enrichedData.sales_order || '',
  purchase_order: enrichedData.purchase_order || '',
  order_confirmation: ''
};

enrichedData.carrier_info = {
  slug: enrichedData.courier || '',
  name: enrichedData.courier || ''
};

enrichedData.shipment_grouping = {
  order_id: enrichedData.sales_order || '',
  shipment_index: 1,
  shipment_total: 1
};

// App compatibility fields
enrichedData.courier_slug = enrichedData.courier || '';
enrichedData.last_update = enrichedData.last_event_date || enrichedData.processed_at || '';
enrichedData.raw_checkpoints = [];

// Clean up internal fields
delete enrichedData._source;
delete enrichedData._courier_detected;
delete enrichedData.result;
delete enrichedData.courier_code;
delete enrichedData.tm_status;
delete enrichedData.attachment_text;
delete enrichedData.attachment_count;
delete enrichedData.attachment_names;
delete enrichedData.email_html;

enrichedData.processed_at = new Date().toISOString();

return [{ json: enrichedData }];
