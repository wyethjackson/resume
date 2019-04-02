const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const {insert, get} = require('../db.js');
const {confirmRoute, setAlarmCookie} = require('../auth.js');
const users = require('../components/users.marko');
const index = require("../index.marko");
const uuidv4 = require('uuid/v4');
const SALT_ROUNDS = 10;

const verify = (req, res, next) => {
  req.attempt_verification = true;
  if(next) next();
}

router.get('/sign_in', verify, confirmRoute, async function (req, res) {
  res.marko(index, {path: '../', page_id: 'USERS', sub_page_id: 'SIGNIN', users_active_index: 0, active_index: 4, alarms: res.alarms || []});
});

router.get('/sign_up', verify, confirmRoute, async function (req, res) {
  res.marko(index, {path: '../', page_id: 'USERS', sub_page_id: 'SIGNUP', users_active_index: 1, active_index: 4, alarms: res.alarms || []});
});

router.get('/', confirmRoute, async function (req, res) {
  res.marko(index, {path: '../', page_id: 'USERS', sub_page_id: 'ACCOUNT', active_index: 4, alarms: res.alarms || []});
});

router.post('/sign_in', verify, confirmRoute, async function (req, res) {
  let user;
  const {email, password} = req.body;
  const query = await get('users', ['user_id', 'user_uuid', 'name', 'email', 'admin', 'password_hash'], [`email = '${email}'`]);

  if(query.err || query.result.rowCount === 0) {
    setAlarmCookie(req, res, {type: 'danger', message: 'Incorrect email or password submitted'});
    res.redirect('./sign_in');
    return;
  }
  [user] = query.result.rows;
  bcrypt.compare(password, user.password_hash, function (err, result) {
    if(err || !result) {
      setAlarmCookie(req, res, {type: 'danger', message: 'Incorrect email or password submitted'});
      res.redirect('./sign_in');
      return;
    }
    req.session.user_uuid = user.user_uuid;
    setAlarmCookie(req, res, {type: 'success', message: 'Successfully signed in!'});
    res.redirect('/');
    return;
  });
});

router.post('/', async function (req, res) {
  const {name, email, password} = req.body;
  if(!name || !email || !password) {
    setAlarmCookie(req, res, {type: 'danger', message: 'You missed a field! Please sign up again!'});
    res.redirect('/users/sign_up');
    return;
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const query = await insert('users', ['user_uuid', 'name', 'email', 'password_hash'], [`'${uuidv4()}'`, `'${name}'`, `'${email}'`, `'${hash}'`]);

  if(query.err) {
    setAlarmCookie(req, res, {type: 'danger', message: 'There was a problem signing up, please try again.'});
    res.redirect('/users/sign_up');
    return;
  }
  const [user] = query.result.rows;

  req.session.user_uuid = user.user_uuid;
  setAlarmCookie(req, res, {type: 'success', message: 'Successfully signed up!'});
  res.redirect('./');
});

router.post('/message', async function (req, res) {
  const { message } = req.body;
  if(!message || !req.session || !req.session.user_uuid) {
    setAlarmCookie(req, res, {type: 'danger', message: 'Please submit your message again.'});
    res.redirect('/');
    return;
  }

  let query = await get('users', ['user_id', 'user_uuid', 'name', 'email', 'admin'], [`user_uuid = '${req.session.user_uuid}'`]);
  if(query.err || query.result.rowCount === 0 || !query.result.rows[0].admin) {
    setAlarmCookie(req, res, {type: 'danger', message: 'Please sign in to send a message!'});
    res.redirect('/');
  }
  const [{user_id}] = query.result.rows;
  query = await insert('messages', ['message', 'user_id'], [`'${message}'`, `${user_id}`]);
  if(query.err) {
    setAlarmCookie(req, res, {type: 'danger', message: 'There was a problem submitting your message, please try again.'});
    res.redirect('/');
    return;
  }
  setAlarmCookie(req, res, {type: 'success', message: 'Successfully sent message!'});
  res.redirect('/');
});

router.post('/post', async function (req, res) {
  const {title, content} = req.body;
  if(!title || !content || !req.session || !req.session.user_uuid) {
    setAlarmCookie(req, res, {type: 'danger', message: 'You missed a field, please post again!'});
    res.redirect('/');
    return;
  }
  let query = await get('users', ['user_id', 'user_uuid', 'name', 'email', 'admin'], [`user_uuid = '${req.session.user_uuid}'`]);
  if(query.err || query.result.rowCount === 0 || !query.result.rows[0].admin) {
    setAlarmCookie(req, res, {type: 'danger', message: 'Please sign in to post content.'});
    res.redirect('/');
  }
  const [{user_id}] = query.result.rows;
  query = await insert('posts', ['title', 'content', 'user_id'], [`'${title}'`, `'${content}'`, `${user_id}`]);
  if(query.err) {
    setAlarmCookie(req, res, {type: 'danger', message: 'There was a problem posting your content, please try again.'});
    res.redirect('/');
    return;
  }
  setAlarmCookie(req, res, {type: 'success', message: 'Successfully posted content!'});
  res.redirect('/');
});

router.post('/logout', async function (req, res) {
  if(req.session) {
    await req.session.destroy();
  }
  res.redirect('./sign_in');
});

module.exports = router;
