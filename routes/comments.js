require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME_COMMUNITY,
  charset: 'utf8mb4'
};

async function connectDB() {
    const conn = await mysql.createConnection(dbConfig);
    return conn;
}

async function ensurePostsTableHasAuthorId() {
    const db = await connectDB();

    // author_id 컬럼이 존재하는지 확인
    const [columns] = await db.execute(`
        SHOW COLUMNS FROM posts LIKE 'author_id'
    `);

    if (columns.length === 0) {
        console.log("⚠️ posts 테이블에 author_id 컬럼이 없어 자동 추가합니다...");
        await db.execute(`
            ALTER TABLE posts ADD COLUMN author_id VARCHAR(50) NOT NULL DEFAULT 'anonymous'
        `);
    }

    await db.end();
}

async function ensureCommentsTableHasUserId() {
    const db = await connectDB();

    const [columns] = await db.execute(`
        SHOW COLUMNS FROM comments LIKE 'user_id'
    `);

    if (columns.length === 0) {
        console.log("⚠️ comments 테이블에 user_id 컬럼이 없어 자동 추가합니다...");
        await db.execute(`
            ALTER TABLE comments ADD COLUMN user_id VARCHAR(50) NOT NULL DEFAULT 'anonymous'
        `);
    } 
    await db.end();
}

async function ensureTablesExist() {
    const conn = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password
    });

    await conn.query("CREATE DATABASE IF NOT EXISTS community");
    await conn.changeUser({ database: 'community' });
    await conn.query("USE community");

    // posts 테이블 생성 (author_id 포함)
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS posts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            author_id VARCHAR(50) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // comments 테이블 생성 (user_id, nickname 포함)
    await conn.execute(`
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

    await conn.end();
}

async function ensureCommentsTableHasNickname() {
    const db = await connectDB();

    const [columns] = await db.execute(`SHOW COLUMNS FROM comments LIKE 'nickname'`);

    if (columns.length === 0) {
        console.log("⚠️ comments 테이블에 nickname 컬럼이 없어 자동 추가합니다...");
        await db.execute(`
            ALTER TABLE comments ADD COLUMN nickname VARCHAR(20) NOT NULL DEFAULT '익명'
        `);
    }

    await db.end();
}

(async () => {
  await ensureTablesExist(); // 테이블 생성
  await ensurePostsTableHasAuthorId();  
  await ensureCommentsTableHasUserId();
  await ensureCommentsTableHasNickname();
})();

// ✅ 내가 단 댓글만 불러오기 (대댓글 제외)
router.get('/my-comments', async (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ message: "로그인 필요" });

    try {
        const db = await connectDB();
        const [comments] = await db.execute(`
            SELECT c.*, p.title
            FROM comments c
            JOIN posts p ON c.post_id = p.id
            WHERE c.user_id = ? AND c.parent_id IS NULL
            ORDER BY c.created_at DESC
        `, [userId]);

        await db.end();
        res.json(comments);
    } catch (err) {
        console.error("❌ 내가 쓴 댓글 조회 오류:", err);
        res.status(500).json({ message: "❌ 내가 쓴 댓글 조회 실패", error: err.message });
    }
});

// ✅ 댓글 목록 조회
router.get('/:postId', async (req, res) => {
    const { postId } = req.params;
    const userId = req.session?.user?.id;

    try {
        const db = await connectDB();
        const [comments] = await db.execute(
            "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC",
            [postId]
        );

        // 각 댓글에 대해 isLiked 여부 추가
        for (const comment of comments) {
            if (userId) {
                const type = comment.parent_id === null ? 'comment' : 'reply';
                const [[liked]] = await db.execute(`
                    SELECT 1 FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?
                `, [userId, type, comment.id]);
                comment.isLiked = !!liked;
            } else {
                comment.isLiked = false;
            }
        }

        await db.end();
        res.json(comments);
    } catch (err) {
        console.error("❌ 댓글 조회 오류:", err);
        res.status(500).json({ message: "❌ 댓글 조회 실패", error: err.message });
    }
});


// ✅ 댓글/대댓글 추가
router.post('/', async (req, res) => {
    const { postId, text, parentId } = req.body;
    const userId = req.session?.user?.id;

    if (!postId || !text || !userId) {
        return res.status(400).json({ message: "❌ postId, text, userId는 필수입니다." });
    }

    try {
        const db = await connectDB();

        // 1. 게시글 작성자 가져오기
        const [[post]] = await db.execute("SELECT author_id FROM posts WHERE id = ?", [postId]);
        const postAuthorId = String(post?.author_id || "");
        const currentUserId = String(req.session?.user?.id);

        // 2. 이 게시글에서 기존 nickname 확인
        const [existing] = await db.execute(`
            SELECT user_id, nickname FROM comments
            WHERE post_id = ? AND nickname IS NOT NULL
        `, [postId]);

        const nicknameMap = new Map();
        let maxAnon = 0;

        for (const c of existing) {
            nicknameMap.set(c.user_id, c.nickname);
            const match = c.nickname.match(/^익명(\d+)$/);
            if (match) maxAnon = Math.max(maxAnon, parseInt(match[1]));
        }

        // 3. 새 nickname 결정
        let nickname;
        if (currentUserId === postAuthorId) {
            nickname = "익명(작성자)";
        } else if (nicknameMap.has(currentUserId)) {
            nickname = nicknameMap.get(currentUserId);
        } else {
            nickname = `익명${++maxAnon}`;
            nicknameMap.set(currentUserId, nickname);
        }

        // 4. 댓글 삽입
        const [result] = await db.execute(`
            INSERT INTO comments (post_id, parent_id, user_id, nickname, text, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [postId, parentId || null, userId, nickname, text]);

        await db.end();

        res.json({ success: true, id: result.insertId, postId, parentId, userId, nickname, text });
    } catch (err) {
        console.error("❌ 댓글 저장 오류:", err);
        res.status(500).json({ message: "❌ 댓글 저장 실패", error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const commentId = req.params.id;

    try {
        const db = await connectDB();
        await db.execute("DELETE FROM comments WHERE id = ?", [commentId]);
        await db.end();
        res.json({ success: true });
    } catch (err) {
        console.error("❌ 댓글 삭제 오류:", err);
        res.status(500).json({ message: "❌ 댓글 삭제 실패", error: err.message });
    }
});

module.exports = router;
