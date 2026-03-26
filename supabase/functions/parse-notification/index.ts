import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Debug logging to verify key presence
console.log('Edge Function Environment Check:');
console.log('GEMINI_API_KEY present:', !!GEMINI_API_KEY);
if (GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY length:', GEMINI_API_KEY.length);
    console.log('GEMINI_API_KEY start:', GEMINI_API_KEY.substring(0, 4) + '...');
} else {
    console.error('CRITICAL: GEMINI_API_KEY is missing from environment variables');
}

if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
        temperature: 0.1, // Low temperature for consistent extraction
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
    }
});

/**
 * Supabase Edge Function to parse Inspection Notification PDFs using Google Gemini
 * Extracts structured data: PO number, dates, supplier info, items, etc.
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
        const { fileUrl, fileName, customPrompt, jsonSchema } = await req.json();

        console.log('=== PARSE REQUEST DEBUG ===');
        console.log('fileUrl:', fileUrl);
        console.log('fileName:', fileName);
        console.log('customPrompt provided:', !!customPrompt);
        console.log('customPrompt length:', customPrompt?.length || 0);
        console.log('jsonSchema provided:', !!jsonSchema);

        if (!fileUrl) {
            return new Response(
                JSON.stringify({ error: 'fileUrl is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Fix URL for Docker environment - replace localhost with host.docker.internal
        const dockerFileUrl = fileUrl.replace('http://127.0.0.1:54321', 'http://host.docker.internal:54321');

        // Fetch the PDF file
        console.log(`Fetching PDF from: ${dockerFileUrl}`);
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

        // Use custom prompt if provided, otherwise use default notification parsing prompt
        const prompt = customPrompt || `You are an expert at extracting information from industrial inspection notification documents.

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
4. Extract ALL items from tables - don't skip any rows
5. For inspection_activities, extract EVERY row from ITP (Inspection Test Plan) tables
6. Include intervention points exactly as shown (W, H, R, or combinations like W/H)
7. Be precise with numbers, codes, and contact information
8. Extract latitude/longitude if coordinates are mentioned anywhere
9. Consolidate all_inspection_dates as a single readable string
10. If subsupplier is not mentioned separately, use supplier name
11. Extract notification_revision from document header, footer, or revision block
12. Look for dates in document metadata, headers, and date stamps for notification_receipt_date`;

        // Call Gemini API
        console.log('Calling Gemini API...');
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

        // Parse JSON (remove markdown code blocks if present)
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

        // Return extracted data
        return new Response(
            JSON.stringify({
                success: true,
                data: extractedData,
                metadata: {
                    file_name: fileName,
                    processed_at: new Date().toISOString(),
                    model: 'gemini-2.0-flash-exp'
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
        console.error('Error processing PDF:', error);
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
