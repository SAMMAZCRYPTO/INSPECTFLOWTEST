# Supabase Edge Functions Configuration

This directory contains Supabase Edge Functions for AI-powered PDF parsing.

## Functions

### 1. `parse-notification`
Parses inspection notification PDFs using Google Gemini.

**Extracts:**
- PO number
- Notification number
- Supplier information
- Dates (notification, start, completion)
- Location details
- Items being offered (with quantities, specs)

**Usage:**
```javascript
POST /functions/v1/parse-notification
{
  "fileUrl": "https://...",
  "fileName": "notification.pdf"
}
```

### 2. `parse-report`
Parses inspection report PDFs to extract findings and NCRs.

**Extracts:**
- Findings (NCRs, observations, recommendations)
- Severity levels
- Test results
- Overall report summary
- Inspector recommendations

**Usage:**
```javascript
POST /functions/v1/parse-report
{
  "fileUrl": "https://...",
  "fileName": "report.pdf",
  "reportType": "final"
}
```

## Local Development

**Deploy functions locally:**
```bash
npx supabase functions serve
```

**Test a function:**
```bash
curl -X POST http://localhost:54321/functions/v1/parse-notification \
  -H "Content-Type: application/json" \
  -d '{"fileUrl":"https://example.com/file.pdf","fileName":"test.pdf"}'
```

## Environment Variables

Functions require `GEMINI_API_KEY` to be set:

```bash
# Set locally
npx supabase secrets set GEMINI_API_KEY=your-api-key-here

# Verify
npx supabase secrets list
```

## Deployment

**Deploy to production:**
```bash
npx supabase functions deploy parse-notification
npx supabase functions deploy parse-report
```

## Dependencies

Both functions use:
- `@google/generative-ai` - Google Gemini SDK
- Deno runtime (built into Supabase Edge Functions)

No additional installation required - npm packages are imported via `npm:` specifier.
