require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

// ✅ MySQL 연결 설정
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME_COMMUNITY,
  charset: 'utf8mb4'
};

async function connectDB() {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
}

async function ensureDatabaseAndTables() {
  const base = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await base.query(`CREATE DATABASE IF NOT EXISTS community`);
  await base.end();

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'community'
  });

  // ✅ posts 테이블
  await db.execute(`
    CREATE TABLE IF NOT EXISTS posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      author_id VARCHAR(50) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ✅ comments 테이블
  await db.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      parent_id INT DEFAULT NULL,
      user_id VARCHAR(50) NOT NULL,
      nickname VARCHAR(20) NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )
  `);

  // ✅ likes 테이블
  await db.execute(`
    CREATE TABLE IF NOT EXISTS likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      target_type ENUM('post', 'comment', 'reply') NOT NULL,
      target_id INT NOT NULL,
      is_bookmarked TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_like (user_id, target_type, target_id)
    )
  `);

  await db.end();
}

module.exports = {
  router,
  ensureDatabaseAndTables // ✅ 이렇게 꼭 export 되어야 함
};

module.exports = { ensureDatabaseAndTables };

async function ensureBookmarkColumn() {
    const db = await connectDB();
    const [result] = await db.execute(`SHOW COLUMNS FROM likes LIKE 'is_bookmarked'`);
    if (result.length === 0) {
        await db.execute(`ALTER TABLE likes ADD COLUMN is_bookmarked TINYINT(1) DEFAULT 0`);
    }
}

async function forceFixLikesCharsetSafe() {
    const db = await connectDB();

    await db.execute(`
        ALTER TABLE likes 
        MODIFY target_type ENUM('post', 'comment', 'reply') 
        CHARACTER SET utf8mb4 
        COLLATE utf8mb4_unicode_ci NOT NULL
    `);

    await db.execute(`
        ALTER TABLE likes 
        CONVERT TO CHARACTER SET utf8mb4 
        COLLATE utf8mb4_unicode_ci
    `);

    await db.end();
}

async function fixLikesTableCharset() {
    const db = await connectDB();

    try {
        await db.execute(`
            ALTER TABLE likes 
            MODIFY user_id VARCHAR(50)
            CHARACTER SET utf8mb4 
            COLLATE utf8mb4_unicode_ci NOT NULL
        `);

        await db.execute(`
            ALTER TABLE likes 
            MODIFY target_type ENUM('post','comment','reply')
            CHARACTER SET utf8mb4 
            COLLATE utf8mb4_unicode_ci NOT NULL
        `);

        await db.execute(`
            ALTER TABLE likes 
            CONVERT TO CHARACTER SET utf8mb4 
            COLLATE utf8mb4_unicode_ci
        `);
    } catch (err) {
        console.error("❌ 문자셋 수정 실패:", err.message);
    } finally {
        await db.end();
    }
}

ensureDatabaseAndTables();
fixLikesTableCharset();
forceFixLikesCharsetSafe();

// ✅ 게시글 목록 조회
// ✅ 전체 게시글 목록 조회
router.get('/posts', async (req, res) => {
    const userId = req.session?.user?.id;

    try {
        const db = await connectDB();
        const [posts] = await db.execute(`
            SELECT id, title, content, author_id, created_at, likes
            FROM posts
            ORDER BY created_at DESC
        `);

        for (const post of posts) {
            if (userId) {
                const [[like]] = await db.execute(`
                    SELECT 1 FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?
                `, [userId, post.id]);
                post.isLiked = !!like;

                const [[bookmark]] = await db.execute(`
                    SELECT 1 FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ? AND is_bookmarked = 1
                `, [userId, post.id]);
                post.isBookmarked = !!bookmark;
            } else {
                post.isLiked = false;
                post.isBookmarked = false;
            }
        }

        await db.end();
        res.json(posts);
    } catch (err) {
        console.error("❌ 게시글 목록 조회 오류:", err);
        res.status(500).json({ message: "❌ 게시글 목록 조회 실패", error: err.message });
    }
});

// ✅ 게시글 작성
router.post('/post', async (req, res) => {
    const { title, content } = req.body;
    const authorId = req.session?.user?.id;   

    if (!authorId) {
        return res.status(401).json({ message: "❌ 로그인 후 작성해주세요." });
    }

    if (!title || !content) {
        return res.status(400).json({ message: "❌ 제목, 내용은 필수입니다." });
    }

    try {
        const db = await connectDB();
        const [result] = await db.execute(
            "INSERT INTO posts (title, content, author_id, created_at) VALUES (?, ?, ?, NOW())",
            [title, content, authorId]
        );

        const [[newPost]] = await db.execute("SELECT * FROM posts WHERE id = ?", [result.insertId]);

        await db.end();
        res.json(newPost);
    } catch (error) {
        console.error("❌ 게시글 저장 오류:", error);
        res.status(500).json({ message: "❌ 게시글 저장 실패", error: error.message });
    }
});


