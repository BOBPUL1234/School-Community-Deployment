require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');

const app = express();
const PORT = 3000;

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
const boardRoutes = require('./routes/board');
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

// ✅ 비동기 라우터 연결 및 서버 시작
createAppRouter().then(homeRouter => {
  app.use("/home", homeRouter);

  app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("❌ homeRouter 초기화 실패:", err);
});