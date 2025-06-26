require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const router = express.Router();

// ✅ MySQL DB 연결 설정
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME_SCHOOL
});

async function connectDB() {
  return await mysql.createConnection(dbConfig);
}

// ✅ 학생 및 교사 초기 데이터 설정 (미리 지정된 값)
const studentList = [
    { id: "1111", name: "배준형" },
    { id: "1115", name: "이노아" },
    { id: "1123", name: "한지후" },
    { id: "1210", name: "노윤성" },
    { id: "1212", name: "박창익" },
    { id: "1308", name: "김우찬" },
    { id: "1313", name: "신서우" },
    { id: "1316", name: "오제홍" },
    { id: "1321", name: "정재문" },
    { id: "1407", name: "김채원" },
    { id: "1410", name: "이원후" },
    { id: "1412", name: "이종건" },
    { id: "1505", name: "김성윤" },
    { id: "1522", name: "최유하" },
    { id: "1606", name: "김준완" },
    { id: "1607", name: "김지호" },
    { id: "1614", name: "염도윤" },
    { id: "1705", name: "김민준" },
    { id: "1721", name: "조영림" },
    { id: "1802", name: "구성민" },
    { id: "1804", name: "김민결" },
    { id: "1815", name: "유재하" },
    { id: "2109", name: "박시훈" },
    { id: "2114", name: "이두혁" },
    { id: "2305", name: "김영우" },
    { id: "2306", name: "김호연" },
    { id: "2309", name: "박제민" },
    { id: "2324", name: "홍지원" },
    { id: "2325", name: "허강" },
    { id: "2517", name: "송유빈" },
    { id: "2602", name: "김도원" },
    { id: "2606", name: "박민훈" },
    { id: "2607", name: "김민재" },
    { id: "2702", name: "김건" },
    { id: "2721", name: "최가람" },
    { id: "2803", name: "김준근" },
    { id: "2806", name: "류지완" },
    { id: "2814", name: "윤성운" },
    { id: "2818", name: "조승우" },
    { id: "3108", name: "김승민" },
    { id: "3118", name: "이현수" },
    { id: "3120", name: "장윤서" },
    { id: "3123", name: "정재훈" },
    { id: "3206", name: "김승준" },
    { id: "3221", name: "조원희" },
    { id: "3222", name: "진민호" },
    { id: "3402", name: "김동건" },
    { id: "3406", name: "김영동" },
    { id: "3506", name: "김보성" },
    { id: "3508", name: "김은재" },
    { id: "3509", name: "박정빈" },
    { id: "3510", name: "백승원" },
    { id: "3519", name: "임창제" },
    { id: "3523", name: "최민준" },
    { id: "3610", name: "배정훈" },
    { id: "3623", name: "김성현" },
    { id: "3701", name: "강민재" },
    { id: "3705", name: "류민준" },
    { id: "3709", name: "박성현" },
    { id: "3715", name: "장진" },
    { id: "3817", name: "정지원" },
    { id: "3820", name: "진지윤" },
    { id: "3904", name: "김민재" },
    { id: "3911", name: "신지훈" },
    { id: "3912", name: "유재범" },
    { id: "3917", name: "정성득" },
    { id: "3919", name: "차승민" },
    { id: "3922", name: "황수현" }
];

const teacherSecurityKey = "TCH-2025-SECURE";
const teacherList = ["이세민"];

