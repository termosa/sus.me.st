import { useRegisterSW } from 'virtual:pwa-register/svelte';

/**
 * A new version installs in the background and waits. The app offers it only
 * between games, and it activates only on that explicit tap (never mid-game).
 */
export const { needRefresh, updateServiceWorker } = useRegisterSW();

export const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
export const isStandalone = matchMedia('(display-mode: standalone)').matches;
