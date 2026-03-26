/**
 * Backward compatibility layer for Base44 client
 * Now re-exports Supabase-based entities with Base44-compatible API
 */
import * as entities from './entities';
import { uploadAndParseNotification, callGeminiDirectly } from './ai';
import { supabase } from './supabaseClient';

// Re-export all entities as base44 for backward compatibility
export const base44 = {
  auth: entities.auth,
  // Add other entities as needed by the app
  Inspection: entities.Inspection,
  Inspector: entities.Inspector,
  TPIAgency: entities.TPIAgency,
  Project: entities.Project,
  InspectionAttendance: entities.InspectionAttendance,
  InspectionReview: entities.InspectionReview,
  User: entities.User,
  entities: {
    Inspection: entities.Inspection,
    Inspector: entities.Inspector,
    TPIAgency: entities.TPIAgency,
    Project: entities.Project,
    InspectionAttendance: entities.InspectionAttendance,
    InspectionReview: entities.InspectionReview,
    User: entities.User,
  },
  // Base44-compatible file integration
  integrations: {
    Core: {
      /**
       * Upload a file to Supabase Storage
       * @param {Object} params - { file: File }
       * @returns {Promise<{file_url: string}>}
       */
      UploadFile: async ({ file }) => {
        try {
          // Upload to  temporary storage location
          const tempId = crypto.randomUUID();
          const fileName = `temp/${tempId}/${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from('inspection-documents')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from('inspection-documents')
            .getPublicUrl(fileName);

          return { file_url: data.publicUrl };
        } catch (error) {
          console.error('Upload error:', error);
          throw error;
        }
      },

      /**
       * Extract data from an uploaded file using Gemini AI
       * @param {Object} params - { file_url: string, json_schema: Object }
       * @returns {Promise<{status: string, output: Object, details?: string}>}
       */
      ExtractDataFromUploadedFile: async ({ file_url, json_schema }) => {
        try {
          // Use direct Gemini call instead of Edge Function
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

          const result = await callGeminiDirectly(file_url, prompt, file_url.split('/').pop());

          return {
            status: 'success',
            output: result
          };
        } catch (error) {
          console.error('Extraction error:', error);
          return {
            status: 'error',
            output: null,
            details: error.message || 'Failed to extract data'
          };
        }
      },

      /**
       * Invoke Gemini LLM for analysis
       * @param {Object} params - { prompt: string, file_urls: string[], response_json_schema: Object }
       * @returns {Promise<Object>} Extracted data
       */
      InvokeLLM: async ({ prompt, file_urls, response_json_schema }) => {
        try {
          // Use direct Gemini call instead of Edge Function
          const finalPrompt = `${prompt}\n\nStrictly return a JSON object matching this schema: ${JSON.stringify(response_json_schema)}. Return ONLY valid JSON, no markdown blocks.`;

          const result = await callGeminiDirectly(file_urls[0], finalPrompt, file_urls[0].split('/').pop());

          return result;
        } catch (error) {
          console.error('LLM invocation error:', error);
          throw error;
        }
      },
    },
  },
};
