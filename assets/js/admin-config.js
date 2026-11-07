// =============================================================================
// ADMIN PANEL CONFIGURATION
//
// To change the admin password: edit ADMIN_PASSWORD below, save, commit and
// redeploy. That is the only change needed.
//
// IMPORTANT, PLEASE READ:
// This password is a DEMONSTRATION-LEVEL ACCESS GATE, not security. The site
// is static (GitHub Pages) with no server, so this file is downloaded by every
// browser that opens the admin page and anyone who views the source can read
// it. It keeps casual visitors out of the admin screens during a presentation;
// it does NOT protect data. Never store sensitive information in this app.
// Real protection needs a backend or an external identity provider (see README).
// =============================================================================
export const ADMIN_CONFIG = {
  ADMIN_PASSWORD: 'VVU2026',

  // Sign out automatically after this many minutes without activity.
  IDLE_TIMEOUT_MINUTES: 30,

  // Maximum session length in hours, even while active.
  MAX_SESSION_HOURS: 8,
};
