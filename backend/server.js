const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createApp } = require('./app');
const mode = process.env.WEBHIVE_MODE || 'live';
const app = createApp({ mode });
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => console.log(`WebHive (${mode}): http://localhost:${port}`));
function shutdown() {
  server.close(async () => {
    if (mode === 'live') await require('./db/pool').end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
