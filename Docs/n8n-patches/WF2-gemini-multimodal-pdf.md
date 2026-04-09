# Gemini Multimodal PDF Processing Node

## Purpose
Process PDF and image attachments from carrier emails using Gemini's multimodal capabilities.
The "Extract Attachment Text" node now stores binary data in `pdf_attachments` array instead of
attempting UTF-8 decode on binary PDFs.

## Where to Add
After "Has Attachments?" YES branch, add an IF node to check if `pdf_attachments` has items:
- `{{ $json.pdf_attachments.length > 0 }}` → TRUE → Gemini Multimodal → Merge with text data
- FALSE → continue with text-only data to existing Gemini node

## Node: "Has PDF Attachments?" (If)
Condition: `{{ $json.pdf_attachments.length > 0 }}` equals `true`

## Node: "Gemini — Process Attachments" (HTTP Request)

```
Method: POST
URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
Headers:
  x-goog-api-key: {{$credentials.googleGeminiApiKey}}
  Content-Type: application/json
Body: (see code below)
```

### Body Construction (Code node before HTTP Request)

```javascript
// Build Gemini multimodal request with PDF/image inline data
const data = items[0].json;
const pdfAttachments = data.pdf_attachments || [];

const parts = [];

// Text prompt
parts.push({
  text: `Extract shipping/tracking information from the following email and attachments.
Return JSON with these fields:
- tracking_number: the tracking/shipment number
- courier_code: carrier name (dhl, ups, fedex, purolator, etc.)
- etd: estimated delivery date (ISO format if possible)
- purchase_order: PO number if present
- sales_order: SO number if present
- order_confirmation: OC number if present
- destination_country: destination country
- origin_country: origin country

Email body:
${data.email_body || ''}

Subject: ${data.subject || ''}
From: ${data.from_email || ''}`
});

// Add each PDF/image as inline data
for (const att of pdfAttachments) {
  parts.push({
    inlineData: {
      mimeType: att.mimeType,
      data: att.data  // base64 encoded
    }
  });
}

return [{
  json: {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  }
}];
```

### Response Handling
The Gemini response will contain the same structured JSON as the text-only extraction.
Merge with existing data using a Merge node (prefer Gemini PDF data over text-only data when both exist).

## Important Notes
- Gemini 2.0 Flash supports PDF and image inputs natively (no OCR library needed)
- Max file size for inline data: ~20MB per file
- For very large PDFs, consider using the File API instead of inline data
- The existing text-only Gemini node continues to work for emails without attachments
- This is an ADDITIVE change — doesn't modify existing nodes

## Credential Needed
Uses existing Google Gemini API credential (already in n8n).
