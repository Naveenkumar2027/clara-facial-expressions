import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Note: loadEnv only loads from .env files, not process.env directly.
  const env = loadEnv(mode, process.cwd(), '');
  
  // On Vercel, env vars from settings are in process.env.
  // Locally, they might be in .env loaded into `env`.
  const apiKey = env.API_KEY || process.env.API_KEY;

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});