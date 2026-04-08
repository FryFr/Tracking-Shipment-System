// Extract deal ID from search results and merge with tracking data
// UPDATED: Fixed upstream node reference + added tracking_eta and tracking_last_update
const searchResult = $('Search Deal in HubSpot').first().json;

// Get tracking data from whichever upstream node ran
let trackingData = {};
try {
  trackingData = $('Enrich with Odoo Data').first().json;
} catch(e) {
  try {
    trackingData = $('No SO (Pass-through)').first().json;
  } catch(e2) {
    trackingData = {};
  }
}

const dealId = searchResult.results && searchResult.results[0]
  ? searchResult.results[0].id : null;
const dealName = searchResult.results && searchResult.results[0]
  ? searchResult.results[0].properties.dealname : '';

// Map TrackingMore status to HubSpot delivery_status enum
const statusMap = {
  'pending': 'processing',
  'notfound': 'processing',
  'inforeceived': 'processing',
  'transit': 'to_deliver',
  'pickup': 'to_deliver',
  'delivered': 'delivered',
  'exception': 'to_deliver',
  'expired': 'to_deliver',
  'undelivered': 'to_deliver'
};

const tmStatus = (trackingData.status || '').toLowerCase();
const hsDeliveryStatus = statusMap[tmStatus] || 'processing';

return [{ json: {
  deal_id: dealId,
  deal_name: dealName,
  tracking_number: trackingData.tracking_number || '',
  courier: trackingData.courier || '',
  status: trackingData.status || '',
  status_detail: trackingData.status_detail || trackingData.last_message || '',
  eta: trackingData.eta || '',
  last_location: trackingData.last_location || '',
  sales_order: trackingData.sales_order || '',
  description: trackingData.description || '',
  hs_delivery_status: hsDeliveryStatus,
  // NEW: Additional fields for HubSpot deal card
  tracking_eta: trackingData.eta || '',
  tracking_last_update: new Date().toISOString()
}}];
