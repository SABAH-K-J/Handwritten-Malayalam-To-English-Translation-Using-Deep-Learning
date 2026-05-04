import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/predict': 'http://127.0.0.1:8000',
      '/detect-corners': 'http://127.0.0.1:8000',
      '/translate': 'http://127.0.0.1:8000',
      '/generate-pdf': 'http://127.0.0.1:8000',
      '/tts': 'http://127.0.0.1:8000'
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
        output: {
            manualChunks: {
                vendor: ['react', 'react-dom', 'react-router-dom'],
                ui: ['@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge', 'lucide-react'],
                query: ['@tanstack/react-query'],
            }
        }
    }
  }
}));
