const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://school-community-deployment-1.onrender.com";

let roomId = null;

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  roomId = params.get("roomId");
  
  let joinedRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
  let allRooms = JSON.parse(localStorage.getItem("allRooms") || "[]");

  // 현재 채팅방 찾기
  let currentRoom = joinedRooms.find(r => r.id === roomId) || allRooms.find(r => r.id === roomId);

  if (!currentRoom) {
    alert("존재하지 않는 채팅방입니다.");
    window.location.href = "chat.html";
    return;
  }

  // 제목 표시
  document.getElementById("roomTitle").textContent = currentRoom.title;

  // 뒤로가기 버튼 이벤트
  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "chat.html";
  });

  const menu = document.getElementById("menu");
  const leaveRoomBtn = document.getElementById("leaveRoomBtn");
  const closeMenuBtn = document.getElementById("closeMenuBtn");
  const menuBtn = document.getElementById("menuBtn");

  // 메뉴 열고 닫기
  menuBtn.addEventListener("click", () => {
    menu.classList.toggle("hidden");
  });

  closeMenuBtn.addEventListener("click", () => {
    menu.classList.add("hidden");
  });


  // 채팅방 나가기 버튼 클릭 이벤트
  leaveRoomBtn.addEventListener("click", () => {
    if (!confirm(`"${currentRoom.title}" 채팅방에서 나가시겠습니까?`)) return;

    // joinedRooms에서 제거
    joinedRooms = joinedRooms.filter(r => r.id !== roomId);
    localStorage.setItem("joinedRooms", JSON.stringify(joinedRooms));

    // 참여자가 아무도 없으면 allRooms에서 삭제 및 메시지도 삭제
    const otherJoined = joinedRooms.find(r => r.id === roomId);
    if (!otherJoined) {
      allRooms = allRooms.filter(r => r.id !== roomId);
      localStorage.setItem("allRooms", JSON.stringify(allRooms));
      localStorage.removeItem(`messages_${roomId}`);
    }

    alert("채팅방에서 나갔습니다.");
    window.location.href = "chat.html";
  });

  // 채팅 메시지 관련 요소들
  const messagesElem = document.getElementById("messages");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  function loadMessages() {
    const data = localStorage.getItem(`messages_${roomId}`);
    return data ? JSON.parse(data) : [];
  }

  function saveMessages(msgs) {
    localStorage.setItem(`messages_${roomId}`, JSON.stringify(msgs));
  }

function renderMessages() {
  messagesElem.innerHTML = "";

  const userProfile = JSON.parse(localStorage.getItem("userProfile") || '{}');
  const userName = userProfile.userName || "이름 없음";

  fetch(`${BASE_URL}/chat/messages?roomId=${roomId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) return;

      data.messages.forEach(msg => {
        const isMine = msg.sender === userName;

        const wrapper = document.createElement("div");
        wrapper.className = "message-wrapper";
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = isMine ? "flex-end" : "flex-start";

        const bubble = document.createElement("div");
        bubble.className = isMine ? "my-message" : "other-message";
        bubble.style.backgroundColor = isMine ? "#dcf8c6" : "#e6e6e6";
        bubble.style.padding = "10px";
        bubble.style.borderRadius = "10px";
        bubble.style.maxWidth = "70%";

        if (!isMine) {
          // 👉 상대방 이름만 출력
          const nameDiv = document.createElement("div");
          nameDiv.textContent = msg.sender;
          nameDiv.style.fontWeight = "bold";
          nameDiv.style.marginBottom = "4px";
          bubble.appendChild(nameDiv);
        }

        const contentDiv = document.createElement("div");
        contentDiv.textContent = msg.content;
        bubble.appendChild(contentDiv);

        wrapper.appendChild(bubble);
        messagesElem.appendChild(wrapper);
      });

      messagesElem.scrollTop = messagesElem.scrollHeight;
    });
}

sendBtn.addEventListener("click", () => {
  const text = messageInput.value.trim();
  if (!text) return;

  const userProfile = JSON.parse(localStorage.getItem("userProfile") || '{}');
  const userName = userProfile.userName || "이름 없음";

  fetch("${BASE_URL}/chat/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId, // 전역 roomId에서 가져옴
      sender: userName,
      content: text
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      messageInput.value = "";
      renderMessages(); // 메시지 다시 불러오기
    } else {
      alert("❌ 메시지 저장 실패");
    }
  })
  .catch(err => {
    console.error("❌ fetch 오류:", err);
    alert("❌ 서버 연결 실패");
  });
});

  messageInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      sendBtn.click();
    }
  });

  // 메시지 렌더링 초기화
  renderMessages();

  // userProfile 기본값 세팅 (없으면)
  if (!localStorage.getItem("userProfile")) {
    localStorage.setItem("userProfile", JSON.stringify({ userName: "홍길동" }));
  }

  const participantsModal = document.getElementById("participantsModal");
  const participantsList = document.getElementById("participantsList");
  const closeParticipantsModalBtn = document.getElementById("closeParticipantsModalBtn");
  const showParticipantsBtn = document.getElementById("showParticipantsBtn");
  const MenuBtn = document.getElementById("menuBtn");

  showParticipantsBtn.addEventListener("click", () => {
    menu.classList.add("hidden");

    // userProfile에서 이름 불러오기
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || '{}');
    const userName = userProfile.userName || "이름 없음";

    // 참여자 목록 초기화 및 추가 (여기서는 나만 예시)
    participantsList.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = `${userName} (나)`;
    participantsList.appendChild(li);

    // 모달 보이기
    participantsModal.classList.remove("hidden");
  });

  closeParticipantsModalBtn.addEventListener("click", () => {
    participantsModal.classList.add("hidden");
  });
});
// 이름 변경 관련 요소
const changeNameBtn = document.getElementById("changeNameBtn");
const changeNameModal = document.getElementById("changeNameModal");
const newUserNameInput = document.getElementById("newUserNameInput");
const saveUserNameBtn = document.getElementById("saveUserNameBtn");
const closeChangeNameModalBtn = document.getElementById("closeChangeNameModalBtn");

// "저장" 버튼 클릭 → 이름 저장 및 모달 닫기
saveUserNameBtn.addEventListener("click", () => {
  const newName = newUserNameInput.value.trim();
  if (!newName) {
    alert("이름을 입력하세요.");
    return;
  }

  localStorage.setItem("userProfile", JSON.stringify({ userName: newName }));
  alert("이름이 변경되었습니다.");
  changeNameModal.classList.add("hidden");
  location.reload()

  // 메시지 다시 렌더링 (기존 메시지에는 적용 안 됨, 새 메시지부터 적용됨)
  renderMessages();
});

// "취소" 버튼 → 모달 닫기
closeChangeNameModalBtn.addEventListener("click", () => {
  changeNameModal.classList.add("hidden");
});

