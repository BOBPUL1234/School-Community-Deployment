const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://school-community-deployment-1.onrender.com";

function togglePassword(id) {
    const field = document.getElementById(id);
    field.type = field.type === "password" ? "text" : "password";
}
function toggleLoginMode(isStudent) {
    document.getElementById("student-login-form").classList.toggle("hidden", !isStudent);
    document.getElementById("teacher-login-form").classList.toggle("hidden", isStudent);
    document.getElementById("student-login-btn").classList.toggle("active", isStudent);
    document.getElementById("teacher-login-btn").classList.toggle("active", !isStudent);
}
function showSignupOptions() {
    document.getElementById("main-container").classList.add("hidden");
    document.getElementById("signup-container").classList.remove("hidden");
}
function goBackToLogin() {
    document.getElementById("main-container").classList.remove("hidden");
    document.getElementById("signup-container").classList.add("hidden");
}
function toggleSignupMode(isStudent) {
    document.getElementById("student-signup-form").classList.toggle("hidden", !isStudent);
    document.getElementById("teacher-signup-form").classList.toggle("hidden", isStudent);
    document.getElementById("student-signup-btn").classList.toggle("active", isStudent);
    document.getElementById("teacher-signup-btn").classList.toggle("active", !isStudent);
}

// ✅ 비밀번호 보기 토글
function togglePassword(inputId) {
    const pwInput = document.getElementById(inputId);
    pwInput.type = pwInput.type === "password" ? "text" : "password";
}

// ✅ 학생 회원가입
function registerStudent() {
    event.preventDefault();
    
    const id = document.getElementById("student-register-id").value.trim();
    const name = document.getElementById("student-register-name").value.trim();
    const password = document.getElementById("student-register-password").value;

    if (!id || !name || !password) {
        alert("모든 항목을 입력해주세요.");
        return;
    }

    fetch(`${BASE_URL}/auth/signup/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, password })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if (data.success) window.location.href = data.redirect;
    })
    .catch(err => alert("❌ 오류 발생: " + err));
}

// ✅ 교사 회원가입
function registerTeacher() {
    event.preventDefault();

    const name = document.getElementById("teacher-register-name").value.trim();
    const password = document.getElementById("teacher-register-password").value;
    const securityKey = document.getElementById("teacher-register-key").value.trim();

    if (!name || !password || !securityKey) {
        alert("모든 항목을 입력해주세요.");
        return;
    }

    fetch(`${BASE_URL}/auth/signup/teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, securityKey })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if (data.success) window.location.href = data.redirect;
    })
    .catch(err => alert("❌ 오류 발생: " + err));
}

// ✅ 학생 로그인
function loginStudent() {
    event.preventDefault();
    
    const id = document.getElementById("student-login-id").value.trim();
    const name = document.getElementById("student-login-name").value.trim();
    const password = document.getElementById("student-login-password").value;

    if (!id || !name || !password) {
        alert("모든 항목을 입력해주세요.");
        return;
    }

    fetch(`${BASE_URL}/auth/login/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, name, password })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success && data.message) {
            alert(data.message);
        }
        if (data.success) {
            sessionStorage.setItem("userId", data.user.user_id);
            sessionStorage.setItem("role", data.user.role);

            // ✅ 로컬 저장 (🔥 요거 추가!)
            localStorage.setItem("userId", data.user.user_id);
            localStorage.setItem("role", data.user.role)

            window.location.replace(data.redirect); // 🚀 로그인 성공 시 main.html로 이동
        }
    })
    .catch(err => alert("❌ 오류 발생: " + err));
}

// ✅ 교사 로그인
function loginTeacher() {
    event.preventDefault();

    const name = document.getElementById("teacher-login-name").value.trim();
    const password = document.getElementById("teacher-login-password").value;

    if (!name || !password) {
        alert("모든 항목을 입력해주세요.");
        return;
    }

    fetch(`${BASE_URL}/auth/login/teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, password })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success && data.message) {
            alert(data.message);
        };
        if (data.success) {
            sessionStorage.setItem("userId", data.user.user_id);
            sessionStorage.setItem("role", data.user.role);

            // ✅ 로컬 저장 (🔥 요거 추가!)
            localStorage.setItem("userId", data.user.user_id);
            localStorage.setItem("role", data.user.role)

            window.location.replace(data.redirect); // 🚀 로그인 성공 시 main.html로 이동
        }
    })
    .catch(err => alert("❌ 오류 발생: " + err));
}
