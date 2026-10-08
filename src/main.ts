import './app.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { mount } from 'svelte';
import App from './App.svelte';

document.addEventListener('gesturestart', (e) => e.preventDefault());
mount(App, { target: document.getElementById('app')! });
