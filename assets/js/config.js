// =============================================================================
// SITE CONFIGURATION: edit these values, commit, and the site updates on the
// next deployment. No build step and no secrets: everything here is public.
// (The admin password lives in assets/js/admin-config.js.)
// =============================================================================
export const CONFIG = {
  // Public address once the custom domain is live. Used only for links/metadata.
  // Leave as-is until the domain is purchased; nothing breaks while it is a placeholder.
  SITE_URL: 'https://your-domain.example',

  // Seed the browser database with clearly labelled DEMONSTRATION records the
  // first time the site opens on a device (only when the database is empty).
  // Set to false once the group is presenting verified data.
  SEED_DEMO_DATA: true,

  // Show demonstration records on public pages (always labelled "DEMO DATA").
  SHOW_DEMO_DATA: true,

  // Map starting position. PLACEHOLDER: this is NOT a verified campus point.
  // Replace with the verified coordinates of the VVU campus centre.
  MAP_CENTER: [5.6037, -0.187], // generic Accra placeholder
  MAP_ZOOM: 16,
  MAP_CENTER_VERIFIED: false,

  // Project identity shown on the site.
  PROJECT: {
    name: 'Green Campus Process Innovation',
    group: 'Group 5',
    institution: 'Valley View University, Ghana',
    focus: 'Water Conservation',
    app: 'VVU WaterWatch',
  },
};
