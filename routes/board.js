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
    // 1단계: MySQL 서버에 연결 (DB 없음)
    const rootConnection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    });

    // 2단계: DB 없으면 생성
    await rootConnection.query("CREATE DATABASE IF NOT EXISTS " + process.env.DB_NAME_COMMUNITY);

    // 3단계: community DB로 다시 연결
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME_COMMUNITY
    });

    // 4단계: 필요한 테이블 생성
    if (module.filename.includes("board.js")) {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                author_id VARCHAR(50) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    await db.execute(`
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            post_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_bookmark (user_id, post_id),
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        )
    `);

    if (module.filename.includes("comments.js")) {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                parent_id INT DEFAULT NULL,
                text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id),
                FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
            )
        `);
    }

    // posts 테이블에 likes 컬럼 없으면 추가
    const [likesCol] = await db.execute(`SHOW COLUMNS FROM posts LIKE 'likes'`);
    if (likesCol.length === 0) {
      await db.execute(`ALTER TABLE posts ADD COLUMN likes INT DEFAULT 0`);
    }

    await db.end();
    await rootConnection.end();
}

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
    const userId = req.session?.user?.id || null;

    try {
        const db = await connectDB();

        let postsQuery = `
            SELECT 
                p.*,
                ${userId ? `
                    EXISTS (
                        SELECT 1 FROM likes l
                        WHERE l.user_id = ? AND l.target_type = 'post' AND l.target_id = p.id
                    ) AS isLiked,
                    EXISTS (
                        SELECT 1 FROM likes l
                        WHERE l.user_id = ? AND l.target_type = 'post' AND l.target_id = p.id AND l.is_bookmarked = 1
                    ) AS isBookmarked
                ` : `0 AS isLiked, 0 AS isBookmarked`}
            FROM posts p
            ORDER BY p.created_at DESC
        `;

        const [posts] = userId
            ? await db.execute(postsQuery, [userId, userId])
            : await db.execute(postsQuery);

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

    if (!userId) return res.status(401).json ({ message: "로그인 필요" });

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

module.exports = {
  router,
  ensureDatabaseAndTables
};

