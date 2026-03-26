import { supabase } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Call Gemini REST API directly to bypass Edge Function 5s timeouts
 */
export const callGeminiDirectly = async (fileUrl, prompt, fileName) => {
    if (!GEMINI_API_KEY) {
        throw new Error("VITE_GEMINI_API_KEY is not set in .env.local");
    }

    try {
        // Fetch PDF and convert to Base64
        const pdfResponse = await fetch(fileUrl);
        const pdfBlob = await pdfResponse.blob();

        const base64Pdf = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const b64 = reader.result.split(',')[1];
                resolve(b64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(pdfBlob);
        });

        // Add a safety instruction to the prompt to prevent massive token outputs
        const safePrompt = prompt + "\n\nCRITICAL: Keep 'description' and 'remarks' fields concise to avoid exceeding response lengths. Ensure the output is well-formed JSON.";

        // Call Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
                            { text: safePrompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("No text returned from Gemini");
        }

        // Clean up text in case of trailing commas or slight anomalies before parsing
        text = text.trim();

        // Parse JSON with robust handling
        try {
            return JSON.parse(text);
        } catch (jsonError) {
            console.error("Failed to parse JSON, attempting repair on:", text.substring(text.length - 200));
            // Hack for truncated JSON: try appending brackets
            try {
                if (text.endsWith('}')) return JSON.parse(text + ']}');
                if (text.endsWith('"}')) return JSON.parse(text + ']}');
                if (text.endsWith('"')) return JSON.parse(text + '}]}');
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) return JSON.parse(jsonMatch[0]);
                throw jsonError;
            } catch (fallbackError) {
                throw new Error(`JSON Syntax Error from Gemini: ${jsonError.message}. The document is likely too large causing truncated output.`);
            }
        }
    } catch (error) {
        console.error("Error in direct Gemini call:", error);
        throw error;
    }
};

/**
 * Parse an inspection notification PDF to extract structured data
 * @param {string} fileUrl - Public URL of the uploaded PDF
 * @param {string} fileName - Original filename
 * @returns {Promise<Object>} Extracted inspection data
 */
export const parseInspectionNotification = async (fileUrl, fileName) => {
    console.log("Parsing notification directly via client...", fileName);
    const prompt = `You are an expert at extracting information from industrial inspection notification documents.

Extract ALL the following information from this Inspection Notification PDF and return it as a JSON object.
Be EXTREMELY thorough and detailed. Extract every piece of information, even if it seems minor.

{
  "po_number": "Purchase Order number",
  "notification_number": "Notification/Inspection reference number",
  "notification_revision": "Revision or version number of the notification (e.g., Rev 0, Rev A, V1.2)",
  "notification_receipt_date": "CRITICAL: This is ALWAYS the FIRST DATE that appears on the TOP LEFT of the document (usually labeled 'Date'). Extract this date in ISO format YYYY-MM-DD. This is NOT an inspection date.",
  
  "supplier_name": "Name of the supplier to whom the PO is issued",
  "subsupplier_name": "Manufacturer or sub-supplier name (may be same as supplier)",
  "vendor_contact_name": "Contact person name at vendor/manufacturer",
  "vendor_contact_phone": "Contact phone number",
  "vendor_contact_email": "Contact email address",
  
  "country": "Country where inspection will take place",
  "inspection_location": "Complete address or location for the inspection",
  "latitude": "Latitude coordinate if mentioned (decimal format)",
  "longitude": "Longitude coordinate if mentioned (decimal format)",
  "start_date": "Earliest inspection date in ISO format (YYYY-MM-DD)",
  "end_date": "Latest inspection date in ISO format (YYYY-MM-DD)",
  "all_inspection_dates": "Consolidated string of ALL inspection dates mentioned, including from tables/schedules",
  "inspection_time": "General time of inspection (e.g., '10:00 AM', '09:00-17:00')",
  
  "po_description": "Description of the Purchase Order",
  "inspection_type": "Type of inspection (e.g., Building, Fire Safety, Health, Pre-shipment, Final, etc.)",
  
  "items_being_offered": [
    {
      "itemNumber": "PO item number",
      "description": "Full item description with specifications",
      "quantity": "Quantity with unit (e.g., '5 EA', '100 KG', '50 meters')"
    }
  ],
  
  "inspection_activities": [
    {
      "date": "Date of the activity (YYYY-MM-DD)",
      "time": "Time of the activity",
      "itp_step": "ITP Step Number or reference",
      "activity": "Description of the activity or test",
      "supplier": "Supplier intervention (W=Witness, H=Hold, R=Review, or blank)",
      "contractor": "Contractor intervention (W/H/R or blank)",
      "company_tpa": "Company/TPA intervention (W/H/R or blank)",
      "remarks": "Any remarks or notes for this activity"
    }
  ],
  
  "notes": "Any additional relevant notes, special instructions, or requirements from the notification"
}

CRITICAL EXTRACTION RULES:
1. Return ONLY valid JSON, no markdown or code blocks
2. Use null for fields that don't exist in the document
3. All dates MUST be in YYYY-MM-DD format
4. WARNING: If table has more than 20 items, ONLY extract the first 20 items. You MUST leave space for the rest of the document!
5. For inspection_activities, extract up to the first 20 rows from ITP (Inspection Test Plan) tables.
6. Include intervention points exactly as shown (W, H, R, or combinations like W/H)
7. Keep all "description" text extremely brief (under 15 words) to save space.
8. Extract latitude/longitude if coordinates are mentioned anywhere
9. Consolidate all_inspection_dates as a single readable string
10. If subsupplier is not mentioned separately, use supplier name
11. Extract notification_revision from document header, footer, or revision block
12. Look for dates in document metadata, headers, and date stamps for notification_receipt_date`;

    return await callGeminiDirectly(fileUrl, prompt, fileName);
};

