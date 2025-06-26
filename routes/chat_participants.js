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
  CREATE TABLE IF NOT EXISTS chat_participants (
    room_id VARCHAR(50),
    user_id VARCHAR(50),
    user_name VARCHAR(100),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
)
`);

// 참여 등록
router.post('/participants/join', (req, res) => {
  const { roomId, userId, userName } = req.body;
  db.query('INSERT IGNORE INTO chat_participants (room_id, user_id, user_name) VALUES (?, ?, ?)', [roomId, userId, userName], (err) => {
    if (err) return res.status(500).json({ success: false, message: '참여 실패' });
    res.json({ success: true, message: '참여 완료' });
  });
});

// 참여자 목록
router.get('/participants', (req, res) => {
  const { roomId } = req.query;
  db.query('SELECT user_id, user_name FROM chat_participants WHERE room_id = ?', [roomId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: '조회 실패' });
    res.json({ success: true, participants: results });
  });
});

// 참여한 채팅방 목록 불러오기
router.get('/participants/rooms', (req, res) => {
  const { userId } = req.query;
  const sql = `
    SELECT r.*
    FROM chat_rooms r
    JOIN chat_participants p ON r.id = p.room_id
    WHERE p.user_id = ?
    ORDER BY r.created_at DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: '조회 실패' });
    res.json({ success: true, rooms: results });
  });
});


module.exports = router;
