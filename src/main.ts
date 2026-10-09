import './app.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { mount } from 'svelte';
import { laadLettertypes } from './assets/fonts';
import App from './App.svelte';
import { registerSW } from 'virtual:pwa-register';

// Bewust zonder update-callback: een nieuwe versie wordt pas actief na het sluiten van alle tabs,
// zodat een lopende collage (nog geen opslag in fase 1) nooit door een herlaad verloren gaat.
registerSW({ immediate: true });
void laadLettertypes();
document.addEventListener('gesturestart', (e) => e.preventDefault());
mount(App, { target: document.getElementById('app')! });
