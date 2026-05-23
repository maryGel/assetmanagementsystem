import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    port: 5173,
    host: true, // Expose to network
    proxy: {
      // Proxy all API requests to your Express server
      '/login': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/itemlist': 'http://localhost:3000',
      '/referentials': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/refBrand': 'http://localhost:3000',
      '/refItemClass': 'http://localhost:3000',
      '/refLocation': 'http://localhost:3000',
      '/refDepartment': 'http://localhost:3000',
      '/accessRights': 'http://localhost:3000',
      '/colorsRoute': 'http://localhost:3000',
      '/secRoutes': 'http://localhost:3000',
      '/approvalRoute': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/jo_hRoute': 'http://localhost:3000',
      '/jo_dRoute': 'http://localhost:3000',
      '/appLogsRoute': 'http://localhost:3000',
      '/tr_hRoute': 'http://localhost:3000',
      '/tr_dRoute': 'http://localhost:3000',
      '/ad_hRoute': 'http://localhost:3000',
      '/ad_dRoute': 'http://localhost:3000',
      '/assetacchRoute': 'http://localhost:3000',
      '/assetaccdRoute': 'http://localhost:3000',
      '/assetLostHRoute': 'http://localhost:3000',
      '/assetLostDRoute': 'http://localhost:3000',
      '/jo_woeRoute': 'http://localhost:3000',
      '/approval': 'http://localhost:3000',
      '/trApproval': 'http://localhost:3000',
      '/adApproval': 'http://localhost:3000',
      '/accApproval': 'http://localhost:3000',
      '/alostApproval': 'http://localhost:3000',
      '/jo_evalRoute': 'http://localhost:3000',
      '/companyConfig': 'http://localhost:3000',
    }
  },
  // Add base URL for Vercel
  base: './'
})