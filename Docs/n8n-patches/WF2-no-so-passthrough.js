// No SO to validate — pass through with empty Odoo fields
// UPDATED: Adds carrier_info, courier_slug, raw_checkpoints for app compatibility
const data = items[0].json;

// Clean up internal fields
delete data._source;
delete data._courier_detected;
delete data.courier_code;
delete data.tm_status;
delete data.attachment_text;
delete data.attachment_count;
delete data.attachment_names;
delete data.email_html;

return [{ json: {
  ...data,
  odoo_so_confirmed: false,
  odoo_salesperson: '',
  odoo_client_name: '',
  // NEW: Structured fields for Tracking System app
  carrier_info: { slug: data.courier || '', name: data.courier || '' },
  courier_slug: data.courier || '',
  last_update: data.last_event_date || new Date().toISOString(),
  raw_checkpoints: [],
  processed_at: new Date().toISOString()
}}];
