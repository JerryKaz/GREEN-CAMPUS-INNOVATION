// Data-layer facade. Picks the Supabase adapter when configured, otherwise the
// in-browser demo adapter, so the site always runs (e.g. for the assessment panel).
import { CONFIG } from '../config.js';

let adapterPromise;

export function getDB() {
  adapterPromise ??= (async () => {
    if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
      const { createSupabaseAdapter } = await import('./supabase-adapter.js');
      return createSupabaseAdapter(CONFIG);
    }
    const { createLocalAdapter } = await import('./local-adapter.js');
    return createLocalAdapter(CONFIG);
  })();
  return adapterPromise;
}

export const includeDemo = () => CONFIG.SHOW_DEMO_DATA === true;
export { CONFIG };
