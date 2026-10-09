import './app.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { mount } from 'svelte';
import { laadLettertypes } from './assets/fonts';
import App from './App.svelte';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });
void laadLettertypes();
document.addEventListener('gesturestart', (e) => e.preventDefault());
mount(App, { target: document.getElementById('app')! });
