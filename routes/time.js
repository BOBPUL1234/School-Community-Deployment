const express = require("express");
const mysql = require("mysql2/promise");
const router = express.Router();
require('dotenv').config();

// time.js
async function createDatabaseAndTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TIMETABLE
  });

  // 1. 데이터베이스 만들기
  await connection.query(`CREATE DATABASE IF NOT EXISTS timetable`);

  // 2. timetable DB로 전환
  await connection.changeUser({ database: 'timetable' });

  // 3. 테이블 만들기
  const sql = `
    CREATE TABLE IF NOT EXISTS timetable (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      cell_key VARCHAR(10) NOT NULL,
      subject VARCHAR(50) NOT NULL,
      UNIQUE KEY unique_user_cell (user_id, cell_key)
    );
  `;
  await connection.execute(sql);

  await connection.end();
}

createDatabaseAndTable();

router.get('/:user_id', async (req, res) => {
  const user_id = req.params.user_id;

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME_TIMETABLE
    });

    const [rows] = await connection.execute(
      `SELECT cell_key, subject FROM timetable WHERE user_id = ?`,
      [user_id]
    );

    await connection.end();

    const timetableData = {};
    rows.forEach(row => {
      timetableData[row.cell_key] = row.subject;
    });

    res.json(timetableData);
  } catch (error) {
    console.error("❌ 시간표 불러오기 오류:", error);
    res.status(500).json({ error: 'DB 오류' });
  }
});

router.post('/save', async (req, res) => {
  const { user_id, cell_key, subject } = req.body;

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME_TIMETABLE
    });

    await connection.execute(`
      INSERT INTO timetable (user_id, cell_key, subject)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE subject = ?
    `, [user_id, cell_key, subject, subject]);

    await connection.end();
    res.json({ success: true });
  } catch (error) {
    console.error("❌ 시간표 저장 오류:", error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;