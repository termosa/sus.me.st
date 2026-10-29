import type { PlayerCount } from '../engine/rules';

/**
 * Where the start screen is: no count yet (how many players?), or a count picked (how are
 * roles dealt?). Kept outside the screen so backing out of the deal returns to the second.
 */
export const setupStep: { count: PlayerCount | null } = $state({ count: null });
