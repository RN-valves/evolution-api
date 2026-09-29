require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("WARNING: Missing Supabase URL or Key in environment.");
}

let pgPool = null;
const connectionString = process.env.DATABASE_CONNECTION_URI || process.env.DATABASE_URL;
if (connectionString) {
  pgPool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle pg client', err.message);
  });
}

module.exports = { supabase, pgPool };
