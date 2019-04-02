const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const _ = require('lodash');
const MIGRATION_TIMEOUT = 5000;
const QUERY_TIMEOUT = 5000;
const IDLE_TIMEOUT = 30000;
dotenv.config();


async function migrateDb() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      idleTimeoutMillis: IDLE_TIMEOUT,
      connectionTimeoutMillis: QUERY_TIMEOUT,
    });
    const client = await pool.connect();

    const migrationQuery = 'SELECT migration_id FROM migrations ORDER BY migration_id DESC LIMIT 1';
    const [result] = (await pool.query(migrationQuery)).rows;
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
    pool.end();
    return {};
  } catch(err) {
    console.log("error: ", err);
    return {err: true};
  }
}

async function insert(table, columns = [], values = []) {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      idleTimeoutMillis: IDLE_TIMEOUT,
      connectionTimeoutMillis: QUERY_TIMEOUT,
    });
    const client = await pool.connect();
    const queryText = `INSERT INTO
    ${table} (${_.join(columns, ',')})
    VALUES(${_.join(values, ',')}) RETURNING *`;
    const result = await client.query(queryText);

    pool.end();
    return {result};
   } catch(error) {
     return {err: true, message: error.message};
   }
}

async function get(table, selects = [], filters = []) {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      idleTimeoutMillis: IDLE_TIMEOUT,
      connectionTimeoutMillis: QUERY_TIMEOUT,
    });
    const client = await pool.connect();
    const queryText = `SELECT
    ${_.join(selects, ',')}
    FROM ${table}
    ${filters.length > 0 ? `WHERE ${_.join(filters, ' AND ')}` : ''}`;
    const result = await client.query(queryText);
    pool.end();
    return {result};
   } catch(error) {
     return {err: true, message: error.message};
   }
}

  module.exports = {migrateDb, insert, get};
