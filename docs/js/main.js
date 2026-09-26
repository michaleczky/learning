// Main entry point for Vue app
import App from './components/App.js';

// Mount the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = Vue.createApp(App);
  app.mount('#app');
});