/**
 * Parse an inspection report PDF to extract findings and observations
 * @param {string} fileUrl - Public URL of the uploaded PDF
 * @param {string} fileName - Original filename
 * @param {string} reportType - 'flash' | 'interim' | 'final'
 * @returns {Promise<Object>} Extracted report data with findings
 */
export const parseInspectionReport = async (fileUrl, fileName, reportType) => {
    console.log("Parsing report directly via client...", fileName);
    const prompt = `You are an expert at analyzing industrial inspection reports and quality control documents.

MISSION: Extract ALL findings, non-conformances (NCRs), observations, defects, issues, problems, concerns, and test results from this ${reportType || 'inspection'} report PDF.

THIS IS CRITICAL: Be EXTREMELY thorough. This data is used for compliance tracking, quality management, and corrective action follow-up. Missing a finding could have serious consequences.

Return the information as a JSON object with this EXACT structure:

{
  "report_summary": "Brief summary of the inspection report",
  "inspection_date": "Date of inspection in YYYY-MM-DD format",
  "inspector_name": "Name of inspector who conducted the inspection",
  "overall_result": "Overall result: PASS, FAIL, or CONDITIONAL",
  "findings": [
    {
      "id": "Unique identifier from document (e.g., NCR-001, OBS-001, Finding #1)",
      "type": "Classification: NCR, Concern, Observation, Defect, Issue, Non-Conformance, Rejection, etc.",
      "severity": "Impact level: Critical, Major, Minor, or leave null if not specified",
      "description": "EXTREMELY DETAILED description of what was found - be thorough, capture ALL details",
      "item_reference": "Specific item number, clause, section, drawing reference, or identifier pinpointing the finding",
      "location": "Location/area where finding was observed (can be same as item_reference)",
      "requirement_reference": "Reference to requirement/standard/specification violated",
      "corrective_action_required": "Required corrective action or remediation",
      "status": "Current status: Open, Closed, or Pending (if mentioned in document)",
      "photo_references": ["List of photo/figure/image references from the report"]
    }
  ],
  "test_results": [
    {
      "test_name": "Name of test performed",
      "result": "Result value or outcome",
      "unit": "Unit of measurement",
      "specification": "Required specification/acceptance criteria",
      "status": "pass or fail"
    }
  ],
  "recommendations": "General recommendations from inspector",
  "next_steps": "Recommended next steps or follow-up actions"
}

KEYWORDS TO ACTIVELY SEARCH FOR (extract findings when you see these):
- "Non-Conformance Reports (NCR)", "Non-Conformance", "NCR"
- "Defects", "Defective", "Deficiency"
- "Issues", "Problems", "Concerns"
- "Observations", "Noted", "Observed"
- "Discrepancies", "Deviations"
- "Rejections", "Rejected", "Not Accepted"
- "Rework required", "Requires rework"
- "Hold points", "Hold", "Stop work"
- "Not acceptable", "Unacceptable", "Failed"
- "Damage", "Damaged", "Deterioration"
- "Missing documentation", "Documentation missing"
- "Out of specification", "Out of spec", "Does not meet spec"
- "Corrective action", "Follow-up required"
- "Monitoring required", "To be monitored"

WHERE TO LOOK:
1. Main body text of the report
2. ALL tables (especially ITP/check tables)
3. Checklists and inspection forms
4. Bullet point lists
5. Remarks/comments columns
6. Summary sections
7. Conclusions and recommendations
8. Appendices and attachments mentioned

CRITICAL EXTRACTION RULES:
1. Return ONLY valid JSON, no markdown or explanatory text
2. Extract EVERY SINGLE finding - check EVERY table row, checklist item, and section
3. Use null for fields that don't exist in the document
4. For 'type': capture the exact classification used in the document (NCR, Observation, etc.)
5. For 'severity': only set if explicitly mentioned or strongly implied
6. For 'item_reference': be SPECIFIC - include item numbers, clause numbers, drawing references
7. For 'description': be EXTREMELY detailed - capture the full context and details
8. For 'status': only set if explicitly mentioned in the document
9. Include EVERY test result from tables
10. Don't skip findings in tables - extract ALL rows
11. This is for compliance and quality tracking - be thorough!`;

    return await callGeminiDirectly(fileUrl, prompt, fileName);
};

