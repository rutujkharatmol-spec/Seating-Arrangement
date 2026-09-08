import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function livePlanApiPlugin(): Plugin {
  return {
    name: 'live-plan-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/plan') {
          const planFilePath = path.resolve(process.cwd(), 'public', 'live-seating-plan.json');

          if (req.method === 'GET') {
            if (fs.existsSync(planFilePath)) {
              try {
                const data = fs.readFileSync(planFilePath, 'utf-8');
                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache',
                  'Access-Control-Allow-Origin': '*',
                });
                res.end(data);
                return;
              } catch {
                // fall through
              }
            }
            res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'No live plan stored yet' }));
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                const publicDir = path.resolve(process.cwd(), 'public');
                if (!fs.existsSync(publicDir)) {
                  fs.mkdirSync(publicDir, { recursive: true });
                }
                fs.writeFileSync(planFilePath, JSON.stringify(parsed, null, 2), 'utf-8');
                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                });
                res.end(JSON.stringify({ success: true, timestamp: new Date().toISOString() }));
              } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }

          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            });
            res.end();
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    livePlanApiPlugin(),
  ],
  server: {
    host: true, // Listen on 0.0.0.0 so phones on the same WiFi/hotspot can connect
    port: 5173,
  },
})
