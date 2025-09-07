const express = require('express');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

// Default Node.js metrics
client.collectDefaultMetrics({ register });

// Custom counter
const httpRequests = new client.Counter({
  name: 'app_requests_total',
  help: 'Total number of HTTP requests',
});
register.registerMetric(httpRequests);

app.get('/', (req, res) => {
  httpRequests.inc();
  res.send('Hello from Metrics App!');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3000, () => {
  console.log('Metrics app listening on port 3000');
});