/**
 * Upload and automatically parse an inspection notification
 * @param {File} file - PDF file to upload
 * @param {string} projectId - Optional project ID for organization
 * @returns {Promise<Object>} Parsed inspection data ready to save
 */
export const uploadAndParseNotification = async (file, projectId = null) => {
    try {
        // 1. Upload to storage
        const { uploadInspectionNotification } = await import('./storage');
        // Create temporary inspection ID for organizing files
        const tempId = crypto.randomUUID();
        const fileUrl = await uploadInspectionNotification(file, tempId);

        // 2. Parse with AI
        const parsedData = await parseInspectionNotification(fileUrl, file.name);

        // 3. Combine data
        return {
            ...parsedData,
            project_id: projectId,
            notification_file_url: fileUrl,
            status: 'received',
            created_at: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error in upload and parse workflow:', error);
        throw error;
    }
};

/**
 * Upload and automatically parse an inspection report
 * @param {File} file - PDF file to upload
 * @param {string} inspectionId - UUID of the inspection
 * @param {string} reportType - 'flash' | 'interim' | 'final'
 * @returns {Promise<Object>} Parsed report data ready to append to inspection
 */
export const uploadAndParseReport = async (file, inspectionId, reportType) => {
    try {
        // 1. Upload to storage
        const { uploadInspectionReport } = await import('./storage');
        const fileUrl = await uploadInspectionReport(file, inspectionId, reportType);

        // 2. Parse with AI
        const parsedData = await parseInspectionReport(fileUrl, file.name, reportType);

        // 3. Get current user for uploaded_by field
        const { data: { user } } = await supabase.auth.getUser();

        // 4. Format for inspection_reports JSONB array
        return {
            id: crypto.randomUUID(),
            type: reportType,
            upload_date: new Date().toISOString(),
            report_url: fileUrl,
            uploaded_by: user?.id || null,
            findings: parsedData.findings || [],
            report_summary: parsedData.report_summary || '',
            overall_result: parsedData.overall_result || 'PENDING',
            test_results: parsedData.test_results || [],
            recommendations: parsedData.recommendations || '',
            approval_status: 'pending',
            approved_by: null,
            approval_date: null,
            rejection_reason: null,
        };
    } catch (error) {
        console.error('Error in upload and parse report workflow:', error);
        throw error;
    }
};

/**
 * Helper to append a new report to an existing inspection's inspection_reports array
 * @param {string} inspectionId - UUID of the inspection
 * @param {Object} reportData - Parsed report data from uploadAndParseReport
 * @returns {Promise<Object>} Updated inspection
 */
export const addReportToInspection = async (inspectionId, reportData) => {
    try {
        // Get current inspection
        const { data: inspection, error: fetchError } = await supabase
            .from('inspections')
            .select('inspection_reports')
            .eq('id', inspectionId)
            .single();

        if (fetchError) throw fetchError;

        // Append new report to array
        const updatedReports = [
            ...(inspection.inspection_reports || []),
            reportData
        ];

        // Update inspection
        const { data, error } = await supabase
            .from('inspections')
            .update({ inspection_reports: updatedReports })
            .eq('id', inspectionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding report to inspection:', error);
        throw error;
    }
};
