/**
 * Input Validation Utilities
 * 
 * Centralized validation logic for user inputs across the application.
 * Prevents invalid data from reaching the database and provides clear error messages.
 * 
 * @module validators
 */

/**
 * Validates notification number format
 * 
 * WHY: Ensures consistent notification number format across the system.
 * Format: 8 digits - 3 letters - 2-3 letters - 3 digits
 * Example: 10612345-ABC-IR-001
 * 
 * @param {string} notificationNumber - User input
 * @returns {{valid: boolean, sanitized: string, error: string|null}}
 */
export function validateNotificationNumber(notificationNumber) {
    if (!notificationNumber) {
        return { valid: false, sanitized: '', error: 'Notification number is required' };
    }

    // Remove extra whitespace
    const trimmed = notificationNumber.trim().toUpperCase();

    // Expected format: 12345678-ABC-IR-001
    const pattern = /^\d{8}-[A-Z]{3}-[A-Z]{2,3}-\d{3}$/;

    if (!pattern.test(trimmed)) {
        return {
            valid: false,
            sanitized: trimmed,
            error: 'Invalid format. Expected: 12345678-ABC-IR-001'
        };
    }

    return { valid: true, sanitized: trimmed, error: null };
}

/**
 * Validates PO (Purchase Order) number
 * 
 * @param {string} poNumber - User input
 * @returns {{valid: boolean, sanitized: string, error: string|null}}
 */
export function validatePONumber(poNumber) {
    if (!poNumber) {
        return { valid: false, sanitized: '', error: 'PO number is required' };
    }

    const trimmed = poNumber.trim();

    // Allow alphanumeric, dashes, and forward slashes
    const pattern = /^[A-Z0-9\-\/]+$/i;

    if (!pattern.test(trimmed)) {
        return {
            valid: false,
            sanitized: trimmed,
            error: 'PO number can only contain letters, numbers, dashes, and forward slashes'
        };
    }

    return { valid: true, sanitized: trimmed.toUpperCase(), error: null };
}

/**
 * Validates email address format
 * 
 * @param {string} email - User input
 * @returns {{valid: boolean, sanitized: string, error: string|null}}
 */
export function validateEmail(email) {
    if (!email) {
        return { valid: false, sanitized: '', error: 'Email is required' };
    }

    const trimmed = email.trim().toLowerCase();

    // Basic email pattern
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!pattern.test(trimmed)) {
        return {
            valid: false,
            sanitized: trimmed,
            error: 'Invalid email format'
        };
    }

    return { valid: true, sanitized: trimmed, error: null };
}

/**
 * Validates phone number (international format)
 * 
 * @param {string} phone - User input
 * @param {boolean} [required=false] - Whether phone is required
 * @returns {{valid: boolean, sanitized: string, error: string|null}}
 */
export function validatePhoneNumber(phone, required = false) {
    if (!phone || !phone.trim()) {
        if (required) {
            return { valid: false, sanitized: '', error: 'Phone number is required' };
        }
        return { valid: true, sanitized: '', error: null };
    }

    // Remove all spaces and dashes
    const sanitized = phone.replace(/[\s\-()]/g, '');

    // Check if it starts with + and has 7-15 digits
    const pattern = /^\+?\d{7,15}$/;

    if (!pattern.test(sanitized)) {
        return {
            valid: false,
            sanitized: phone.trim(),
            error: 'Invalid phone number. Use format: +971501234567'
        };
    }

    return { valid: true, sanitized: sanitized.startsWith('+') ? sanitized : `+${sanitized}`, error: null };
}

/**
 * Validates project code format
 * 
 * @param {string} code - User input
 * @returns {{valid: boolean, sanitized: string, error: string|null}}
 */
export function validateProjectCode(code) {
    if (!code) {
        return { valid: false, sanitized: '', error: 'Project code is required' };
    }

    const trimmed = code.trim().toUpperCase();

    // Allow: PRJ-2025-001, PROJ-ABC-123, etc.
    const pattern = /^[A-Z]+-[A-Z0-9]+-[A-Z0-9]+$/;

    if (!pattern.test(trimmed)) {
        return {
            valid: false,
            sanitized: trimmed,
            error: 'Invalid format. Expected: PRJ-2025-001'
        };
    }

    return { valid: true, sanitized: trimmed, error: null };
}

/**
 * Validates date is not in the past
 * 
 * @param {string|Date} date - Date to validate
 * @param {boolean} [allowPast=false] - Whether past dates are allowed
 * @returns {{valid: boolean, sanitized: Date|null, error: string|null}}
 */
export function validateFutureDate(date, allowPast = false) {
    if (!date) {
        return { valid: false, sanitized: null, error: 'Date is required' };
    }

    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
        return { valid: false, sanitized: null, error: 'Invalid date format' };
    }

    if (!allowPast && dateObj < new Date()) {
        return {
            valid: false,
            sanitized: dateObj,
            error: 'Date cannot be in the past'
        };
    }

    return { valid: true, sanitized: dateObj, error: null };
}

/**
 * Sanitizes text input (removes potentially harmful characters)
 * 
 * WARNING: This is NOT sufficient for preventing XSS. React handles that.
 * This is for preventing database injection and ensuring clean data.
 * 
 * @param {string} text - User input
 * @param {number} [maxLength=500] - Maximum allowed length
 * @returns {{valid: boolean, sanitized: string, error: string|null}}
 */
export function sanitizeText(text, maxLength = 500) {
    if (!text) {
        return { valid: true, sanitized: '', error: null };
    }

    // Remove control characters but keep newlines and tabs
    let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Check length
    if (sanitized.length > maxLength) {
        return {
            valid: false,
            sanitized: sanitized.substring(0, maxLength),
            error: `Text exceeds maximum length of ${maxLength} characters`
        };
    }

    return { valid: true, sanitized, error: null };
}

/**
 * Validates file upload
 * 
 * @param {File} file - File object
 * @param {Object} options - Validation options
 * @param {Array<string>} [options.allowedTypes] - Allowed MIME types
 * @param {number} [options.maxSize] - Max size in bytes (default: 10MB)
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateFileUpload(file, options = {}) {
    const {
        allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        maxSize = 10 * 1024 * 1024 // 10MB default
    } = options;

    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
        };
    }

    // Check file size
    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `File too large. Maximum size: ${maxSizeMB}MB`
        };
    }

    return { valid: true, error: null };
}

/**
 * Batch validates multiple fields
 * 
 * @param {Object} validators - Object mapping field names to validator functions
 * @param {Object} values - Object with field values
 * @returns {{valid: boolean, errors: Object}} Map of field names to error messages
 * 
 * @example
 * const { valid, errors } = batchValidate(
 *   {
 *     email: validateEmail,
 *     phone: (phone) => validatePhoneNumber(phone, true),
 *   },
 *   { email: 'test@example.com', phone: '+971501234567' }
 * );
 */
export function batchValidate(validators, values) {
    const errors = {};
    let valid = true;

    for (const [field, validator] of Object.entries(validators)) {
        const result = validator(values[field]);
        if (!result.valid) {
            errors[field] = result.error;
            valid = false;
        }
    }

    return { valid, errors };
}
