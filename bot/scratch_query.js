const { Client } = require('pg');
require('dotenv').config({ path: 'c:/Users/Digital Marketing/Desktop/final chatbot/evolution-api/.env' });

const connectionString = process.env.DATABASE_CONNECTION_URI;

if (!connectionString) {
  console.error("DATABASE_CONNECTION_URI not found in environment!");
  process.exit(1);
}

const client = new Client({
  connectionString: connectionString,
});

async function main() {
  await client.connect();
  try {
    const res = await client.query('SELECT * FROM bot_state ORDER BY updated_at DESC LIMIT 10');
    console.log("=== Most recent bot states ===");
    console.log(JSON.stringify(res.rows, null, 2));

    const err = await client.query("SELECT * FROM bot_config WHERE key = 'bot_last_error'");
    console.log("=== bot_last_error ===");
    console.log(JSON.stringify(err.rows, null, 2));
  } catch (err) {
    console.error("Error running query:", err.message);
  } finally {
    await client.end();
  }
}

main();
