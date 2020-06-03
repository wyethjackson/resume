const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const {insert, get, create_code_name_game, get_code_name_game, update_game} = require('../db.js');
const {confirmRoute, setAlarmCookie} = require('../auth.js');
const contact = require('../components/contact.marko');
const index = require("../index.marko");


async function getGameDetails(code_name_id) {
  const game = await get_code_name_game(code_name_id);
  let count = 1;
  let rows = [];
  let col = [];
  if(!game || !game.teams) {
    return {};
  }
  let team1 = {team_name: (!!game.teams[0] && game.teams[0].team_name), words: []};
  let team2 = {team_name: (!!game.teams[1] && game.teams[1].team_name), words: []};
  if(team1.team_name === "BLUE") {
    team1.text_color = 'text-primary';
  } else {
    team1.text_color = 'text-danger';
  }

  if(team2.team_name === "BLUE") {
    team2.text_color = 'text-primary';
  } else {
    team2.text_color = 'text-danger';
  }
  (game.words || []).forEach((word) => {
    if(team1.team_name === word.team_name) {
      if(word.is_hidden) {
        team1.words.push(word);
      }
      word.color = 'primary';
      word.text_color = 'text-white';
    } else if(team2.team_name === word.team_name) {
      if(word.is_hidden) {
        team2.words.push(word);
      }
      word.color = 'danger';
      word.text_color = 'text-white';
    } else if(word.is_death_word) {
      word.color = 'dark';
      word.text_color = 'text-white';
    } else {
      word.color = 'tan';
      word.text_color = 'text-white';
    }

    col.push(word);
    if(col.length === 5) {
      rows.push(col);
      col = [];
    }
  })
  return {
    words: game.words,
    rows,
    turn: game.turn,
    team1,
    team2,
    code_name_id,
    guesses: game.guesses,
    max_guesses: game.max_guesses,
    game_code_given: '',
    clue: game.clue,
    winner: game.winner,
    guess_text: game.guess_text,
  };
}

router.get('/', async function (req, res) {
  res.marko(index, {path: '../', page_id: 'PROJECTS', active_index: 1, hide_nav: true});
});

router.get('/code_names', async function (req, res) {
  res.marko(index, {path: '../', page_id: 'PROJECTS', active_index: 1, hide_nav: true});
});

router.get('/code_names/:code_name_id', async function (req, res) {
  let code_name_data = {};
  if(!!req.params.code_name_id) {
    code_name_data = await getGameDetails(req.params.code_name_id);
  }
  res.marko(index, {path: '../', page_id: 'PROJECTS', active_index: 1, code_names: code_name_data, hide_nav: true});
});



router.get('/code_names/:code_name_id/ajax', async function (req, res) {
  const code_name_data = await getGameDetails(req.params.code_name_id);
  res.json(code_name_data);
});

router.post('/code_names/:code_name_id/ajax', async function (req, res) {
  const status = await update_game(req.body, req.params.code_name_id);
  if(status.error) {
    res.sendStatus(500);
    return;
  }
  res.sendStatus(200);
});


router.post('/code_names/new', async function (req, res) {
  const code_name_id = await create_code_name_game();
  setAlarmCookie(req, res, {type: 'success', message: 'Successfully signed up!'});
  res.redirect(`/projects/code_names/${code_name_id}`);
});

module.exports = router;
