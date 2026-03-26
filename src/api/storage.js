import { supabase } from './supabaseClient';

/**
 * Storage helper functions for file uploads to Supabase Storage
 */

// ============================================================================
// INSPECTION DOCUMENTS BUCKET
// ============================================================================

/**
 * Upload an inspection notification PDF
 * @param {File} file - File object from input
 * @param {string} inspectionId - UUID of the inspection
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadInspectionNotification = async (file, inspectionId) => {
    const fileName = `${inspectionId}/notifications/${Date.now()}_${file.name}`;

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

    return data.publicUrl;
};

/**
 * Upload an inspection report (Flash, Interim, Final)
 * @param {File} file - File object
 * @param {string} inspectionId - UUID of the inspection
 * @param {string} reportType - 'flash' | 'interim' | 'final'
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadInspectionReport = async (file, inspectionId, reportType) => {
    const fileName = `${inspectionId}/reports/${reportType}/${Date.now()}_${file.name}`;

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

    return data.publicUrl;
};

/**
 * Upload an Inspection Release Certificate (IRC)
 * @param {File} file - File object
 * @param {string} inspectionId - UUID of the inspection
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadReleaseNote = async (file, inspectionId) => {
    const fileName = `${inspectionId}/release-notes/${Date.now()}_${file.name}`;

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

    return data.publicUrl;
};

/**
 * Upload finding photo/evidence
 * @param {File} file - Image file
 * @param {string} inspectionId - UUID of the inspection
 * @param {string} findingId - UUID of the finding
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadFindingPhoto = async (file, inspectionId, findingId) => {
    const fileName = `${inspectionId}/findings/${findingId}/${Date.now()}_${file.name}`;

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

    return data.publicUrl;
};

// ============================================================================
// INSPECTOR CVS BUCKET
// ============================================================================

/**
 * Upload inspector CV
 * @param {File} file - PDF file
 * @param {string} inspectorId - UUID of the inspector
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadInspectorCV = async (file, inspectorId) => {
    const fileName = `${inspectorId}/cv_${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
        .from('inspector-cvs')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true, // Allow replacing old CV
        });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('inspector-cvs')
        .getPublicUrl(fileName);

    return data.publicUrl;
};

// ============================================================================
// AVATARS BUCKET
// ============================================================================

/**
 * Upload user avatar/profile picture
 * @param {File} file - Image file
 * @param {string} userId - UUID of the user
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadAvatar = async (file, userId) => {
    const fileName = `${userId}/avatar_${Date.now()}.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true, // Allow replacing old avatar
        });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

    return data.publicUrl;
};

// ============================================================================
// GENERIC HELPER FUNCTIONS
// ============================================================================

/**
 * Delete a file from storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @returns {Promise<void>}
 */
export const deleteFile = async (bucket, path) => {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

    if (error) throw error;
};

/**
 * Get download URL for a file (creates a signed URL with expiration)
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise<string>} Signed URL
 */
export const getDownloadURL = async (bucket, path, expiresIn = 3600) => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
};

/**
 * List files in a specific path
 * @param {string} bucket - Bucket name
 * @param {string} path - Folder path
 * @returns {Promise<Array>} Array of file objects
 */
export const listFiles = async (bucket, path = '') => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .list(path);

    if (error) throw error;
    return data;
};
