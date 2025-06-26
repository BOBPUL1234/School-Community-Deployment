//main.js
const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://your-backend-service.onrender.com";

fetch("${BASE_URL}/auth/profile")
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      userId = data.id || data.name; // ✅ 교사도 대응
      sessionStorage.setItem("user_id", userId);
      loadTasks();
    } else {
      alert("로그인이 필요합니다.");
      location.href = "/";
    }
  });

function formatDateWithDay(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const week = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${month}/${day} (${week})`;
}

document.addEventListener('DOMContentLoaded', () => {
  const correctPassword = '1234';

  const uploadBtn = document.getElementById('uploadBtn');
  const passwordModal = document.getElementById('passwordModal');
  const modalPasswordInput = document.getElementById('modalPasswordInput');
  const modalPasswordCheckBtn = document.getElementById('modalPasswordCheckBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const modalMessage = document.getElementById('modalMessage');
  const fileInput = document.getElementById('fileInput');
  const togglePassword = document.getElementById('togglePassword');
  const eyeIcon = document.getElementById('eyeIcon');

  let showPassword = false;

  // 페이지 로드 시 로컬스토리지에 저장된 급식 데이터가 있으면 화면에 표시
fetch('${BASE_URL}/home/meals')
  .then(res => res.json())
  .then(meals => renderMeals(meals))
  .catch(err => console.error("❌ 급식표 조회 실패:", err));


  uploadBtn.addEventListener('click', () => {
    modalPasswordInput.value = '';
    modalMessage.textContent = '';
    modalMessage.className = '';
    passwordModal.style.display = 'flex';
    modalPasswordInput.type = 'password';
    togglePassword.innerHTML = '<img id="eyeIcon" src="png/eyeopen.png" alt="비밀번호 보기"/>';
    modalPasswordInput.focus();
  });

  modalCancelBtn.addEventListener('click', () => {
    passwordModal.style.display = 'none';
  });

  modalPasswordCheckBtn.addEventListener('click', () => {
    if (modalPasswordInput.value === correctPassword) {
      modalMessage.textContent = '비밀번호가 맞았습니다!';
      modalMessage.className = 'success';
      passwordModal.style.display = 'none';
      fileInput.click();
    } else {
      modalMessage.textContent = '비밀번호가 틀렸습니다. 다시 시도하세요.';
      modalMessage.className = 'error';
    }
  });

  togglePassword.addEventListener('click', () => {
    showPassword = !showPassword;
    modalPasswordInput.type = showPassword ? 'text' : 'password';
    const newSrc = showPassword ? 'png/eyehide.png' : 'png/eyeopen.png';
    document.getElementById('eyeIcon').src = newSrc;
  });

  fileInput.addEventListener('change', handleFile, false);

  function handleFile(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const meals = {};

      for (let row of json) {
        const [year, month, day, type, ...menu] = row;

        const y = Number(year);
        const m = Number(month);
        const d = Number(day);
        const t = (typeof type === 'string') ? type.trim() : '';

        if (!y || !m || !d || t === '') continue;

        const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!meals[dateKey]) meals[dateKey] = { 중식: null, 석식: null };
        meals[dateKey][t] = menu.length ? menu : ["없음"];
      }

      fetch('${BASE_URL}/home/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meals),
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          alert("✅ 급식표가 성공적으로 업로드되었습니다.");
          renderMeals(meals);  // 그대로 화면 출력
        }
      })
      .catch(err => {
        console.error("❌ 급식표 업로드 실패:", err);
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // 급식 데이터를 받아서 화면에 표시하는 함수
  function renderMeals(meals) {
    const todayStr = new Date().toISOString().split('T')[0];
    const sortedDates = Object.keys(meals).sort((a, b) => new Date(a) - new Date(b));

    let firstIndex = sortedDates.findIndex(date => date >= todayStr);
    const reordered = firstIndex >= 0
      ? [...sortedDates.slice(firstIndex), ...sortedDates.slice(0, firstIndex)]
      : sortedDates;

    const container = document.getElementById('container');
    container.innerHTML = '';

    reordered.forEach(date => {
      const mealData = meals[date];
      const card = document.createElement('div');
      card.className = 'card';

      const dateDiv = document.createElement('div');
      dateDiv.className = 'date';
      dateDiv.textContent = formatDateWithDay(date);
      card.appendChild(dateDiv);

      ['중식', '석식'].forEach(type => {
        const mealDiv = document.createElement('div');
        mealDiv.className = 'meal';

        const title = document.createElement('div');
        title.className = 'meal-title';
        title.textContent = type;
        mealDiv.appendChild(title);

        const list = document.createElement('ul');
        (mealData[type] || ["없음"]).forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          list.appendChild(li);
        });

        mealDiv.appendChild(list);
        card.appendChild(mealDiv);
      });

      container.appendChild(card);
    });
  }
});

//플래너
let selectedDate = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('calendar');
  dateInput.value = selectedDate;
  dateInput.addEventListener('change', e => {
    selectedDate = e.target.value;
    loadTasks();
  });

  loadTasks();
});

function loadTasks() {
  const user_id = sessionStorage.getItem('user_id'); // 또는 고정 문자열
  if (!user_id) return;

  fetch(`${BASE_URL}/home/planner/${selectedDate}`)
    .then(res => res.json())
    .then(saved => {
      if (!Array.isArray(saved)) {
        console.error("서버 응답이 배열이 아님:", saved);
        return;
      }

      const taskList = document.getElementById('task-list');
      const title = document.getElementById('date-title');
      title.textContent = `📅 ${selectedDate}의 할 일`;

      taskList.innerHTML = '';
      saved.forEach(taskObj => {
        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = taskObj.done;

        const span = document.createElement('span');
        span.textContent = taskObj.text;
        if (taskObj.done) {
          span.style.textDecoration = 'line-through';
          span.style.color = '#888';
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.style.marginLeft = '10px';
        deleteBtn.onclick = () => deleteTask(taskObj.id);

        checkbox.onchange = () => toggleDone(taskObj.id, checkbox.checked);

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteBtn);
        taskList.appendChild(li);
      });
    })
    .catch(err => {
      console.error("❌ 플래너 불러오기 실패:", err);
    });
}

function addTask() {
  const input = document.getElementById('new-task');
  const task = input.value.trim();
  const user_id = sessionStorage.getItem('user_id');
  if (task === '') return;

  fetch('${BASE_URL}/home/planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: selectedDate,
      text: task
    })
  })
  .then(() => {
    input.value = '';
    loadTasks();
  });
}

function deleteTask(id) {
  fetch(`${BASE_URL}/home/planner/${id}`, { method: 'DELETE' })
    .then(() => loadTasks());
}

function toggleDone(id, checked) {
  fetch(`${BASE_URL}/home/planner/done/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: checked })
  }).then(() => loadTasks());
}
