const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const _ = require('lodash');
const randomstring = require("randomstring");
const MIGRATION_TIMEOUT = 5000;
const QUERY_TIMEOUT = 5000;
const IDLE_TIMEOUT = 30000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: IDLE_TIMEOUT,
  connectionTimeoutMillis: QUERY_TIMEOUT,
});
let client = {};
dotenv.config();


async function migrateDb() {
  try {
    client = await pool.connect();
    const migrationQuery = 'SELECT migration_id FROM migrations ORDER BY migration_id DESC LIMIT 1';
    const [result] = (await client.query(migrationQuery)).rows;
    let migrationId;
    if(!result) {
      migrationId = 1;
    } else {
      migrationId = result.migration_id + 1;
    }
    let sqlFile = `${migrationId}.sql`;
    let sqlPath = `./db/migrations/${sqlFile}`;
    while(fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath).toString();
      //These two queries MUST be synchronous
      await client.query(sql);
      await client.query(`INSERT INTO migrations (migration_id) VALUES(${migrationId})`);
      migrationId += 1;
      sqlFile = `${migrationId}.sql`;
      sqlPath = `./db/migrations/${sqlFile}`;
    }
    return {};
  } catch(err) {
    console.log("error: ", err);
    return {err: true};
  }
}

async function insert(table, columns = [], values = []) {
  try {
    const queryText = `INSERT INTO
    ${table} (${_.join(columns, ',')})
    VALUES(${_.join(values, ',')}) RETURNING *`;
    const result = await client.query(queryText);

    return {result};
   } catch(error) {
     return {err: true, message: error.message};
   }
}

