const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://school-community-deployment-1.onrender.com";

function openActivity(title) {
  document.getElementById("activityTitle").innerText = title;
  document.getElementById("activityScreen").style.display = "flex";
  localStorage.setItem("userProfile", JSON.stringify({ userName: "홍길동" }));
  // 샘플 글 데이터
  const posts = [
    "첫 번째 글 제목입니다.",
    "두 번째 글입니다. 여기는 내용 미리보기.",
    "이건 내가 댓글 단 게시물.",
    "좋아요한 글 테스트입니다."
  ];

  const content = posts.map(p => 
    `<div class="post" onclick="alert('글 상세 페이지로 이동')">${p}</div>`
  ).join("");

  document.getElementById("activityContent").innerHTML = content;
}

async function loadMyPosts() {
    try {
        const res = await fetch('${BASE_URL}/board/my-posts');
        const posts = await res.json();

        const contentArea = document.getElementById("activityContent");
        contentArea.innerHTML = "";  // 초기화

        posts.forEach(post => {
            const div = document.createElement("div");
            div.className = "post";
            div.innerHTML = `
                <h4>${post.title}</h4>
                <p>${post.content}</p>
                <small>${new Date(post.created_at).toLocaleString()}</small>
            `;
            div.addEventListener("click", () => showMyPostDetail(post));
            contentArea.appendChild(div);
        });

        document.getElementById("activityTitle").innerText = "내가 작성한 게시물";
        document.getElementById("activityScreen").style.display = "flex";
    } catch (err) {
        alert("❌ 내 게시물 조회 실패");
        console.error(err);
    }
}

function closeActivity() {
  document.getElementById("activityScreen").style.display = "none";
}

function openPasswordPopup() {
  document.getElementById("passwordPopup").style.display = "flex";
}

function closePasswordPopup() {
  document.getElementById("passwordPopup").style.display = "none";
}

function openLogoutPopup() {
  document.getElementById("logoutPopup").style.display = "flex";
}

function closeLogoutPopup() {
  document.getElementById("logoutPopup").style.display = "none";
}

// 이름 변경 팝업 열기/닫기
function openNameChangePopup() {
  document.getElementById("nameChangePopup").style.display = "flex";
}

function closeNameChangePopup() {
  document.getElementById("nameChangePopup").style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("${BASE_URL}/auth/profile", { credentials: "include" }); // ✅ 서버에서 사용자 정보 요청
        const data = await response.json();

        if (data.success) {
            document.querySelector(".header").textContent = `${data.name} 님의 마이페이지`; // ✅ 로그인한 사용자 이름 표시\
            sessionStorage.setItem("userId", data.id); // ✅ userId 저장
        } else {
            alert("사용자 정보를 불러올 수 없습니다.");
            window.location.href = "/"; // ✅ 로그인 페이지로 이동
        }
    } catch (error) {
        console.error("❌ 오류 발생:", error);
    }
});

async function changePassword() {
    const currentPassword = document.getElementById("currentPassword").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert("모든 항목을 입력해주세요.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("새 비밀번호가 일치하지 않습니다.");
        return;
    }

    try {
        const response = await fetch("${BASE_URL}/auth/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        const data = await response.json();
        alert(data.message);

        if (data.success) {
            window.location.href = "/profile.html"; // ✅ 성공 시 프로필 화면으로 자동 이동
        }
    } catch (error) {
        console.error("❌ 오류 발생:", error);
        alert("비밀번호 변경 중 오류가 발생했습니다.");
    }
}

function showMyPostDetail(post) {
    const content = document.getElementById("activityContent");
    content.innerHTML = "";  // 내용 초기화

    // const postList = document.createElement("div");
    // postList.id = "postList";
    // content.appendChild(postList);

    document.getElementById("activityTitle").innerText = "내 게시글 상세";
    document.getElementById("activityScreen").style.display = "flex";

    showPostDetail(post);  // postList를 해당 영역에 그려줌
}

function closePostPopup() {
    document.getElementById("activityPopup").style.display = "none";
    document.getElementById("activityScreen").style.display = "flex";
}

async function loadLikedPosts() {
    try {
        const res = await fetch("${BASE_URL}/likes/liked-posts", { credentials: "include" }); // 좋아요한 게시물 API
        const posts = await res.json();

        const contentArea = document.getElementById("activityContent");
        contentArea.innerHTML = ""; // 초기화

        posts.forEach(post => {
            const div = document.createElement("div");
            div.className = "post";
            div.innerHTML = `
                <h4>${post.title}</h4>
                <p>${post.content}</p>
                <small>${new Date(post.created_at).toLocaleString()}</small>
            `;
            div.addEventListener("click", () => showMyPostDetail(post)); // 상세보기 연결
            contentArea.appendChild(div);
        });

        document.getElementById("activityTitle").innerText = "좋아요한 게시물";
        document.getElementById("activityScreen").style.display = "flex";
    } catch (err) {
        alert("❌ 좋아요한 게시물 조회 실패");
        console.error(err);
    }
}

async function loadBookmarkedPosts() {
    try {
        const res = await fetch('${BASE_URL}/board/bookmarked-posts', { credentials: "include" });
        const type = res.headers.get("content-type");
        if (!res.ok || !type.includes("application/json")) {
            throw new Error("❌ 서버 응답이 JSON이 아님");
        }

        const posts = await res.json();
        const content = document.getElementById("activityContent");
        content.innerHTML = "";

        posts.forEach(post => {
            post.isBookmarked = true; 

            const div = document.createElement("div");  
            div.className = "post";
            div.innerHTML = `
                <h4>${post.title}</h4>
                <small>${new Date(post.created_at).toLocaleString()}</small>
            `;
            div.onclick = () => showMyPostDetail(post);
            content.appendChild(div);
        });

        document.getElementById("activityTitle").innerText = "북마크한 게시물";
        document.getElementById("activityScreen").style.display = "flex";
    } catch (err) {
        alert("❌ 북마크한 게시물 불러오기 실패");
        console.error(err);
    }
}

async function loadMyComments() {
    try {
        const res = await fetch('${BASE_URL}/comments/my-comments', { credentials: "include" });
        const comments = await res.json();

        const content = document.getElementById("activityContent");
        content.innerHTML = "";

        comments.forEach(comment => {
            const div = document.createElement("div");
            div.className = "post";
            div.innerHTML = `
                <h4>📌 ${comment.title}</h4>
                <p>💬 ${comment.text}</p>
                <small>${new Date(comment.created_at).toLocaleString()}</small>
            `;
            div.onclick = () => {
                // 게시글로 이동
                showMyPostDetail({ id: comment.post_id, title: comment.title });
            };
            content.appendChild(div);
        });

        document.getElementById("activityTitle").innerText = "내가 작성한 댓글";
        document.getElementById("activityScreen").style.display = "flex";
    } catch (err) {
        console.error("❌ 내가 작성한 댓글 불러오기 실패", err);
        alert("❌ 내가 작성한 댓글을 불러오지 못했습니다.");
    }
}
