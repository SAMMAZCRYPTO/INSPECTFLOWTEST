# Google Gemini AI Integration for PDF Parsing

InspectFlow uses **Google Gemini 2.0 Flash** to automatically extract structured data from inspection PDFs.

## Features

✅ **Automatic Notification Parsing** - Extract PO numbers, dates, supplier info, line items  
✅ **Report Analysis** - Identify NCRs, findings, observations, test results  
✅ **Multimodal Understanding** - Process PDFs, images, tables directly  
✅ **Structured Output** - Returns clean JSON matching database schema  
✅ **High Accuracy** - Gemini excels at technical/industrial documents

---

## Setup

### 1. Get Gemini API Key (Free)

1. Visit **https://ai.google.dev/**
2. Click **Get API key in Google AI Studio**
3. Sign in with Google account
4. Create new API key
5. Copy the key

### 2. Add to Environment

Add to your `.env.local` file:

```env
GEMINI_API_KEY=AIzaSy...your-key-here
```

### 3. Set Supabase Secret

For Edge Functions to access the key:

```bash
npx supabase secrets set GEMINI_API_KEY=AIzaSy...your-key-here
```

---

## Usage in Code

### Parse Inspection Notification

```javascript
import { uploadAndParseNotification } from '@/api/ai';

// Upload PDF and auto-extract data
const handleFileUpload = async (file) => {
  try {
    const inspectionData = await uploadAndParseNotification(
      file, 
      projectId // optional
    );
    
    // inspectionData contains:
    // - po_number
    // - notification_number
    // - supplier_name
    // - dates
    // - items_being_offered [array]
    // Ready to create inspection!
    
    await Inspection.create(inspectionData);
  } catch (error) {
    console.error('Parsing failed:', error);
  }
};
```

### Parse Inspection Report

```javascript
import { uploadAndParseReport, addReportToInspection } from '@/api/ai';

// Upload report and extract findings
const handleReportUpload = async (file, inspectionId, reportType) => {
  try {
    const reportData = await uploadAndParseReport(
      file,
      inspectionId,
      reportType // 'flash' | 'interim' | 'final'
    );
    
    // reportData contains:
    // - findings [{ type, severity, description, ... }]
    // - test_results [{ test_name, result, status, ... }]
    // - overall_result
    // - recommendations
    
    // Append to inspection
    await addReportToInspection(inspectionId, reportData);
  } catch (error) {
    console.error('Report parsing failed:', error);
  }
};
```

---

## What Gets Extracted

### From Notification PDFs

```json
{
  "po_number": "PO-12345",
  "notification_number": "NOT-001-2025",
  "supplier_name": "ABC Steel Manufacturing",
  "supplier_address": "123 Industrial Ave, Dubai",
  "notification_date": "2025-01-15",
  "start_date": "2025-01-20",
  "expected_completion_date": "2025-01-25",
  "location_name": "Site A Warehouse",
  "location_address": "Dubai Industrial City",
  "items_being_offered": [
    {
      "item_no": "1",
      "description": "Carbon Steel Pipes ASTM A106 Grade B",
      "quantity": 500,
      "unit": "meters",
      "po_line": "10",
      "specifications": "6\" SCH 40, Seamless"
    }
  ],
  "inspection_scope": "Visual, Dimensional, PMI Testing",
  "special_requirements": "Witness testing required"
}
```

### From Report PDFs

```json
{
  "report_summary": "Final inspection completed with 2 NCRs identified",
  "inspection_date": "2025-01-22",
  "inspector_name": "John Smith",
  "overall_result": "CONDITIONAL",
  "findings": [
    {
      "id": "NCR-001",
      "type": "non_conformance",
      "severity": "major",
      "description": "Surface rust observed on 5% of pipes",
      "location": "Items 45-67",
      "requirement_reference": "ASTM A106 Section 5.2",
      "corrective_action_required": "Clean and recoat affected pipes",
      "status": "open",
      "photo_references": ["Fig 3.1", "Fig 3.2"]
    },
    {
      "id": "OBS-001",
      "type": "observation",
      "severity": "minor",
      "description": "Packaging labels partially illegible",
      "location": "Lot 3",
      "corrective_action_required": "Reprint labels",
      "status": "open"
    }
  ],
  "test_results": [
    {
      "test_name": "PMI Testing",
      "result": "Pass",
      "specification": "ASTM A106 Grade B chemistry",
      "status": "pass"
    }
  ],
  "recommendations": "Release after NCR-001 correction",
  "next_steps": "Supplier to submit corrective action plan within 48 hours"
}
```

---

## Testing Locally

### Start Edge Functions Server

```bash
npx supabase functions serve
```

### Test Parse Notification

```bash
curl -X POST http://localhost:54321/functions/v1/parse-notification \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "https://example.com/notification.pdf",
    "fileName": "notification_001.pdf"
  }'
```

### Test Parse Report

```bash
curl -X POST http://localhost:54321/functions/v1/parse-report \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "https://example.com/report.pdf",
    "fileName": "final_report.pdf",
    "reportType": "final"
  }'
```

---

## Pricing

**Gemini 2.0 Flash (Free Tier):**
- ✅ 15 requests per minute
- ✅ 1,500 requests per day
- ✅ Free forever

**More than enough for typical inspection workflows!**

For higher volume, Gemini pricing is very affordable:
- $0.075 per 1M input tokens
- $0.30 per 1M output tokens

A typical PDF inspection = ~$0.01

---

## Error Handling

The AI helpers include automatic retry and error handling:

```javascript
try {
  const data = await uploadAndParseNotification(file);
} catch (error) {
  if (error.message.includes('Failed to parse AI response')) {
    // AI returned invalid JSON - rare
    // Show manual entry form
  } else if (error.message.includes('rate limit')) {
    // Too many requests - wait and retry
  } else {
    // Network or other error
  }
}
```

---

## Manual Review Workflow

**Best Practice:** Always allow users to review AI extractions before saving:

```javascript
const [extractedData, setExtractedData] = useState(null);
const [showReviewDialog, setShowReviewDialog] = useState(false);

const handleUpload = async (file) => {
  const data = await uploadAndParseNotification(file);
  setExtractedData(data);
  setShowReviewDialog(true); // Let user review/edit
};

const handleConfirm = async () => {
  await Inspection.create(extractedData);
  setShowReviewDialog(false);
};
```

---

## Deployment

When deploying to production:

```bash
# Deploy Edge Functions
npx supabase functions deploy parse-notification
npx supabase functions deploy parse-report

# Set production secret
npx supabase secrets set GEMINI_API_KEY=your-production-key --project-ref your-project
```

---

## Summary

✅ **2 Edge Functions** for parsing notifications and reports  
✅ **Frontend helpers** for easy integration (`ai.js`)  
✅ **Structured JSON** output matching database schema  
✅ **Free tier** supports typical usage  
✅ **High accuracy** on technical documents  

**Next:** Get your free Gemini API key and test it! 🚀
