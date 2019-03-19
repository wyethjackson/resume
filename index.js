require("marko/node-require");
const express = require('express');
const markoExpress = require("marko/express");
const fs = require("fs");
const app = express();
const hello = require("./hello");
const layout = require("./layout");
const index = require("./index.marko");
const path = require('path');
require('lasso').configure({
    "plugins": [
        "lasso-marko"
    ],
});
app.use(express.static('public'));
app.use(require('lasso/middleware').serveStatic());
app.get('/', function (req, res) {
  // let the browser know html is coming
res.setHeader("content-type", "text/html");

// render the output to the `res` output stream
 res.marko(index, {name: "markooooo"});
})

app.listen(5000, function () {
  console.log("YOjfeisofjeirjsf")
  if(process.send) {
    process.send('online');
  }
})
