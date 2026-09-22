const path = require('node:path');
require('./build-demo');
const express = require('../backend/node_modules/express');
const app = express();
// Test the same subpath as GitHub Pages, not only a domain-root deployment.
app.use('/WebHive', express.static(path.join(__dirname, '../dist')));
app.listen(3199, '127.0.0.1');
