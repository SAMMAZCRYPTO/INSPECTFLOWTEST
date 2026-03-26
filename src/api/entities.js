import { supabase } from './supabaseClient';

/**
 * Generic CRUD operations wrapper for Supabase tables
 * Maintains compatibility with existing Base44 entity API pattern
 */
const createEntityWrapper = (tableName) => ({
    /**
     * List records with optional filtering
     * @param {Object} filters - Key-value pairs for filtering (e.g., { status: 'active' })
     * @param {Object} options - Query options { orderBy, limit, offset, select }
     * @returns {Promise<Array>} Array of records
     */
    list: async (filters = {}, options = {}) => {
        // Handle legacy calling pattern: .list("-created_date")
        // The "-" prefix indicates descending order
        if (typeof filters === 'string') {
            const orderStr = filters;
            let column, direction;

            if (orderStr.startsWith('-')) {
                column = orderStr.substring(1); // Remove the "-" prefix
                direction = 'desc';
            } else {
                column = orderStr;
                direction = 'asc';
            }

            return await createEntityWrapper(tableName).list({}, { orderBy: `${column}:${direction}` });
        }

        // Ensure filters is always an object (not array, not null, etc.)
        if (typeof filters !== 'object' || Array.isArray(filters) || filters === null) {
            filters = {};
        }

        let query = supabase.from(tableName).select(options.select || '*');

        // Apply filters - now guaranteed to be an object
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query = query.eq(key, value);
            }
        });

        // Apply ordering
        if (options.orderBy) {
            const [column, direction = 'asc'] = options.orderBy.split(':');
            query = query.order(column, { ascending: direction === 'asc' });
        }

        // Apply pagination
        if (options.limit) query = query.limit(options.limit);
        if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    /**
     * Get a single record by ID
     * @param {string} id - UUID of the record
     * @returns {Promise<Object>} Single record
     */
    get: async (id) => {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new record
     * @param {Object} payload - Data to insert
     * @returns {Promise<Object>} Created record
     */
    create: async (payload) => {
        const { data, error } = await supabase
            .from(tableName)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing record
     * @param {string} id - UUID of the record
     * @param {Object} payload - Data to update
     * @returns {Promise<Object>} Updated record
     */
    update: async (id, payload) => {
        const { data, error } = await supabase
            .from(tableName)
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a record
     * @param {string} id - UUID of the record
     * @returns {Promise<void>}
     */
    delete: async (id) => {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Count records matching filters
     * @param {Object} filters - Key-value pairs for filtering
     * @returns {Promise<number>} Count of matching records
     */
    count: async (filters = {}) => {
        let query = supabase.from(tableName).select('*', { count: 'exact', head: true });

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query = query.eq(key, value);
            }
        });

        const { count, error } = await query;
        if (error) throw error;
        return count;
    },

    /**
     * Subscribe to real-time changes
     * @param {Function} callback - Called with { event, payload } on changes
     * @param {Object} filters - Optional filters for subscription
     * @returns {Object} Subscription object with unsubscribe method
     */
    subscribe: (callback, filters = {}) => {
        const channel = supabase
            .channel(`${tableName}_changes`)
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: tableName,
                    ...filters
                },
                callback
            )
            .subscribe();

        return {
            unsubscribe: () => {
                supabase.removeChannel(channel);
            }
        };
    },
});

// ============================================================================
// ENTITY EXPORTS
// These replace the Base44 entity imports
// ============================================================================

export const Inspection = createEntityWrapper('inspections');
export const Inspector = createEntityWrapper('inspectors');
export const TPIAgency = createEntityWrapper('tpi_agencies');
export const Project = createEntityWrapper('projects');
export const InspectionAttendance = createEntityWrapper('inspection_attendance');
export const InspectionReview = createEntityWrapper('inspection_reviews');

// ============================================================================
// AUTHENTICATION
// Replaces base44.auth
// ============================================================================

export const User = {
    /**
     * List all users (calls RPC function)
     * @param {string} orderBy - Optional order parameter (ignored, for compatibility)
     * @returns {Promise<Array>} Array of user objects
     */
    /**
     * List all users (calls RPC function)
     * @param {string} orderBy - Optional order parameter (ignored, for compatibility)
     * @returns {Promise<Array>} Array of user objects
     */
    list: async (orderBy) => {
        const { data, error } = await supabase.rpc('get_all_users');
        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return data || [];
    },

    /**
     * Update user metadata (calls RPC function)
     * @param {string} userId - User ID
     * @param {Object} metadata - Metadata to update
     * @returns {Promise<Object>} Updated user
     */
    update: async (userId, metadata) => {
        const { data, error } = await supabase.rpc('update_user_metadata', {
            user_id: userId,
            metadata: metadata
        });

        if (error) {
            console.error('Error updating user:', error);
            throw error;
        }
        return { id: userId, ...data };
    },

    /**
     * Sign up a new user
     * @param {Object} params - { email, password, options: { data: { role, full_name } } }
     * @returns {Promise<Object>} User object
     */
    signUp: async ({ email, password, options = {} }) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: options.data?.full_name || '',
                    ...options.data,
                },
            },
        });

        if (error) throw error;
        return data;
    },

    /**
     * Sign in existing user
     * @param {Object} params - { email, password }
     * @returns {Promise<Object>} Session object
     */
    signIn: async ({ email, password }) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    /**
     * Sign out current user
     * @returns {Promise<void>}
     */
    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    /**
     * Get current session
     * @returns {Promise<Object>} Session object or null
     */
    getSession: async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },

    /**
     * Get current user
     * @returns {Promise<Object>} User object or null
     */
    getUser: async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    /**
     * Update user metadata
     * @param {Object} data - Metadata to update
     * @returns {Promise<Object>} Updated user object
     */
    updateUser: async (data) => {
        const { data: updatedUser, error } = await supabase.auth.updateUser({
            data,
        });

        if (error) throw error;
        return updatedUser;
    },

    /**
     * Reset password for email
     * @param {string} email - User's email
     * @returns {Promise<void>}
     */
    resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
    },

    /**
     * Listen to auth state changes
     * @param {Function} callback - Called with (event, session)
     * @returns {Object} Subscription object
     */
    onAuthStateChange: (callback) => {
        return supabase.auth.onAuthStateChange(callback);
    },

    /**
     * Get current user with metadata (alias for Base44 compatibility)
     * @returns {Promise<Object>} User object with metadata
     */
    me: async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        // Return user with metadata in a Base44-compatible format
        return {
            id: user?.id,
            email: user?.email,
            full_name: user?.user_metadata?.full_name || '',
            role: user?.user_metadata?.role || 'inspector',
            inspection_role: user?.user_metadata?.role || 'inspector',
            ...user?.user_metadata,
        };
    },
};

// Export auth as an alias for User for backward compatibility
export const auth = User;