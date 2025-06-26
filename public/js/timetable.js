const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://school-community-deployment-1.onrender.com";

let selectedSubject = null;
let selectedClass = null;

const isMobile = /Mobi|Android/i.test(navigator.userAgent);

const subjectsByGrade = {
  1: ['국어', '수학', '영어', '과학', '사회', '한국사', '과탐실', '체육', '음악', '미술', '기가', '정보'],
  2: ['문학', '독서', '수1', '수2', '영1', '영2', '한국사', '체육', '음악', '인공~기초', '확통', '영어 회화', '한지', '세계사', '경제', '정법', '생윤', '물1', '화1', '생1', '지1'],
  3: ['한국사', '체육', '화작', '미적', '영독작', '언매', '심화 국어', '고전 읽기', '기하', '경제 수학', '수학~탐구', '인공~수학', '진로 영어', '영미~읽기', '심화 영어1', '동사', '사문', '세계지리', '윤사', '고전과 윤리', '사문탐', '여행지리', '물2', '고급물리학', '물리학 실험', '화2', '화학 실험', '생2', '생과실', '지2', '고급지구', '융합 과학', '생과', '지식~일반', '공학 일반', '프로그래밍', '스포츠', '음악', '미술', '심리', '교육', '보건', '환경', '실용 경제']
};

const classList = ['1-1','1-2','1-3','1-4','1-5','1-6','1-7','1-9','2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-9','3-1','3-2','3-3','3-4','3-5','3-6','3-7','3-9','미술실','음악실','체육관','AI실','이동수업실','중강의실','메이커실','창의융합실'];

function renderGradeButtons() {
  const gradeArea = document.getElementById('grade-buttons');
  gradeArea.innerHTML = '';

  ['1학년', '2학년', '3학년', '교사'].forEach(label => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'subject-button';
    btn.onclick = () => {
      if (label === '교사') showAllSubjects();
      else selectGrade(parseInt(label[0]));
    };
    gradeArea.appendChild(btn);
  });
}

function showAllSubjects() {
  const subjectListDiv = document.getElementById('subject-list');
  subjectListDiv.innerHTML = '';
  // const backBtn = document.createElement('button');
  // backBtn.textContent = '← 학년 선택으로 돌아가기';
  // backBtn.className = 'subject-button';
  // backBtn.onclick = renderGradeButtons;
  // subjectListDiv.appendChild(backBtn);


  for (let grade = 1; grade <= 3; grade++) {
    const title = document.createElement('p');
    title.textContent = grade + '학년 과목:';
    subjectListDiv.appendChild(title);

    const subjectRow = document.createElement('div');
    subjectRow.className = 'scroll-row';

    subjectsByGrade[grade].forEach(subject => {
      const btn = createSubjectButton(subject, false);
      subjectRow.appendChild(btn);
    });

    subjectListDiv.appendChild(subjectRow);
  }

  const classTitle = document.createElement('p');
  classTitle.textContent = '반 목록:';
  subjectListDiv.appendChild(classTitle);

  const classRow = document.createElement('div');
  classRow.className = 'scroll-row';

  classList.forEach(cls => {
    const btn = createSubjectButton(cls, true);
    classRow.appendChild(btn);
  });

  subjectListDiv.appendChild(classRow);
}

function selectGrade(grade) {
  const subjectListDiv = document.getElementById('subject-list');
  subjectListDiv.innerHTML = '';

  // const backBtn = document.createElement('button');
  // backBtn.textContent = '← 학년 선택으로 돌아가기';
  // backBtn.className = 'subject-button';
  // backBtn.onclick = renderGradeButtons;
  // subjectListDiv.appendChild(backBtn);

  const subjectTitle = document.createElement('p');
  subjectTitle.textContent = grade + '학년 과목:';
  subjectListDiv.appendChild(subjectTitle);

  // 과목 버튼 줄
  const subjectRow = document.createElement('div');
  subjectRow.className = 'scroll-row';

  subjectsByGrade[grade].forEach(subject => {
    const btn = createSubjectButton(subject, false);
    subjectRow.appendChild(btn);
  });
  subjectListDiv.appendChild(subjectRow);

  // 반 목록 제목
  const classTitle = document.createElement('p');
  classTitle.textContent = '반 목록:';
  subjectListDiv.appendChild(classTitle);

  // 반 버튼 줄
  const classRow = document.createElement('div');
  classRow.className = 'scroll-row';

  classList.forEach(cls => {
    const btn = createSubjectButton(cls, true);
    classRow.appendChild(btn);
  });
  subjectListDiv.appendChild(classRow);
}

