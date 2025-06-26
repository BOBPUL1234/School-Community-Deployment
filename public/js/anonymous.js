const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://your-backend-service.onrender.com";

let posts = [];  // 🔧 모든 함수가 접근 가능하도록
let currentPostIndex = null;  // 🔧 반드시 최상단에 선언되어야 함

const postModal = document.getElementById("postModal");

async function loadPostsFromServer() {
    try {
        const response = await fetch('${BASE_URL}/board/posts'); // ✅ 서버에서 데이터 요청
        posts = await response.json(); // 🔥 서버에서 불러온 데이터를 posts 배열에 저장
        console.log("✅ 서버에서 데이터 불러오기 성공:", posts);
        renderPostList(); // 🔥 화면에 데이터 다시 렌더링
    } catch (error) {
        console.error("❌ 데이터 불러오기 오류:", error);
    }
}

// ✅ 새로고침하면 자동으로 서버 데이터 불러오기
document.addEventListener("DOMContentLoaded", loadPostsFromServer);

let sortMode = "latest"; // 기본값은 최신순

function sortPosts(mode = "recent") {
    sortMode = mode;

    if (sortMode === "popular") {
        posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
        posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    renderPostList(); // 정렬 후 목록 다시 출력
}

function isCommentAuthor(commentUserId, currentUserId) {
    return String(commentUserId) === String(currentUserId);
}

function isReplyAuthor(replyUserId, currentUserId) {
    return String(replyUserId) === String(currentUserId);
}

function getCurrentTime() {
    const now = new Date();
    return `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// 게시글 검색 함수
function searchPosts(keyword) {
    const posts = document.querySelectorAll(".post");
    keyword = keyword.toLowerCase();

    posts.forEach(post => {
        const title = post.querySelector("h4")?.innerText.toLowerCase() || "";
        const content = post.querySelector("p")?.innerText.toLowerCase() || "";
        const match = title.includes(keyword) || content.includes(keyword);
        post.style.display = match ? "block" : "none";
    });
}

// 입력 이벤트에 함수 연결
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", function () {
        searchPosts(this.value);   
    });
}

window.toggleModal = function () {
    const postModal = document.getElementById("postModal");
    postModal.style.display = postModal.style.display === "none" ? "block" : "none";
};

function truncateContent(text, maxLength, maxLines) {
    if (!text) {
        console.warn("⚠️ truncateContent() 오류: 입력된 텍스트가 없음!");
        return "";  // 빈 문자열 반환
    }

    const lines = text.split("\n"); // 줄바꿈 기준으로 분리
    let truncatedText = text.slice(0, maxLength); // 🔥 100자까지만 유지

    // 🔥 최대 줄 수를 초과하면 `...` 추가
    if (lines.length > maxLines) {
        truncatedText = lines.slice(0, maxLines).join("\n") + "...";
    } else if (text.length > maxLength) {
        truncatedText += "...";
    }

    return truncatedText;
}


// 게시글 목록 렌더링 (최신순)
function renderPostList() {
    let postList = document.getElementById("postList");
    if (!postList) {
        postList = document.createElement("div");
        postList.id = "postList";
        postList.className = "post-list";

        const activityScreen = document.getElementById("activityScreen");
        const activityContent = document.getElementById("activityContent");

        if (activityScreen && activityContent && activityScreen.contains(activityContent)) {
            activityContent.appendChild(postList);
        } else {
            document.body.appendChild(postList);
        }
    }

    postList.innerHTML = ""; 

    if (posts.length === 0) {
        console.warn("⚠️ 게시글 목록이 비어 있습니다!");
        return;
    }

    posts.forEach((post, index) => {
        const title = post.title || "제목 없음"; 
        const content = post.content || "내용 없음"; 

        const formattedTime = post.created_at || "시간 없음"; // ✅ 시간만 표시

        const summary = document.createElement("div");
        summary.className = "post";
        summary.style.cursor = "pointer";

        summary.innerHTML = `
            <div class="post-header">
                <small style="color: gray;">🕒 등록 시간: ${formattedTime}</small> <!-- ✅ 시간만 표시 -->
            </div>
            <div class="post-body">
                <h4 class="post-title">${title}</h4>
                <p>${content}</p>
            </div>
        `;

        summary.onclick = () => {
            console.log("✅ 게시글 클릭됨:", index);
            showPostDetail(post);
        };

        postList.appendChild(summary);
    });
    console.log("✅ 게시글 목록 렌더링 완료!");
}

// ✅ 대댓글 입력창 생성 함수
function createReplyInput(commentElement, commentIndex, repliesContainer) {
    const inputWrap = document.createElement("div");
    inputWrap.className = "reply-input-container";
    inputWrap.style.display = "flex";
    inputWrap.style.gap = "6px";
    inputWrap.style.marginTop = "6px";

    const input = document.createElement("textarea");
    input.placeholder = "대댓글 작성...";
    input.style.flex = "1";

    const button = document.createElement("button");
    button.textContent = "등록";

    button.onclick = function () {
        submitReply({ type: "click" }, input);
    };

    input.onkeydown = function (e) {
        submitReply(e, input);
    };

    inputWrap.appendChild(input);
    inputWrap.appendChild(button);

    // 입력칸을 댓글 아래, 대댓글 위쪽에 추가
    commentElement.insertBefore(inputWrap, repliesContainer);
}

function renderComments(comments) {
    const index = currentPostIndex; // ✅ 현재 보고 있는 게시글 인덱스를 명시적으로 지정

    console.log("🖥️ 댓글 렌더링 시작. 현재 게시글 인덱스:", index);

    if (!posts[index].comments || posts[index].comments.length === 0) {
        console.warn("⚠️ 댓글 데이터가 없음! 빈 배열로 설정.");
        posts[index].comments = []; // 🔥 undefined 또는 빈 값일 경우 대비
    }

    const commentBox = document.querySelector(".comments");
    if (!commentBox) {
        console.error("⚠️ 오류: 댓글 박스를 찾을 수 없습니다!");
        return;
    }

    commentBox.innerHTML = "";
    posts[index].comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const myUserId = sessionStorage.getItem("userId");

    posts[index].comments.forEach((comment, commentIndex) => {
        console.log(`📝 댓글 ${commentIndex}:`, comment.text);

        const commentDiv = document.createElement("div");
        commentDiv.className = "comment";
        commentDiv.dataset.id = comment.id;  // 고유 ID로 연결

        const isCommentAuthor = String(myUserId) === String(comment.user_id);

        commentDiv.innerHTML = `
            <div class="comment-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <strong>${comment.nickname}</strong>
                    <small style="color: gray;">${getCurrentTime()}</small>
                </div>
                ${isCommentAuthor ? `
                <div style="position: relative;">
                    <button class="comment-menu-button" onclick="toggleCommentMenu(this)">⋮</button>
                    <div class="comment-menu" style="
                        display: none;
                        position: absolute;
                        top: 24px;
                        right: 0;
                        background: white;
                        border: 1px solid gray;
                        padding: 4px;
                        min-width: 60px;
                        text-align: center;
                        z-index: 100;
                    ">
                        <button onclick="deleteComment(${comment.id})">🗑 삭제</button>
                    </div>
                </div>
            ` : ""}
            </div>
            <div class="comment-content">
                ${comment.text.replace(/\n/g, "<br>")}
                <img src="${comment.isLiked ? "/png/love_2.png" : "/png/love_1.png"}" class="like-icon" data-liked="${comment.isLiked}" data-type="comment" data-id="${comment.id}" onclick="toggleLikeImage(this)">
            </div>
            <div class="comment-actions">
                <span class="like-count">좋아요 수: ${comment.likes || 0}</span>
                <button onclick="replyToComment(this)">↪ 대댓글</button>
            </div>
        `;

        commentBox.appendChild(commentDiv);

        // 🔥 `.replies` 요소를 확실하게 생성 후 `appendChild()`
        let repliesContainer = document.createElement("div");
        repliesContainer.className = "replies";
        commentDiv.appendChild(repliesContainer);

        console.log("✅ 대댓글 컨테이너 추가됨:", repliesContainer);

        // `repliesContainer`를 `renderReplies()`에 전달 (undefined 오류 방지)
        renderReplies(comment.replies, repliesContainer); // 🔥 올바르게 전달

        const replyButton = document.createElement("button");
        replyButton.textContent = "↪ 대댓글 달기";
        replyButton.onclick = () => {
            const repliesContainer = commentDiv.querySelector(".replies");
            createReplyInput(commentDiv, commentIndex, repliesContainer);
        };
    });

    console.log("🔥 댓글 렌더링 후 `.replies` 존재 여부:", document.querySelector(".replies"));
}

function nestComments(flatComments) {
    const commentMap = {};
    const nested = [];

    flatComments.forEach(c => {
        c.replies = [];
        commentMap[c.id] = c;
    });

    flatComments.forEach(c => {
        if (c.parent_id) {
            commentMap[c.parent_id]?.replies.push(c);
        } else {
            nested.push(c);
        }
    });

    return nested;
}

async function loadCommentsForPost(postId) {
    try {
        const response = await fetch(`${BASE_URL}/comments/${postId}`);
        const data = await response.json();

        if (Array.isArray(data)) {
            return data;
        } else if (Array.isArray(data.comments)) {
            return data.comments;
        } else {
            console.error("❌ 댓글 응답 형식 오류: 배열이 아님", data);
            return [];
        }
    } catch (error) {
        console.error("❌ 댓글 불러오기 실패:", error);
        return [];
    }
}

// 게시글 상세보기
async function showPostDetail(post) {
    let postList = document.getElementById("postList");
    if (!postList) {
        postList = document.createElement("div");
        postList.id = "postList";
    }

    const activityScreen = document.getElementById("activityScreen");
    const popup = document.getElementById("activityPopup");
    const activityContent = document.getElementById("activityContent");

    if (activityContent && activityScreen?.contains(activityContent)) {
        activityContent.innerHTML = "";
        activityContent.appendChild(postList); // ✅ 프로필 화면
    } else if (popup) {
        if (!popup.contains(postList)) popup.appendChild(postList);
    } else {
        if (!document.body.contains(postList)) {
            document.body.appendChild(postList);  // 오직 게시판에서만 추가됨
        }
    }

    let index = posts.findIndex(p => p.id === post.id);
    if (index === -1) {
        posts.push(post);
        index = posts.length - 1;
    }
    currentPostIndex = index;

    postList.innerHTML = "";

    const detail = document.createElement("div");
    
    // ✅ 댓글 불러오기 및 계층화
    const comments = await loadCommentsForPost(post.id);  // ✅ 댓글 불러오기
    const nestedComments = nestComments(comments);        // ✅ 계층화
    posts[index].comments = nestedComments;               // ✅ post 객체에 저장

    const myUserId = sessionStorage.getItem("userId");
    const isAuthor = String(myUserId) === String(post.author_id);
    const authorLabel = isAuthor ? "익명(작성자)" : "익명";

    detail.className = "post";
    detail.innerHTML = `
        <div class="post" data-id="${post.id}">
            <button id="backToListBtn" onclick="renderPostList()">⬅ 목록으로 돌아가기</button>
            <div class="post-header" style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="/png/profile_1.png" class="profile-pic" alt="익명">
                    <strong>${authorLabel}</strong>
                    <small style="color: gray;"> ${new Date(post.created_at).toLocaleString()}</small>
                </div>
                ${isAuthor ? `
                    <button class="post-menu-button" onclick="togglePostMenu(this)">⋮</button>
                    <div class="post-menu" style="display: none; position: absolute; right: 0; background: white; border: 1px solid gray; padding: 6px;">
                        <button onclick="deletePost(${post.id})">🗑 삭제</button>
                    </div>
                ` : ""}
            </div>
            <div class="post-body">
                <h4 class="post-title">${post.title}</h4>
                <p class="post-content">${post.content}</p>
            </div>
            <div class="post-footer">
                <span class="like-count">좋아요 수: ${post.likes || 0}</span>
                <img src="${post.isLiked ? "/png/love_2.png" : "/png/love_1.png"}" class="like-icon" data-liked="${post.isLiked}" data-type="post" data-id="${post.id}" onclick="toggleLikeImage(this)">
                <img src="${post.showingComments ? '/png/message_2.png' : '/png/message_1.png'}"
                    class="comment-toggle-icon"
                    data-shown="${post.showingComments ? 'true' : 'false'}"
                    onclick="toggleCommentsImage(this)">
                <img src="${post.isBookmarked ? "/png/bookmark_2.png" : "/png/bookmark_1.png"}"
                    class="bookmark-icon"
                    data-bookmarked="${post.isBookmarked}"
                    data-type="post"
                    data-id="${post.id}"
                    onclick="toggleBookmarkImage(this)">
            </div>
            <div class="comments-section" style="display: block;">
                <div class="comment-input-container" style="display: flex; flex-direction: column; gap: 6px;">
                    <textarea class="comment-input" placeholder="댓글 작성..." onkeydown="submitComment(event, this)"></textarea>
                    <button class="submit-comment-button" onclick="submitCommentByButton(this)">등록</button>
                </div>
                <div class="comments"></div>
            </div>
        </div>
    `;

    if (!window.location.pathname.includes("anonymous")) {
        if (activityScreen) activityScreen.style.display = "none";
    }
    postList.appendChild(detail);                         // ✅ 먼저 게시글 HTML 추가
    renderComments(nestedComments);  
}

// 대댓글 렌더링
function renderReplies(replies, container) {
    container.innerHTML = "";
    const sortedReplies = replies.slice().reverse(); // 최신순

    let visibleCount = 3;
    let shownReplies = sortedReplies.slice(0, visibleCount);  // 처음 표시할 3개

    function updateReplies() {
        container.innerHTML = "";

        shownReplies.forEach(reply => {
            const myUserId = sessionStorage.getItem("userId");
            const isAuthor = String(reply.user_id) === String(myUserId);

            const replyDiv = document.createElement("div");
            replyDiv.className = "reply";
            replyDiv.dataset.id = reply.id; 
            replyDiv.innerHTML = `
                <div class="comment-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong>${reply.nickname}</strong>
                        <small style="color: gray;">${getCurrentTime()}</small>
                    </div>
                    ${isAuthor ? `
                        <div style="position: relative;">
                            <button class="comment-menu-button" onclick="toggleCommentMenu(this)">⋮</button>
                            <div class="comment-menu" style="
                                display: none;
                                position: absolute;
                                top: 24px;
                                right: 0;
                                background: white;
                                border: 1px solid gray;
                                padding: 4px;
                                min-width: 60px;
                                text-align: center;
                                z-index: 100;
                            ">
                                <button onclick="deleteComment(${reply.id})">🗑 삭제</button>
                            </div>
                        </div>
                    ` : ""}
                </div>
                <div class="comment-content">${reply.text.replace(/\n/g, "<br>")}</div>
                <div class="comment-actions">
                    <span class="like-count">좋아요 수: ${reply.likes || 0}</span>
                    <img src="${reply.isLiked ? "/png/love_2.png" : "/png/love_1.png"}" class="like-icon" data-liked="${reply.isLiked}" data-type="reply" data-id="${reply.id}" onclick="toggleLikeImage(this)">
                </div>
            `;
            container.appendChild(replyDiv);
        });

        if (shownReplies.length < sortedReplies.length) {
            const moreButton = document.createElement("button");
            moreButton.textContent = "더보기";
            moreButton.className = "show-more-button";
            moreButton.onclick = () => {
                visibleCount += 3;
                shownReplies = sortedReplies.slice(0, visibleCount);
                updateReplies();
            };
            container.appendChild(moreButton);
        }
    }

    updateReplies(); // 초기 3개 렌더링
}

async function loadPostsFromServer() {
    try {
        const response = await fetch('${BASE_URL}/board/posts');

        if (!response.ok) {
            throw new Error(`❌ 서버 응답 오류: ${response.status}`);
        }

        const data = await response.json();

        // ✅ 배열이 아닌 경우 예외 처리
        if (!Array.isArray(data)) {
            throw new Error("❌ 서버에서 받은 데이터가 배열이 아닙니다.");
        }

        posts = data;
        console.log("✅ 서버에서 데이터 불러오기 성공:", posts);
        renderPostList(); // 🔥 화면에 출력
    } catch (error) {
        console.error("❌ 데이터 불러오기 오류:", error.message);
    }
}

function getCurrentDateTimeForMySQL() {
    const now = new Date();

    // 한국 시간 보정
    const offset = now.getTimezoneOffset() * 60000;
    const koreaTime = new Date(now.getTime() - offset + 9 * 3600000); // UTC +9

    return koreaTime.toISOString().slice(0, 19).replace("T", " ");
}

async function addPost() {
    const title = document.getElementById("postTitle").value.trim();
    const content = document.getElementById("postContent").value.trim();

    if (!title || !content) {
        alert("제목과 내용을 모두 입력해주세요.");
        return;
    }

    try {
        const response = await fetch('${BASE_URL}/board/post', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content })  // 🔥 created_at 포함
        });

        const newPost = await response.json();
        console.log("✅ 게시글 서버 저장 완료:", newPost);

        await loadPostsFromServer();
        toggleModal();
        document.getElementById("postTitle").value = "";
        document.getElementById("postContent").value = "";
        location.reload()
    } catch (error) {
        console.error("❌ 게시글 저장 오류:", error);
    }
}


function toggleBookmark(btn) {
    btn.classList.toggle("bookmarked");
    btn.textContent = btn.classList.contains("bookmarked") ? "✅ 저장됨" : "🔖";
}

function toggleComments(btn) {
    const post = btn.closest(".post");
    const commentSection = post.querySelector(".comments-section");
    commentSection.style.display = commentSection.style.display === "none" ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", async function () {
    try {
        const response = await fetch('${BASE_URL}/board/posts');
        posts = await response.json();
        console.log("✅ 서버에서 불러온 게시글:", posts);
        if (posts.length === 0) {
            console.warn("⚠️ 서버에서 게시글이 비어 있습니다! 서버에서 데이터를 다시 확인하세요.");
        }
        renderPostList(); // 🔥 화면 업데이트
    } catch (error) {
        console.error("❌ 서버에서 데이터 불러오기 오류:", error);
    }
});


async function submitComment(event, input) {
    if (event.key === "Enter" && event.ctrlKey) {
        console.log("🔥 Ctrl + Enter 입력 감지됨: 줄바꿈 적용");
        input.value += "\n";
        return;
    }

    if (event.key === "Enter") {
        const comment = input.value.trim();
        if (!comment) return;

        if (currentPostIndex === null || !posts[currentPostIndex]) {
            console.error("❌ 게시글을 찾을 수 없음!");
            return;
        }

        const postId = posts[currentPostIndex].id;

        try {
            const response = await fetch('${BASE_URL}/comments', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postId,
                    text: comment,
                    parentId: null  // ✅ 대댓글 아님
                }),
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`❌ 서버 오류: ${response.status}`);
            }

            const comments = await loadCommentsForPost(postId);     // 🔄 게시글 목록 및 댓글 갱신
            posts[currentPostIndex].comments = nestComments(comments); // ✅ 구조화
            renderComments(posts[currentPostIndex].comments);  // 💬 댓글 표시
            input.value = "";                 // 입력창 초기화
        } catch (error) {
            console.error("❌ 댓글 저장 오류:", error);
        }
    }
}


async function submitReply(event, input) {
    if (event.key === "Enter" && event.ctrlKey) {
        input.value += "\n";
        return;
    }

    if (event.key === "Enter" || event.type === "click") {
        const text = input.value.trim();
        if (!text) return;

        const commentDiv = input.closest(".comment");
        
        const postId = posts[currentPostIndex].id;
        const parentId = parseInt(commentDiv.dataset.id);  // 댓글의 고유 ID로 연결

        try {
            const response = await fetch("${BASE_URL}/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postId,
                    text,
                    parentId  // ✅ 대댓글이므로 부모 댓글 ID 설정
                }),
                credentials: "include"
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "❌ 서버 오류");
            }

            const comments = await loadCommentsForPost(postId);
            posts[currentPostIndex].comments = nestComments(comments); // ✅ 구조화
            renderComments(posts[currentPostIndex].comments); 
        } catch (error) {
            console.error("❌ 대댓글 저장 오류:", error);
        }

        input.parentElement.remove();
    }
}

async function submitCommentByButton(button) {
    const input = button.previousElementSibling;
    const comment = input.value.trim();
    if (!comment) return;

    if (currentPostIndex === null || !posts[currentPostIndex]) {
        console.error("❌ 게시글을 찾을 수 없음!");
        return;
    }

    const postId = posts[currentPostIndex].id;

    try {
        // ✅ 서버로 댓글 저장 요청
        const response = await fetch('${BASE_URL}/comments', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                postId,
                text: comment,
                parentId: null
            }),
            credentials: "include"
        });

        const result = await response.json();  // ✅ 반드시 JSON 파싱

        if (!response.ok) {
            throw new Error(result.message || `❌ 서버 오류: ${response.status}`);
        }

        // ✅ 댓글 저장 성공 → 다시 전체 댓글 불러오기
        const comments = await loadCommentsForPost(postId);
        posts[currentPostIndex].comments = nestComments(comments); // ✅ 구조화
        renderComments(posts[currentPostIndex].comments); 

        input.value = "";  // 입력칸 초기화
    } catch (error) {
        console.error("❌ 댓글 저장 오류:", error);
        alert("댓글 저장에 실패했습니다.");
    }
}

function replyToComment(btn) {
    const commentElement = btn.closest(".comment");
    let repliesContainer = commentElement.querySelector(".replies");

    // repliesContainer가 없는 경우 생성
    if (!repliesContainer) {
        repliesContainer = document.createElement("div");
        repliesContainer.className = "replies";
        commentElement.appendChild(repliesContainer); // 댓글에 추가
    }   

    // 기존 입력칸이 있는 경우 삭제
    const existingInput = commentElement.querySelector(".reply-input-container");
    if (existingInput) {
        existingInput.remove();
        return; // 입력칸을 삭제하고 종료
    }

    // 입력칸 생성
    const inputWrap = document.createElement("div");
    inputWrap.className = "reply-input-container";
    inputWrap.style.display = "flex";
    inputWrap.style.gap = "6px";
    inputWrap.style.marginTop = "6px";

    const input = document.createElement("textarea");
    input.placeholder = "대댓글 작성...";
    input.style.flex = "1";

    const button = document.createElement("button");
    button.textContent = "등록";
    button.onclick = function () {
        submitReply({ key: "Enter" }, input);
    };

    input.onkeydown = function (e) {
        submitReply(e, input);
    };

    inputWrap.appendChild(input);
    inputWrap.appendChild(button);

    // 입력칸을 댓글 아래, 대댓글 위쪽에 추가
    commentElement.insertBefore(inputWrap, repliesContainer);
}


async function toggleLike(btn) {
    let parent, targetType;

    if (btn.closest(".reply")) {
        parent = btn.closest(".reply");
        targetType = "reply";
    } else if (btn.closest(".comment")) {
        parent = btn.closest(".comment");
        targetType = "comment";
    } else if (btn.closest(".post")) {
        parent = btn.closest(".post");
        targetType = "post";
    } else {
        console.error("❌ 좋아요 대상 요소를 찾을 수 없습니다!");
        return;
    }

    const likeCountSpan = parent.querySelector(".like-count");
    if (!likeCountSpan) {
        console.error("❌ 좋아요 수 요소를 찾을 수 없습니다!");
        return;
    }

    let count = parseInt(likeCountSpan.textContent.replace("좋아요 수: ", "")) || 0;
    const isLiked = btn.classList.toggle("liked");
    count += isLiked ? 1 : -1;
    likeCountSpan.textContent = `좋아요 수: ${count}`;

    const targetId = parent.dataset.id;

    try {
        await fetch("${BASE_URL}/likes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetType, targetId, liked: isLiked }),
            credentials: "include"
        });
    } catch (err) {
        console.warn("❌ 좋아요 상태 서버 전송 실패:", err);
    }
}

async function deletePost(postId) {
    if (!confirm("이 게시글을 삭제하시겠습니까?")) return;

    try {
        const res = await fetch(`${BASE_URL}/board/post/${postId}`, {
            method: "DELETE",
            credentials: "include"
        });

        const data = await res.json(); 
        if (!res.ok) throw new Error(data.message || "삭제 실패");

        alert("삭제 완료!");
        await loadPostsFromServer(); // 목록 새로고침
    } catch (err) {
        console.error("❌ 삭제 실패:", err);
        alert("게시글 삭제 중 오류 발생");
    }
}

function togglePostMenu(btn) {
    const menu = btn.nextElementSibling;
    menu.style.display = menu.style.display === "none" ? "block" : "none";
}

function toggleCommentMenu(btn) {
    const menu = btn.nextElementSibling;
    menu.style.display = menu.style.display === "none" ? "block" : "none";
}

async function deleteComment(commentId) {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;

    try {
        const res = await fetch(`${BASE_URL}/comments/${commentId}`, {
            method: "DELETE",
            credentials: "include"
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "삭제 실패");

        const postId = posts[currentPostIndex].id;
        const updatedComments = await loadCommentsForPost(postId);
        posts[currentPostIndex].comments = nestComments(updatedComments);
        renderComments(posts[currentPostIndex].comments);
    } catch (err) {
        console.error("❌ 댓글 삭제 실패:", err);
        alert("댓글 삭제 중 오류 발생");
    }
}

async function toggleLikeImage(img) {
    const isLiked = img.dataset.liked === "true";
    const type = img.dataset.type;
    const targetId = img.dataset.id;

    try {
        const res = await fetch("${BASE_URL}/likes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                targetType: type,
                targetId: targetId,
                liked: !isLiked
            }),
            credentials: "include"
        });

        const data = await res.json();
        const newLikes = data.likes ?? 0;

        img.src = !isLiked ? "/png/love_2.png" : "/png/love_1.png";
        img.dataset.liked = (!isLiked).toString();

        // ✅ 좋아요 수 UI 즉시 갱신
        const likeCountSpan = img.parentElement.querySelector(".like-count");
        if (likeCountSpan) {
            likeCountSpan.textContent = `좋아요 수: ${newLikes}`;
        }

        if (type === "comment" || type === "reply") {
            const postId = posts[currentPostIndex].id;
            const updatedComments = await loadCommentsForPost(postId);
            posts[currentPostIndex].comments = nestComments(updatedComments);

            renderComments(posts[currentPostIndex].comments);
        }

        if (type === "post") {
            const postId = img.dataset.id;
            const index = posts.findIndex(p => p.id == postId);

            if (index !== -1) {
                posts[index].isLiked = !isLiked;
                posts[index].likes = newLikes;

                const detailMode = document.querySelector("#backToListBtn");
                if (!detailMode) {
                    renderPostList(); // ❗ 좋아요 수 즉시 반영
                } else {
                    const likeCountSpan = document.querySelector(".like-count");
                    if (likeCountSpan) {
                        likeCountSpan.textContent = `좋아요 수: ${newLikes}`;
                    }
                }
            }
        }

    } catch (err) {
        console.warn("❌ 좋아요 전송 실패:", err);
    }
}

async function toggleBookmarkImage(img) {
    const isBookmarked = img.dataset.bookmarked === "true";
    const postId = img.dataset.id;

    img.src = isBookmarked ? "/png/bookmark_1.png" : "/png/bookmark_2.png";
    img.dataset.bookmarked = (!isBookmarked).toString();

    try {
        // 북마크 전송 → likes 테이블 기준으로
        await fetch("/board/bookmark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                targetType: "post",
                targetId: postId,
                bookmarked: !isBookmarked
            }),
        });

        const detailMode = document.querySelector("#backToListBtn");
        if (!detailMode) {
            await loadPostsFromServer(); // 목록이면 갱신
        } else {
            const updated = posts.find(p => p.id == postId);
            if (updated) updated.isBookmarked = !isBookmarked;
        }
    } catch (err) {
        console.warn("❌ 북마크 전송 실패:", err);
    }
}

function toggleCommentsImage(img) {
    const isShown = img.dataset.shown === "true";
    const postDiv = img.closest(".post");
    const commentsSection = postDiv.querySelector(".comments-section");

    // 이미지 변경
    img.src = isShown ? "/png/message_1.png" : "/png/message_2.png";
    img.dataset.shown = (!isShown).toString();

    // 댓글 영역 표시 토글
    commentsSection.style.display = isShown ? "none" : "block";
}

// 초기 게시글 목록 렌더링
renderPostList();
