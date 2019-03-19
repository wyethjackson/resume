require("marko/node-require");
require('dotenv').config()
require('lasso').configure({
    "plugins": [
        "lasso-marko"
    ],
});
const express = require('express');
const markoExpress = require("marko/express");
const fs = require("fs");
const app = express();
const layout = require("./layout");
const index = require("./index.marko");
const path = require('path');
const PORT = process.env.PORT;
app.use(express.static('public'));
app.use(require('lasso/middleware').serveStatic());
async function ensureSecure(req, res, next) {
    if (req.get('X-Forwarded-Proto')=='https' || req.hostname == 'localhost') {
        next();
        return;
    } else if(req.get('X-Forwarded-Proto')!='https'){
        res.redirect('https://' + req.hostname + req.url);
        return;
    }
}
app.all('/*', ensureSecure);
app.get('/', async function (req, res) {
  res.setHeader("content-type", "text/html");
  res.marko(index, {});
})

app.listen((PORT || 5000), function () {
  if(process.send) {
    process.send('online');
  }
})
