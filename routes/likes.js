require('dotenv').config();
const express = require("express");
const mysql = require("mysql2/promise");
const router = express.Router();

// ✅ DB 연결
async function connectDB() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_COMMUNITY,
    charset: 'utf8mb4',
  });
}

// ✅ likes 테이블이 없으면 생성
async function ensureLikesTable() {
  const db = await connectDB();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      target_type ENUM('post', 'comment', 'reply') NOT NULL,
      target_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_like (user_id, target_type, target_id)
    )
  `);
  await db.end();
}

// ✅ 라우터 초기화 시 테이블 체크
ensureLikesTable();

// ✅ 좋아요 토글
router.post("/", async (req, res) => {
  const { targetType, targetId, liked } = req.body;
  const userId = req.session?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "로그인 필요" });
  }

  const db = await connectDB();

  try {
    if (liked) {
      await db.execute(`
        INSERT IGNORE INTO likes (user_id, target_type, target_id)
        VALUES (?, ?, ?)
      `, [userId, targetType, targetId]);
    } else {
      await db.execute(`
        DELETE FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?
      `, [userId, targetType, targetId]);
    }

    // ✅ 현재 좋아요 수 반환
    const [[{ count }]] = await db.execute(`
      SELECT COUNT(*) AS count
      FROM likes
      WHERE target_type = ? AND target_id = ?
    `, [targetType, targetId]);

    res.json({ likes: count });
  } catch (err) {
    console.error("❌ 좋아요 처리 오류:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  } finally {
    await db.end();
  }
});

// ✅ 내가 누른 게시글 좋아요 리스트
router.get('/liked-posts', async (req, res) => {
  const userId = req.session?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  const db = await connectDB();

  try {
    const [posts] = await db.execute(`
      SELECT p.*
      FROM likes l
      JOIN posts p ON l.target_id = p.id
      WHERE l.user_id = ? AND l.target_type = 'post'
    `, [userId]);

    res.json(posts);
  } catch (err) {
    console.error("❌ 좋아요 게시글 조회 오류:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  } finally {
    await db.end();
  }
});

module.exports = router;
