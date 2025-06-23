document.addEventListener("DOMContentLoaded", () => {
  const tabs = {
    list: document.getElementById("list"),
    join: document.getElementById("join"),
    create: document.getElementById("create"),
  };

  const buttons = {
    list: document.getElementById("tab-list"),
    join: document.getElementById("tab-join"),
    create: document.getElementById("tab-create"),
  };

  const categories = ["공부", "동아리", "게임", "운동", "애니", "취업", "잡담"];
  
  let joinedRooms = JSON.parse(localStorage.getItem("joinedRooms")) || [];
  let allRooms = JSON.parse(localStorage.getItem("allRooms")) || [...joinedRooms];

  // 만약 allRooms가 비어있으면 초기화 후 저장
  if (!localStorage.getItem("allRooms")) {
    localStorage.setItem("allRooms", JSON.stringify(allRooms));
  }

  let selectedRoomToJoin = null;
  let selectedJoinCategories = new Set();

  function saveRooms() {
    localStorage.setItem("joinedRooms", JSON.stringify(joinedRooms));
    localStorage.setItem("allRooms", JSON.stringify(allRooms));
  }

  function showTab(tab) {
    Object.values(tabs).forEach(t => t.classList.remove("active"));
    Object.values(buttons).forEach(b => b.classList.remove("active"));
    tabs[tab].classList.add("active");
    buttons[tab].classList.add("active");

    if (tab === "list") renderRoomList();
    if (tab === "join") {
      renderJoinCategories();
      filterRooms();
    }
    if (tab === "create") {
      renderCreateCategories();
    }
  }

  function renderRoomList() {
    const list = document.getElementById("roomList");
    list.innerHTML = "";

    joinedRooms.forEach(room => {
      const div = document.createElement("div");
      div.className = "room";
      div.style.cursor = "pointer";

      const lockSpan = room.password ? `<span class="lock-icon">🔒</span> ` : "";
      const categoriesSpan = room.categories.length ? ` <span class="room-categories">[${room.categories.join(", ")}]</span>` : "";
      div.innerHTML = `${lockSpan}<span class="room-title">${room.title}</span>${categoriesSpan}`;

      // 클릭 시 chatroom.html로 이동 (roomId 쿼리 포함)
      div.addEventListener("click", () => {
        window.location.href = `chatroom.html?roomId=${room.id}`;
      });

      list.appendChild(div);
    });
  }

  function renderJoinCategories() {
    const container = document.getElementById("joinCategoryFilters");
    container.innerHTML = "";

    categories.forEach(cat => {
      const span = document.createElement("span");
      span.className = "category-filter";
      span.textContent = cat;
      span.onclick = () => {
        if (selectedJoinCategories.has(cat)) {
          selectedJoinCategories.delete(cat);
          span.classList.remove("active");
        } else {
          selectedJoinCategories.add(cat);
          span.classList.add("active");
        }
        filterRooms();
      };
      container.appendChild(span);
    });
  }

  function filterRooms() {
    const container = document.getElementById("filteredRoomList");
    const keyword = document.getElementById("joinSearchInput").value.toLowerCase();
    container.innerHTML = "";

    const filtered = allRooms.filter(room => {
      const matchCat = [...selectedJoinCategories].length === 0 ||
        room.categories.some(cat => selectedJoinCategories.has(cat));
      return matchCat && room.title.toLowerCase().includes(keyword);
    });

filtered.forEach(room => {
  const div = document.createElement("div");
  div.className = "room";
  div.innerHTML = `${room.password ? '<span class="lock-icon">🔒</span> ' : ''}<span class="room-title">${room.title}</span> <span class="room-categories">[${room.categories.join(", ")}]</span>`;
  
  div.onclick = () => {
    document.querySelectorAll(".filtered-room-list .room").forEach(r => r.style.background = "#f9f9f9");
    div.style.background = "#ffd670";
    selectedRoomToJoin = room;

    // 비밀번호 입력창 보임/숨김 처리
    const passwordInput = document.getElementById("joinPassword");
    if(room.password) {
      passwordInput.style.display = "block";
    } else {
      passwordInput.style.display = "none";
      passwordInput.value = ""; // 비밀번호 입력란 초기화
    }
  };
  container.appendChild(div);
});
  }

  function renderCreateCategories() {
    const container = document.getElementById("createCategoryList");
    container.innerHTML = "";

    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "category-filter";
      btn.textContent = cat;
      btn.onclick = () => {
        btn.classList.toggle("active");
      };
      container.appendChild(btn);
    });
  }

  // 가입하기 버튼 클릭
  document.getElementById("joinBtn").addEventListener("click", () => {
    if (!selectedRoomToJoin) {
      alert("가입할 채팅방을 선택하세요.");
      return;
    }

    // 이미 가입한 방인지 확인
    if (joinedRooms.some(room => room.id === selectedRoomToJoin.id)) {
      alert("이미 가입된 채팅방입니다.");
      return;
    }

    const inputPassword = document.getElementById("joinPassword").value;
    if (selectedRoomToJoin.password && selectedRoomToJoin.password !== inputPassword) {
      alert("비밀번호가 틀렸습니다.");
      return;
    }

    const userId = localStorage.getItem("userId");
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || '{}');
    const userName = userProfile.userName || "이름 없음";

    fetch("http://localhost:3000/chat/participants/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: selectedRoomToJoin.id,
        userId,
        userName
      })
    });

    joinedRooms.push(selectedRoomToJoin);
    saveRooms();
    alert("가입되었습니다.");

    fetch(`http://localhost:3000/chat/participants/rooms?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          joinedRooms = data.rooms;
          allRooms = [...joinedRooms];
          renderRoomList(); // 참여한 방만 렌더링
        } else {
          alert("채팅방 목록 로딩 실패");
        }
      });

    showTab("list");
  });

  // 생성하기 버튼 클릭
document.getElementById("createBtn").addEventListener("click", () => {
  const title = document.getElementById("createRoomTitle").value.trim();
  const password = document.getElementById("createPassword").value;
  const allowDefaultProfile = document.getElementById("allowDefaultProfile").checked;
  const selected = Array.from(document.querySelectorAll("#createCategoryList .category-filter.active")).map(b => b.textContent);

  if (!title || selected.length === 0) {
    alert("채팅방 제목과 카테고리를 선택하세요.");
    return;
  }

  const newRoom = {
    id: Date.now().toString(),
    title,
    categories: selected,
    password: password || null,
    allowDefaultProfile
  };

  // ✅ DB에 저장이 완료된 뒤 joinedRooms에 추가
  fetch("http://localhost:3000/chat/rooms/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newRoom)
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      alert("채팅방 생성 실패: " + data.message);
      return;
    }

    // DB 등록 성공 후 로컬에도 저장
    allRooms.push(newRoom);
    joinedRooms.push(newRoom);
    saveRooms();

    alert("채팅방이 생성되고 가입되었습니다.");
    window.location.href = `chatroom.html?roomId=${newRoom.id}`;
  });
});

  
  document.querySelectorAll('.bottom-nav button').forEach(button => {
  const text = button.textContent.trim();

  if (text.includes('채팅')) {
    button.addEventListener('click', () => location.href = 'chat.html');
  } else if (text.includes('프로필')) {
    button.addEventListener('click', () => location.href = 'profile.html');
  }
});

  // 탭 버튼 이벤트 연결
  buttons.list.addEventListener("click", () => showTab("list"));
  buttons.join.addEventListener("click", () => showTab("join"));
  buttons.create.addEventListener("click", () => showTab("create"));

  // 초기 렌더링
  showTab("list");
});
