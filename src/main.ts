import { mount } from 'svelte';
import App from './app/App.svelte';
import { unlockCues } from './app/cues';
import { guardBackNavigation } from './platform/history-guard';
import './app/styles/tokens.css';
import './app/styles/base.css';

const target = document.getElementById('app');
if (!target) throw new Error('#app element is missing');

guardBackNavigation();
// After a reload mid-game the first tap may be anywhere, so every tap can unlock sound.
document.addEventListener('pointerdown', unlockCues, { capture: true });

export default mount(App, { target });
