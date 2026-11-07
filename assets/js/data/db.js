// Data-layer facade: one shared store instance per page.
import { CONFIG } from '../config.js';
import { createStore } from './store.js';

let storePromise;
export function getDB() {
  storePromise ??= createStore(CONFIG);
  return storePromise;
}

export const includeDemo = () => CONFIG.SHOW_DEMO_DATA === true;
export { CONFIG };
