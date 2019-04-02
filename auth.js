const {get} = require('./db.js');
const USER_CACHE = {};

async function setVerifiedUser(req) {
  if(req.session && req.session.user_uuid) {
    if(USER_CACHE[req.session.user_uuid]) {
      req.user = USER_CACHE[req.session.user_uuid];
      return;
    }
    const query = get('users', ['name', 'email', 'user_id', 'admin'], [`user_uuid = ${req.session.user_uuid}`]);

    if(query.result && query.result.rows && query.result.rows > 0) {
      const [user] = query.result.rows;
      req.user = user;
      USER_CACHE[req.session.user_uuid] = user;
    } else {
      await req.session.destroy();
    }
  }
}

async function confirmRoute(req, res, next) {
  await setVerifiedUser(req);
  if(req.attempt_verification && req.user) {
    res.redirect('/users');
    return;
  } else if(req.attempt_verification && !req.user) {
    if(next) next();
    return;
  } else if(!req.user) {
    res.redirect('/users/sign_in');
    return;
  }
  if(next) next();
  return;
}

async function setAlarmCookie(req, res, alarm) {
  const alarms = req.cookies.alarms || [];
  alarms.push(alarm);
  res.cookie('alarms', alarms);
}

async function getAlarms(req, res, next) {
  if(req.cookies.alarms && req.cookies.alarms.length > 0) {
    res.alarms = req.cookies.alarms;
    res.clearCookie("alarms");
  }
  if(next) next();
}

module.exports = {confirmRoute, setAlarmCookie, getAlarms};
