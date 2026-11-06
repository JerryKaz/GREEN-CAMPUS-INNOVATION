// Copy to config.js (or run `npm run config` to build it from environment variables).
// The anon key is designed to be public: Row Level Security protects the data.
// NEVER put the service_role key in any frontend file.
export const CONFIG = {
  SUPABASE_URL: '',            // e.g. https://abcd1234.supabase.co  — leave empty for demo mode
  SUPABASE_ANON_KEY: '',       // Project Settings → API → anon public key
  SHOW_DEMO_DATA: true,        // public pages include is_demo rows (always labelled). Set false before go-live.
  MAP_CENTER: [5.6037, -0.187],// PLACEHOLDER centre (Accra). Replace with the verified campus centre.
  MAP_ZOOM: 16,
  SITE_URL: 'https://greencampusinnovation.com',
};
