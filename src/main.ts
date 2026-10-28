import { mount } from 'svelte';
import App from './app/App.svelte';
import { guardBackNavigation } from './platform/history-guard';
import './app/styles/tokens.css';
import './app/styles/base.css';

const target = document.getElementById('app');
if (!target) throw new Error('#app element is missing');

guardBackNavigation();

export default mount(App, { target });
