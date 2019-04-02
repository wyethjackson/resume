const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const {insert, get} = require('../db.js');
const {confirmRoute} = require('../auth.js');
const blog = require('../components/blog.marko');
const index = require("../index.marko");

router.get('/', async function (req, res) {
  res.marko(index, {path: '../', page_id: 'BLOG', active_index: 2});
});

module.exports = router;
