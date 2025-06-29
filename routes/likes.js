require('dotenv').config();
const express = require("express");
const mysql = require("mysql2/promise");
const router = express.Router();

async function connectDB() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_COMMUNITY,
    charset: 'utf8mb4'
  });
  return connection;
}

async function ensureLikesTable() {
  const db = await connectDB();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      target_type ENUM('post', 'comment', 'reply') NOT NULL,
      target_id INT NOT NULL,
      is_bookmarked TINYINT(1) DEFAULT 0,
      UNIQUE KEY unique_like (user_id, target_type, target_id)
    )
  `);
  await db.end();
}

async function ensureLikesColumn(tableName) {
  const db = await connectDB();
  const [result] = await db.execute(`SHOW COLUMNS FROM ${tableName} LIKE 'likes'`);
  if (result.length === 0) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN likes INT DEFAULT 0`);
  }
  await db.end();
}

ensureLikesTable();

// ✅ 좋아요 토글
router.post("/", async (req, res) => {
  const { targetType, targetId, liked } = req.body;
  const userId = req.session?.user?.id;
  if (!userId) return res.status(401).json({ message: "로그인 필요" });

  const table = targetType === "post" ? "posts" : "comments";

  await ensureLikesTable();
  await ensureLikesColumn(table);

  const db = await connectDB();

  if (liked) {
    await db.execute(
      `INSERT IGNORE INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)`,
      [userId, targetType, targetId]
    );
  } else {
    await db.execute(
      `DELETE FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?`,
      [userId, targetType, targetId]
    );
  }

  await db.execute(
    `UPDATE ${table}
     SET likes = (
       SELECT COUNT(*) FROM likes WHERE target_type = ? AND target_id = ?
     )
     WHERE id = ?`,
    [targetType, targetId, targetId]
  );

  const [[row]] = await db.execute(`SELECT likes FROM ${table} WHERE id = ?`, [targetId]);

  await db.end();
  res.json({ likes: row.likes || 0 });
});

// ✅ 좋아요 누른 게시물 가져오기
router.get('/liked-posts', async (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId) return res.status(401).json({ message: "로그인 필요" });

  try {
    const db = await connectDB();
    const [posts] = await db.execute(`
      SELECT p.* FROM posts p
      JOIN likes l ON p.id = l.target_id
      WHERE l.user_id = ? AND l.target_type = 'post'
    `, [userId]);

    await db.end();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err });
  }
});

module.exports = router;