// ✅ 게시글 삭제 + 관련 댓글까지 삭제
router.delete('/post/:id', async (req, res) => {
    const postId = req.params.id;
    const userId = req.session?.user?.id;

    try {
        const db = await connectDB();

        // 게시글 존재 여부 확인
        const [[post]] = await db.execute(`
            SELECT * FROM posts WHERE id = ?
        `, [postId]);

        if (!post) {
            await db.end();
            return res.status(404).json({ message: "게시글 없음" });
        }

        // 게시글 작성자인지 확인해도 좋음 (선택)
        // if (post.author_id !== userId) { return res.status(403).json({ message: "권한 없음" }); }

        // 관련 댓글 먼저 삭제
        await db.execute("DELETE FROM comments WHERE post_id = ?", [postId]);

        // 좋아요, 북마크 등 관련 데이터 정리 (선택)
        await db.execute("DELETE FROM likes WHERE target_type = 'post' AND target_id = ?", [postId]);
        await db.execute("DELETE FROM bookmarks WHERE post_id = ?", [postId]);

        // 게시글 삭제
        await db.execute("DELETE FROM posts WHERE id = ?", [postId]);

        await db.end();
        res.json({ success: true });
    } catch (err) {
        console.error("❌ 게시글 삭제 오류:", err);
        res.status(500).json({ message: "게시글 삭제 실패", error: err.message });
    }
});

router.post("/bookmarks", async (req, res) => {
    const { targetId, bookmarked } = req.body;
    const userId = req.session?.user?.id;

    if (!userId) return res.status(401).jso ({ message: "로그인 필요" });

    try {
        const db = await connectDB();

        if (bookmarked) {
            await db.execute(`
                INSERT IGNORE INTO bookmarks (user_id, post_id)
                VALUES (?, ?)
            `, [userId, targetId]);
        } else {
            await db.execute(`
                DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?
            `, [userId, targetId]);
        }

        await db.end();
        res.json({ success: true });
    } catch (err) {
        console.error("❌ 북마크 처리 오류:", err);
        res.status(500).json({ message: "북마크 처리 실패", error: err.message });
    }
});

// ✅ 내가 쓴 게시물 조회
router.get('/my-posts', async (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ message: "로그인이 필요합니다." });

    try {
        const db = await connectDB();
        const [myPosts] = await db.execute(`
            SELECT id, title, content, created_at
            FROM posts
            WHERE author_id = ?
            ORDER BY created_at DESC
        `, [userId]);

        await db.end();
        res.json(myPosts);
    } catch (err) {
        console.error("❌ 내가 쓴 글 조회 오류:", err);
        res.status(500).json({ message: "내 글 조회 실패", error: err.message });
    }
});

router.get('/bookmarked-posts', async (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ message: "로그인 필요" });

    try {
        const db = await connectDB();
        const [rows] = await db.execute(`
            SELECT p.*
            FROM likes l
            JOIN posts p ON l.target_id = p.id
            WHERE l.user_id = ? AND l.target_type = 'post' AND l.is_bookmarked = 1
            ORDER BY p.created_at DESC
        `, [userId]);

        await db.end();
        res.json(rows);
    } catch (err) {
        console.error("❌ 북마크 불러오기 오류:", err);
        res.status(500).json({ message: "서버 오류", error: err.message });
    }
});

router.post("/bookmark", async (req, res) => {
  const { targetType, targetId, bookmarked } = req.body;
  const userId = req.session?.user?.id;
  if (!userId) return res.status(401).json({ message: "로그인 필요" });

  await ensureBookmarkColumn();
  const db = await connectDB();

  if (bookmarked) {
    await db.execute(
      `INSERT INTO likes (user_id, target_type, target_id, is_bookmarked)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE is_bookmarked = 1`,
      [userId, targetType, targetId]
    );
  } else {
    await db.execute(
      `UPDATE likes SET is_bookmarked = 0 WHERE user_id = ? AND target_type = ? AND target_id = ?`,
      [userId, targetType, targetId]
    );
  }

  await db.end();
  res.json({ success: true });
});

module.exports = router;
