require("marko/node-require");
require('dotenv').config()
require('lasso').configure({
    "plugins": [
        "lasso-marko"
    ],
});
const express = require('express');
const session = require('express-session');
const markoExpress = require("marko/express");
const fs = require("fs");
const app = express();
const bodyParser = require('body-parser');
const layout = require("./layout");
const uuidv4 = require('uuid/v4');
const index = require("./index.marko");
const path = require('path');
const PORT = process.env.PORT;
const MIGRATION_TIMEOUT = 5000;
const {migrateDb, get} = require('./db.js');
const {setAlarmCookie, getAlarms} = require('./auth.js');
const development = (process.env.NODE_ENV === 'development');
const users = require('./routes/users');
const blog = require('./routes/blog');
const profile = require('./routes/profile');
const code_names = require('./routes/code_names')
const contact = require('./routes/contact');
const projects = require('./routes/projects');
const cookieParser = require('cookie-parser');

(async function start() {
  try {
    console.log("MIGRATING DB....")
    await migrateDb();
  } catch(err) {
    console.log('error: ', err);
    return;
  }
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(require('lasso/middleware').serveStatic());
  app.all('/*', express.static('public'));
  app.use('/projects/code_names', express.static('public'));
  if(!development) {
    app.set('trust proxy', 1);
  }
  app.use(session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: !development }
  }));
    app.use(cookieParser());

  async function ensureSecure(req, res, next) {
      if (req.get('X-Forwarded-Proto')=='https' || req.hostname == 'localhost') {
          next();
          return;
      } else if(req.get('X-Forwarded-Proto')!='https'){
          res.redirect('https://' + req.hostname + req.url);
          return;
      }
  }

  app.all('/*', ensureSecure, getAlarms);
  app.use('/users', users);
  app.use('/blog', blog);
  app.use('/contact', contact);
  app.use('/profile', profile);
  app.use('/projects', projects);
  app.use('/code_names', code_names);
  app.get('/', async function (req, res) {
    let query = [get('posts', ['post_id', 'title', 'content', 'user_id'])];
    let user;
    let posts;
    if(req.session.user_uuid) {
      query.push(get('users', ['user_id', 'user_uuid', 'name', 'email', 'admin'], [`user_uuid = '${req.session.user_uuid}'`]));
    }
    [posts, user] = await Promise.all(query);
    if(user && user.result && user.result.rows) {
      [user] = user.result.rows;
    }

    if(posts && posts.result && posts.result.rows) {
      posts = posts.result.rows;
    }
    res.setHeader("content-type", "text/html");
    res.marko(index, {
      active_index: 0,
      user,
      posts,
      alarms: res.alarms || [],
      path: '',
    });
  });



  app.listen((PORT || 5000), function () {
    if(process.send) {
      process.send('online');
    }
  });
})();