// ✅ 테이블 생성
async function initTables() {
  const db = await connectDB();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(10) PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      password VARCHAR(255) NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS teachers (
      name VARCHAR(50) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      security_key VARCHAR(20) NOT NULL
    );
  `);
  await db.end();
}
initTables();

// ✅ 학생 회원가입
router.post("/signup/student", async (req, res) => {
    const { id, name, password } = req.body;
    if (!id || !name || !password) return res.json({ success: false, message: "❌ 모든 정보를 입력하세요." });

    // 🔍 사전 등록된 학생인지 확인
    const registeredStudent = studentList.find(student => student.id === id && student.name === name);
    if (!registeredStudent) return res.json({ success: false, message: "❌ 사전 등록된 학생이 아닙니다." });

    // 🔍 중복 가입 확인
    db.query("SELECT * FROM students WHERE id = ?", [id], async (err, results) => {
        if (err) return res.json({ success: false, message: "❌ 데이터베이스 오류: " + err.message });
        if (results.length > 0) return res.json({ success: false, message: "❌ 이미 가입된 학생입니다." });

        // 🔒 비밀번호 암호화 후 저장
            const hashedPassword = await bcrypt.hash(password, 10);
            db.query("INSERT INTO students (id, name, password) VALUES (?, ?, ?)", [id, name, hashedPassword], (err) => {
                if (err) return res.json({ success: false, message: "❌ 데이터베이스 오류: " + err.message });
                res.json({ success: true, message: "✅ 회원가입 성공! 로그인 페이지로 이동합니다.", redirect: "/" });
        });
    });
});

// ✅ 교사 회원가입
router.post("/signup/teacher", async (req, res) => {
    const { name, password, securityKey } = req.body;
    if (!name || !password || !securityKey) return res.json({ success: false, message: "❌ 모든 정보를 입력하세요." });

    // 🔍 보안키 확인
    if (securityKey !== teacherSecurityKey) return res.json({ success: false, message: "❌ 보안키가 올바르지 않습니다." });

    // 🔍 사전 등록된 교사인지 확인
    if (!teacherList.includes(name)) return res.json({ success: false, message: "❌ 사전 등록된 교사가 아닙니다." });

    // 🔍 중복 가입 확인
    db.query("SELECT * FROM teachers WHERE name = ?", [name], async (err, results) => {
        if (err) return res.json({ success: false, message: "❌ 데이터베이스 오류: " + err.message });
        if (results.length > 0) return res.json({ success: false, message: "❌ 이미 가입된 교사입니다." });

        // 🔒 비밀번호 암호화 후 저장
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query("INSERT INTO teachers (name, password, security_key) VALUES (?, ?, ?)", [name, hashedPassword, securityKey], (err) => {
            if (err) return res.json({ success: false, message: "❌ 데이터베이스 오류: " + err.message });
            res.json({ success: true, message: "✅ 회원가입 성공! 로그인 페이지로 이동합니다.", redirect: "/" });
        });
    });
});

// ✅ 학생 로그인
router.post("/login/student", async (req, res) => {
    const { id, name, password } = req.body;
    if (!id || !name || !password) return res.json({ success: false, message: "❌ 모든 정보를 입력하세요." });

    db.query("SELECT * FROM students WHERE id = ? AND name = ?", [id, name], async (err, results) => {
        if (err) return res.json({ success: false, message: "❌ 오류 발생: " + err.message });
        if (results.length === 0) return res.json({ success: false, message: "❌ 등록되지 않은 학생입니다." });

        const storedHashedPassword = results[0]?.password;
        if (!storedHashedPassword) return res.json({ success: false, message: "❌ 비밀번호가 저장되지 않았습니다." });

        const isMatch = await bcrypt.compare(password, storedHashedPassword);
            req.session.user = {
            id: results[0].id,
            name: results[0].name,
            role: 'student'
        };
        res.json({ success: isMatch, message: isMatch ? "✅ 로그인 성공!" : "❌ 비밀번호가 틀렸습니다.", redirect: "/main.html", user: { user_id: id } });
    });
});

// ✅ 교사 로그인
router.post("/login/teacher", async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) return res.json({ success: false, message: "❌ 모든 정보를 입력하세요." });

    db.query("SELECT * FROM teachers WHERE name = ?", [name], async (err, results) => {
        if (err) return res.json({ success: false, message: "❌ 오류 발생: " + err.message });
        if (results.length === 0) return res.json({ success: false, message: "❌ 등록되지 않은 교사입니다." });

        const isMatch = await bcrypt.compare(password, results[0].password);
        req.session.user = {
            id: results[0].name,
            name: results[0].name,
            role: 'teacher'
        };

        res.json({ success: isMatch, message: isMatch ? "✅ 로그인 성공!" : "❌ 비밀번호가 틀렸습니다.", redirect: "/main.html", user: { user_id: results[0].name } });
    });
});

router.get("/profile", async (req, res) => {
  const user = req.session?.user;
  if (!user) return res.json({ success: false });

  try {
    if (user.role === "student") {
      db.query("SELECT id, name FROM students WHERE id = ?", [user.id], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false });
        res.json({ success: true, ...results[0], role: "student" });
      });
    } else if (user.role === "teacher") {
      db.query("SELECT name FROM teachers WHERE name = ?", [user.name], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false });
        res.json({ success: true, id: results[0].name, name: results[0].name, role: "teacher" });
      });
    }
  } catch (e) {
    console.error(e);
    return res.json({ success: false });
  }
});

router.post("/change-password", async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId; // ✅ 로그인한 사용자 ID 가져오기

    if (!userId) return res.json({ success: false, message: "로그인이 필요합니다." });

    db.query("SELECT password FROM students WHERE id = ?", [userId], async (err, results) => {
        if (err || results.length === 0) {
            return res.json({ success: false, message: "사용자를 찾을 수 없습니다." });
        }

        const storedPassword = results[0].password;
        const isMatch = await bcrypt.compare(currentPassword, storedPassword);

        if (!isMatch) {
            return res.json({ success: false, message: "현재 비밀번호가 틀렸습니다." });
        }

        // 🔒 새 비밀번호 암호화 후 업데이트
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        db.query("UPDATE students SET password = ? WHERE id = ?", [hashedNewPassword, userId], (updateErr) => {
            if (updateErr) return res.json({ success: false, message: "비밀번호 변경 실패" });

            res.json({ success: true, message: "✅ 비밀번호가 변경되었습니다. 프로필 화면으로 이동합니다.", redirect: "/profile.html" });
        });
    });
});

module.exports = router;