async function get(table, selects = [], filters = []) {
  try {
    const queryText = `SELECT
    ${_.join(selects, ',')}
    FROM ${table}
    ${filters.length > 0 ? `WHERE ${_.join(filters, ' AND ')}` : ''}`;
    const result = await client.query(queryText);
    return {result};
   } catch(error) {
     return {err: true, message: error.message};
   }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

async function create_code_name_game() {
  try {
    let code_name_id = randomstring.generate({
      length: 5,
      charset: 'alphabetic',
      capitalization: 'uppercase',
    });
    let code_name_sql = `INSERT INTO code_names (code_name_id) VALUES('${code_name_id}') RETURNING code_name_id`;
    let code_name_words_sql = 'SELECT COUNT(word_id) AS total_words FROM words';
    let code_name_query = client.query(code_name_sql);
    let code_name_words_query = client.query(code_name_words_sql);
    let [code_name_result, code_name_words_result] = await Promise.all([code_name_query, code_name_words_query]);
    code_name_id = code_name_result.rows[0].code_name_id;
    let total_words = code_name_words_result.rows[0].total_words;
    let code_name_team_sql = `INSERT INTO code_name_team (code_name_id, team_name) VALUES('${code_name_id}', 'BLUE'), ('${code_name_id}', 'RED') RETURNING code_name_team_id;`;
    let code_name_team_result = await client.query(code_name_team_sql);
    let code_name_team1 = code_name_team_result.rows[0].code_name_team_id;
    let code_name_team2 = code_name_team_result.rows[1].code_name_team_id;
    let count = 25;
    let words_to_create = 25;
    let words_queries = [];
    let is_even = (getRandomInt(1, 100) % 2) === 0;
    let team1Words = is_even ? 9 : 8;
    let team2Words = is_even ? 8 : 9;
    let first_to_start = team1Words === 9 ? code_name_team1 : code_name_team2;
    let code_name_turn_sql = `INSERT INTO code_name_turns (code_name_id, code_name_team_id) VALUES('${code_name_id}', ${first_to_start});`;
    await client.query(code_name_turn_sql);
    let death_word_created = false;
    let death_word = false;
    let team_id = 0;
    let words_added = [];
    while (words_to_create > 0) {
      const random_int = getRandomInt(1, total_words);
      if(!words_added.includes(random_int)) {
        words_added.push(random_int);
        const team_int = getRandomInt(1, words_to_create);
        if(team_int <= team1Words) {
          team_id = code_name_team1;
          team1Words--
        } else if (team_int <= team1Words+team2Words) {
          team_id = code_name_team2;
          team2Words--
        } else if(!death_word_created && team_int === (team1Words+team2Words+1)) {
          death_word = true;
          death_word_created = true;
        }

        words_to_create--

        code_name_words_sql = `INSERT INTO code_name_word
        (code_name_id, code_name_team_id, word, is_death_word)
        VALUES('${code_name_id}', ${team_id}, (SELECT word FROM words WHERE word_id = ${random_int}), ${death_word}) RETURNING word;`;
        words_queries.push(client.query(`${code_name_words_sql}`))
        death_word = false;
        team_id = 0;
      }
    }
    const results = await Promise.all(words_queries);
    return code_name_id;
   } catch(error) {
     return {err: true, message: error.message};
   }
}

async function update_game({
  clue,
  guess_given,
  turn,
  guesses,
  guess_text,
  word,
}, code_name_id) {
  try {
    const updates = [];
    if(clue && guess_given && guess_text) {
      let updateGame = `UPDATE code_name_turns
          SET clue = '${clue}',
          guess_count = ${guess_given},
          guess_text = '${guess_text}',
          max_guesses = ${guess_given}
          WHERE clue IS NULL AND guess_count IS NULL AND code_name_id = '${code_name_id}' AND archived IS NULL RETURNING code_name_turns_id;`;
          updateGame = client.query(updateGame);
          updates.push(updateGame);
    }

    if(turn) {
      let updateGame = `WITH code_name_update AS (
          UPDATE code_name_turns
          SET archived = NOW()
          WHERE code_name_id = '${code_name_id}' AND archived IS NULL RETURNING code_name_team_id
        ) INSERT INTO code_name_turns (code_name_id, code_name_team_id)
        VALUES (
          '${code_name_id}',
          (SELECT code_name_team_id FROM code_name_team WHERE code_name_id = '${code_name_id}' AND code_name_team_id != (SELECT code_name_team_id FROM code_name_update))
        )`;
        updateGame = client.query(updateGame);
        updates.push(updateGame);
    } else if(guesses) {
      let updateGuesses = `UPDATE code_name_turns
      SET guess_count = (CASE
        WHEN (SELECT is_hidden FROM code_name_word WHERE word = '${word.word}' AND code_name_id = '${code_name_id}') = TRUE THEN ${Number(guesses)} ELSE guess_count END
      ) WHERE code_name_id = '${code_name_id}' AND archived IS NULL;`
        updateGuesses = client.query(updateGuesses);
        updates.push(updateGuesses);
    }

    if(!!word && word.is_hidden) {
      let updateWord = `UPDATE code_name_word SET is_hidden = false WHERE code_name_id = '${code_name_id}' AND word = '${word.word}';`
      updateWord = client.query(updateWord);
      updates.push(updateWord);
    }

    if(!!word && word.is_death_word) {
      console.log("TURNN>>> ", turn);
      console.log("code_name_id ", code_name_id);
      let updateGame = `UPDATE code_names
        SET winner = (
          SELECT team_name FROM code_name_team WHERE team_name != '${turn}' AND code_name_id = '${code_name_id}'
        )
        WHERE code_name_id = '${code_name_id}'`;
        console.log("SWLLL ", updateGame);
        updateGame = client.query(updateGame);
        updates.push(updateGame);
    }

    await Promise.all(updates);
  } catch(err) {
    console.log(err);
    return {error: true};
  }
  return {error: false};
}

async function get_code_name_game(code_name_id) {
  try {
    let code_name_sql =
    `SELECT cnt.team_name, cnw.code_name_word_id, cnw.word, cnw.is_death_word, cnw.is_hidden
    FROM code_names cn
    INNER JOIN code_name_word cnw ON cnw.code_name_id = cn.code_name_id
    LEFT JOIN code_name_team cnt ON cnt.code_name_team_id = cnw.code_name_team_id
    WHERE cn.code_name_id = '${code_name_id}' ORDER BY cnw.code_name_word_id`;
    let code_name_query = client.query(code_name_sql);

    let code_name_turn_sql = `SELECT cnte.team_name,
    cnt.clue,
    cnt.guess_count,
    cnt.max_guesses,
    cnt.guess_text
    FROM code_name_turns cnt
    INNER JOIN code_name_team cnte ON cnte.code_name_team_id = cnt.code_name_team_id
    WHERE cnt.code_name_id = '${code_name_id}' AND archived IS NULL`;
    let code_name_turn_query = client.query(code_name_turn_sql);
    let code_name_teams_sql = `SELECT team_name FROM code_name_team WHERE code_name_id = '${code_name_id}'`;
    let code_name_teams_query = client.query(code_name_teams_sql);
    let code_name_winner_sql = `SELECT winner FROM code_names WHERE code_name_id = '${code_name_id}'`;
    let code_name_winner_query = client.query(code_name_winner_sql);
    const [code_name_words_result, code_name_turn_result, code_name_teams_result, code_name_winner_result] = await Promise.all([code_name_query, code_name_turn_query, code_name_teams_query, code_name_winner_query]);
    return {
      words: code_name_words_result.rows,
      turn: code_name_turn_result.rows[0].team_name,
      guesses: code_name_turn_result.rows[0].guess_count,
      max_guesses: code_name_turn_result.rows[0].max_guesses,
      clue: code_name_turn_result.rows[0].clue,
      guess_text: code_name_turn_result.rows[0].guess_text,
      teams: code_name_teams_result.rows,
      winner: code_name_winner_result.rows.length > 0 ? code_name_winner_result.rows[0].winner : null
    };
  } catch(error) {
    console.log("joiejsgiojrejgsj ", error.message);
    return {err: true, message: error.message};
  }
}

module.exports = {migrateDb, insert, get, get_code_name_game, create_code_name_game, update_game};
