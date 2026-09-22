const { defineConfig } = require('./backend/node_modules/@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser', timeout: 30000, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:3199/WebHive/', headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
  webServer: { command: 'node scripts/preview-demo.js', url: 'http://127.0.0.1:3199/WebHive/', reuseExistingServer: false },
});
