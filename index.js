const puppeteer = require('puppeteer');
const express = require('express');
const monetae = require('./lib/monetae');

const defaultPort = 7690;
const defaultProvidersPath = './providers';

const port = process.argv[2] || defaultPort;
const providersPath = process.argv[3] || defaultProvidersPath;

const app = express();
app.use(express.json());

app.get('/providers', async (req, res, next) => {
  try {
    const providers = await monetae.providers(providersPath);
    res.json(providers);
  }
  catch (err) {
    next(err);
  }
});

app.post('/providers/:id/download', async (req, res, next) => {
  var id = req.params.id;
  var options = req.body;

  try {
    const provider = (await monetae.providers(providersPath))[id];
    if (!provider) {
      return res.status(404).end();
    }
    const browser = await puppeteer.launch({
      headless: true
    });
    var page = (await browser.pages())[0];
    res.json(await provider.download(page, options));
  }
  catch (err) {
    next(err);
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  process.stdout.write(`${err}\n`);
  res.status(500).end();
});

app.listen(port, () => {
  process.stdout.write(`monetae listening on port ${port}\n`);
});