function createSubjectButton(text, isClass) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.className = 'subject-button';
  btn.classList.toggle('selected', text === selectedSubject || text === selectedClass);

  btn.addEventListener('click', () => {
    if (isClass) {
      selectedClass = selectedClass === text ? null : text;
    } else {
      selectedSubject = selectedSubject === text ? null : text;
    }
    updateSelectedStyles();
  });

    btn.setAttribute('draggable', true);
  btn.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', text);
  });

  return btn;
}

function updateSelectedStyles() {
  document.querySelectorAll('.subject-button').forEach(btn => {
    const text = btn.textContent;
    btn.classList.toggle('selected', text === selectedSubject || text === selectedClass);
  });
}

// function updateCell(cell) {
//   const html = selectedSubject && selectedClass
//     ? `<b>${selectedSubject}</b><br>${selectedClass}`
//     : selectedSubject
//     ? `<b>${selectedSubject}</b>`
//     : selectedClass;

//   const newText = selectedSubject && selectedClass
//     ? `${selectedSubject}\\n${selectedClass}`
//     : selectedSubject || selectedClass;

//   cell.innerHTML = html;
//   cell.dataset.subject = selectedSubject || '';
//   cell.dataset.class = selectedClass || '';

//   const cellKey = cell.dataset.cell;
//   const userId = localStorage.getItem('userId');

//   fetch('${BASE_URL}/time/save', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       user_id: userId,
//       cell_key: cellKey,
//       subject: newText
//     })
//   });

//   // 상태 초기화
//   selectedSubject = null;
//   selectedClass = null;
//   updateSelectedStyles();
// }

function updateCell(cell) {
  // 기존 값 유지
  const currentSubject = cell.dataset.subject || '';
  const currentClass = cell.dataset.class || '';

  const nextSubject = selectedSubject ?? currentSubject;
  const nextClass = selectedClass ?? currentClass;

  const html = nextSubject && nextClass
    ? `<b>${nextSubject}</b><br>${nextClass}`
    : nextSubject
    ? `<b>${nextSubject}</b>`
    : nextClass;

  const newText = nextSubject && nextClass
    ? `${nextSubject}\\n${nextClass}`
    : nextSubject || nextClass;

  cell.innerHTML = html;
  cell.dataset.subject = nextSubject;
  cell.dataset.class = nextClass;

  const cellKey = cell.dataset.cell;
  const userId = localStorage.getItem('userId');

  fetch('${BASE_URL}/time/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, cell_key: cellKey, subject: newText })
  });

  selectedSubject = null;
  selectedClass = null;
  updateSelectedStyles();
}

function setupTableCells() {
  document.querySelectorAll('#timetable td[data-cell]').forEach(cell => {
    if (!isMobile) {
      cell.addEventListener('dragover', e => e.preventDefault());
      cell.addEventListener('drop', e => {
        e.preventDefault();
        const text = e.dataTransfer.getData('text/plain');
        const isClass = text.includes('-');

        if (isClass) selectedClass = text;
        else selectedSubject = text;

        updateCell(cell);
      });
    }

    cell.addEventListener('click', () => {
      if (selectedSubject || selectedClass) {
        updateCell(cell);
      } else {
        // 아무것도 선택 안 한 상태에서 클릭 → 삭제
        cell.innerHTML = '';
        cell.dataset.subject = '';
        cell.dataset.class = '';

        const cellKey = cell.dataset.cell;
        const userId = localStorage.getItem('userId');

        fetch('${BASE_URL}/time/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, cell_key: cellKey, subject: '' })
        });
      }
    });
  });
}

async function loadSavedTimetable() {
  const userId = localStorage.getItem('userId');
  if (!userId) return;

  try {
    const res = await fetch(`${BASE_URL}/time/${userId}`);
    const timetable = await res.json();

    document.querySelectorAll('#timetable td[data-cell]').forEach(cell => {
      const key = cell.dataset.cell;
      if (timetable[key]) {
        const [subject, cls] = timetable[key].split('\\n');
        const html = subject ? `<b>${subject}</b>${cls ? '<br>' + cls : ''}` : cls;
        cell.innerHTML = html;
        cell.dataset.subject = subject || '';
        cell.dataset.class = cls || '';
      }
    });
  } catch (err) {
    console.error('❌ 시간표 불러오기 실패:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSavedTimetable();
  setupTableCells();
  renderGradeButtons();
});
