const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const {insert, get, create_code_name_game, get_code_name_game} = require('../db.js');
const {confirmRoute} = require('../auth.js');
const contact = require('../components/contact.marko');
const index = require("../index.marko");
const randomstring = require("randomstring");


router.get('/', async function (req, res) {
  res.marko(index, {path: '../', page_id: 'CODE_NAMES'});
});

router.post('/', async function (req, res) {
  res.marko(index, {path: '../', page_id: 'CODE_NAMES'});
});


module.exports = router;
