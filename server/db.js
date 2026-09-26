if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch (_) {}
}

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "knowledgeiq",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = {
  pool,
  query,
  getOne
};
