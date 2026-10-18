/**
 * Compatibility export for existing BlueNote imports.
 * Authentication and cross-device workspace sync now use the dedicated
 * BlueNote Supabase project. No Firebase SDK is initialized here.
 */
export * from './supabaseClient';
