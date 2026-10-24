/**
 * F-Droid compatibility export.
 *
 * BlueNote's F-Droid flavor uses the same open-source Supabase Auth and
 * per-user workspace API as the other builds. No Firebase SDK or proprietary
 * authentication provider is required.
 */
export * from './supabaseClient';
