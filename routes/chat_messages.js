const express = require('express');
const mysql = require('mysql2');
const router = express.Router();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'school_db'
});

// 테이블 생성
db.query(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(50),
    sender VARCHAR(100),
    content TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
)
`);

// 메시지 불러오기
router.get('/messages', (req, res) => {
  const { roomId } = req.query;
  db.query('SELECT * FROM chat_messages WHERE room_id = ? ORDER BY sent_at ASC', [roomId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: '메시지 조회 실패' });
    res.json({ success: true, messages: results });
  });
});

// 메시지 전송
router.post('/messages/send', (req, res) => {
  const { roomId, sender, content } = req.body;
  db.query(
    'INSERT INTO chat_messages (room_id, sender, content) VALUES (?, ?, ?)',
    [roomId, sender, content],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: '메시지 저장 실패' });
      res.json({ success: true, message: '메시지 저장 완료' });
    }
  );
});

module.exports = router;
