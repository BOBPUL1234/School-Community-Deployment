require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const { router: boardRoutes, ensureDatabaseAndTables } = require("./routes/board"); // 또는 ensureTables.js
const mysql = require('mysql2/promise');
const router = express.Router();

//DB 생성 로직 (school_db 없으면 자동 생성)
(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
   });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME_SCHOOL}\``);
    console.log(`✅ '${process.env.DB_NAME_SCHOOL}' 데이터베이스 생성 또는 확인 완료`);
    await connection.end();
  } catch (err) {
    console.error('❌ DB 생성 중 오류 발생:', err);
    process.exit(1); // DB가 안 만들어졌으면 서버도 종료
  }

  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // ✅ CORS 설정
  app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
  }));
  
  // ✅ 세션 설정
  app.use(session({
    secret: "bc79c1d3b7e23c4aa1bd9f28e12cbccd2a3c488ab6f91f14958fd2c81b8b263a",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true }
  }));
  
  ensureDatabaseAndTables()
    .then(() => console.log("✅ 'community' 데이터베이스 및 테이블 준비 완료"))
    .catch(err => console.error("❌ DB 준비 실패:", err));
    
  // ✅ 기본 미들웨어
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(express.static(path.join(__dirname, 'public')));
  
  // ✅ 페이지 라우팅
  app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
  app.get("/main", (req, res) => res.sendFile(path.join(__dirname, "public", "main.html")));
  app.get("/timetable", (req, res) => res.sendFile(path.join(__dirname, "public", "timetable.html")));
  app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "public", "chat.html")));
  app.get("/chatroom", (req, res) => res.sendFile(path.join(__dirname, "public", "chatroom.html")));
  app.get("/anonymous", (req, res) => res.sendFile(path.join(__dirname, "public", "anonymous.html")));
  app.get("/profile", (req, res) => res.sendFile(path.join(__dirname, "public", "profile.html")));
  
  // ✅ 라우터 연결 (비동기 처리)
  const authRoutes = require('./routes/auth');
  const timetableRouter = require('./routes/time');
  const commentsRoutes = require('./routes/comments');
  const likesRouter = require("./routes/likes");
  const createAppRouter = require("./routes/home"); // 여기 중요!
  
  app.use("/auth", authRoutes);
  app.use("/time", timetableRouter);
  app.use("/chat", require('./routes/chat_messages'));
  app.use("/chat", require('./routes/chat_rooms'));
  app.use("/chat", require('./routes/chat_participants'));
  app.use("/board", boardRoutes);
  app.use("/comments", commentsRoutes);
  app.use("/likes", likesRouter); 
  
  try {
    await ensureDatabaseAndTables();
    console.log("✅ community DB 및 테이블 준비 완료");
  } catch (err) {
    console.error("❌ community DB 준비 실패:", err);
  }

  try {
    const homeRouter = await createAppRouter();
    app.use("/home", homeRouter);
  } catch (err) {
    console.error("❌ homeRouter 초기화 실패:", err);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 서버 실행됨: http://0.0.0.0:${PORT}`);
  });
})();
