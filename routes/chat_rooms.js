const express = require('express');
const mysql = require('mysql2');
const router = express.Router();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME_SCHOOL
});

// 테이블 생성
db.query(`
  CREATE TABLE IF NOT EXISTS chat_rooms (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    categories TEXT NOT NULL,
    password VARCHAR(100),
    allow_default_profile BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`);

// 채팅방 목록 불러오기
router.get('/rooms', (req, res) => {
  db.query('SELECT * FROM chat_rooms ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB 오류' });
    res.json({ success: true, rooms: results });
  });
});

// 채팅방 생성
router.post('/rooms/create', (req, res) => {
  const { id, title, categories, password, allowDefaultProfile } = req.body;
  const sql = `
    INSERT INTO chat_rooms (id, title, categories, password, allow_default_profile)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(sql, [id, title, JSON.stringify(categories), password, allowDefaultProfile], (err) => {
    if (err) return res.status(500).json({ success: false, message: '채팅방 생성 실패' });
    res.json({ success: true, message: '채팅방 생성 완료' });
  });
});


module.exports = router;
