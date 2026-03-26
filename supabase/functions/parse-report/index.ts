import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
    }
});

/**
 * Supabase Edge Function to parse Inspection Report PDFs using Google Gemini
 * Extracts findings, NCRs, observations, test results, and approval status
 */
Deno.serve(async (req) => {
    // CORS headers
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        });
    }

    try {
        const { fileUrl, fileName, reportType = 'interim' } = await req.json();

        if (!fileUrl) {
            return new Response(
                JSON.stringify({ error: 'fileUrl is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Fix URL for Docker environment - replace localhost with host.docker.internal
        const dockerFileUrl = fileUrl.replace('http://127.0.0.1:54321', 'http://host.docker.internal:54321');

        // Fetch the PDF file
        console.log(`Fetching report PDF from: ${dockerFileUrl}`);
        const pdfResponse = await fetch(dockerFileUrl);
        if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
        }


        const pdfBuffer = await pdfResponse.arrayBuffer();

        // Convert to base64 in chunks to avoid stack overflow on large files
        const uint8Array = new Uint8Array(pdfBuffer);
        let binary = '';
        const chunkSize = 8192; // Process in 8KB chunks
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
            binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64Pdf = btoa(binary);

        // Comprehensive prompt for report extraction with all finding types
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

        // Call Gemini API
        console.log('Calling Gemini API for report parsing...');
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: base64Pdf
                }
            },
            { text: prompt }
        ]);

        const response = result.response;
        const text = response.text();

        console.log('Raw Gemini response:', text);

        // Parse JSON
        let extractedData;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                extractedData = JSON.parse(jsonMatch[0]);
            } else {
                extractedData = JSON.parse(text);
            }
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            return new Response(
                JSON.stringify({
                    error: 'Failed to parse AI response',
                    raw_response: text
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Add metadata
        const formattedData = {
            type: reportType || 'general',
            upload_date: new Date().toISOString(),
            report_url: fileUrl,
            uploaded_by: null, // Will be set by caller
            ...extractedData,
            approval_status: 'pending',
            approved_by: null,
            approval_date: null,
            rejection_reason: null
        };

        // Return extracted data
        return new Response(
            JSON.stringify({
                success: true,
                data: formattedData,
                metadata: {
                    file_name: fileName,
                    report_type: reportType,
                    processed_at: new Date().toISOString(),
                    model: 'gemini-2.0-flash-exp',
                    findings_count: extractedData.findings?.length || 0
                }
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );

    } catch (error) {
        console.error('Error processing report PDF:', error);
        return new Response(
            JSON.stringify({
                error: error.message,
                stack: error.stack
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
});
