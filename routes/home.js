require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');

const router = express.Router();

async function createAppRouter() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS home`);
  await connection.end();

  const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_HOME,
    waitForConnections: true,
    connectionLimit: 10
  });

  const conn = await db.getConnection();
  await conn.query(`
    CREATE TABLE IF NOT EXISTS meals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL,
      type VARCHAR(10) NOT NULL,
      menu TEXT NOT NULL
    )
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS planner (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      date DATE NOT NULL,
      text TEXT NOT NULL,
      done BOOLEAN DEFAULT FALSE
    )
  `);
  conn.release();

  // 📌 아래부터 라우터 정의
  router.post('/meals', async (req, res) => {
    const meals = req.body;
    const conn = await db.getConnection();
    try {
      for (const date in meals) {
        for (const type in meals[date]) {
          const menu = meals[date][type].join(', ');
          await conn.query(
            'INSERT INTO meals (date, type, menu) VALUES (?, ?, ?)',
            [date, type, menu]
          );
        }
      }
      res.json({ status: 'ok' });
    } catch (err) {
      res.status(500).json({ error: '급식표 저장 실패' });
    } finally {
      conn.release();
    }
  });

  router.get('/meals', async (req, res) => {
    try {
      const [rows] = await db.query('SELECT date, type, menu FROM meals');
      const result = {};
      rows.forEach(({ date, type, menu }) => {
        if (!result[date]) result[date] = {};
        result[date][type] = menu.split(', ');
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: '급식표 조회 실패' });
    }
  });

  router.get('/planner/:userId/:date', async (req, res) => {
    const userId = req.session?.user?.id;
   const { date } = req.params;
    try {
      const [rows] = await db.query(    
        'SELECT id, text, done FROM planner WHERE user_id = ? AND date = ?',
        [userId, date]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: '플래너 조회 실패' });
    }
  });

  router.put('/planner/done/:id', async (req, res) => {
  const { id } = req.params;
  const { done } = req.body;
  try {
    await db.query('UPDATE planner SET done = ? WHERE id = ?', [done, id]);
    res.json({ status: 'updated' });
  } catch (err) {
    res.status(500).json({ error: '완료 상태 변경 실패' });
  }
});


router.post('/planner', async (req, res) => {
  const { date, text } = req.body;
  const userId = req.session?.user?.id;
  if (!userId) return res.status(401).json({ error: '로그인 필요' });

  await db.query(
    'INSERT INTO planner (user_id, date, text, done) VALUES (?, ?, ?, 0)',
    [userId, date, text]
  );
  res.json({ status: 'ok' });
});

router.get('/planner/:date', async (req, res) => {
  const userId = req.session?.user?.id;
  const { date } = req.params;
  if (!userId) return res.status(401).json({ error: '로그인 필요' });

  const [rows] = await db.query(
    'SELECT id, text, done FROM planner WHERE user_id = ? AND date = ?',
    [userId, date]
  );
  res.json(rows);
});

  router.delete('/planner/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await db.query('DELETE FROM planner WHERE id = ?', [id]);
      res.json({ status: 'deleted' });
    } catch (err) {
      res.status(500).json({ error: '플래너 삭제 실패' });
    }
  });

  return router;
}

module.exports = createAppRouter;
