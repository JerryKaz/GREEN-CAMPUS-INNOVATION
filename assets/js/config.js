// =============================================================================
// SITE CONFIGURATION: edit these values, commit, and the site updates on the
// next deployment. No build step and no secrets: everything here is public.
// (The admin password lives in assets/js/admin-config.js.)
// =============================================================================
export const CONFIG = {
  // Public address once the custom domain is live. Used only for links/metadata.
  // Leave as-is until the domain is purchased; nothing breaks while it is a placeholder.
  SITE_URL: 'https://your-domain.example',

  // Map starting position. Replace with the verified coordinates of the VVU
  // campus centre. (Only locations the admin marks as verified appear on the map.)
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
