require('dotenv').config();
const express = require("express");
const mysql = require("mysql2/promise");
const router = express.Router();

async function connectDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME_COMMUNITY,
      charset: 'utf8mb4'
    });
    return connection;
  } catch (err) {
    console.error("❌ DB 연결 실패:", err.message);
    return null;
  }
}

// ✅ likes 테이블이 없으면 생성
async function ensureLikesTable() {
  const db = await connectDB();
  if (!db) return; // 연결 실패 시 함수 종료

  await db.execute(`
    CREATE TABLE IF NOT EXISTS likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      target_type ENUM('post', 'comment', 'reply') NOT NULL,
      target_id INT NOT NULL,
      UNIQUE KEY unique_like (user_id, target_type, target_id)
    )
  `);

  await db.end();
}

// ✅ likes 컬럼이 없으면 추가
async function ensureLikesColumn(tableName) {
  const db = await connectDB();
  const [result] = await db.execute(`SHOW COLUMNS FROM ${tableName} LIKE 'likes'`);
  if (result.length === 0) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN likes INT DEFAULT 0`);
  }
  await db.end();
}

async function ensureLikesColumnExists(tableName) {
  const db = await connectDB();
  try {
    const [result] = await db.execute(`SHOW COLUMNS FROM ${tableName} LIKE 'likes'`);
    if (result.length === 0) {
      await db.execute(`ALTER TABLE ${tableName} ADD COLUMN likes INT DEFAULT 0`);
      console.log(`✅ ${tableName} 테이블에 likes 컬럼 추가됨`);
    } else {
      console.log(`✅ ${tableName} 테이블에 이미 likes 컬럼 존재`);
    }
  } catch (err) {
    console.error(`❌ ${tableName} 테이블에 likes 컬럼 추가 중 오류 발생:`, err.message);
  } finally {
    await db.end();
  }
}

// ✅ 라우터 실행 시 likes 테이블을 한 번 생성해둠
ensureLikesTable();
ensureLikesColumnExists("posts");     // posts 테이블에 likes 컬럼 추가
ensureLikesColumnExists("comments");  // comments 테이블에 likes 컬럼 추가

async function ensureLikesColumn(tableName) {
  const db = await connectDB();
  const [result] = await db.execute(`SHOW COLUMNS FROM ${tableName} LIKE 'likes'`);
  if (result.length === 0) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN likes INT DEFAULT 0`);
  }
  await db.end();
}

async function ensureLikesTable() {
  const db = await connectDB();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      target_type ENUM('post', 'comment', 'reply') NOT NULL,
      target_id INT NOT NULL,
      UNIQUE KEY unique_like (user_id, target_type, target_id)
    )
  `);
  await db.end();
}

// ✅ 좋아요 토글 처리 (사용자 + 카운트 모두 포함)
router.post("/", async (req, res) => {
  const { targetType, targetId, liked } = req.body;
  const userId = req.session?.user?.id;

  if (!userId) return res.status(401).json({ message: "로그인 필요" });

  await ensureLikesTable();

  let table;
  if (targetType === "post") table = "posts";
  else if (targetType === "comment" || targetType === "reply") table = "comments";
  else return res.status(400).json({ message: "잘못된 대상" });

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
    `UPDATE ${table} SET likes = (
      SELECT COUNT(*) FROM likes WHERE target_type = ? AND target_id = ?
    ) WHERE id = ?`,
    [targetType, targetId, targetId]
  );

  const [[row]] = await db.execute(`SELECT likes FROM ${table} WHERE id = ?`, [targetId]);

  await db.end();
  res.json({ likes: row.likes });
});

router.get('/liked-posts', async (req, res) => {
    const userId = req.session?.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });

    try {
        const db = await connectDB();
        const [posts] = await db.execute(`
            SELECT p.* FROM posts p
            JOIN likes l ON p.id = l.target_id
            WHERE l.user_id = ? AND l.target_type = 'post'
        `, [userId]);

        res.json(posts);  // ✅ 프론트에서 바로 JSON으로 받을 수 있게
    } catch (err) {
        res.status(500).json({ success: false, message: '서버 오류', error: err });
    }
});

module.exports = router;
