document.addEventListener("DOMContentLoaded", () => {
  const subjectsContainer = document.getElementById("subjects");
  const addBtn = document.getElementById("add-subject-btn");
  const calcBtn = document.getElementById("calc-btn");
  const resultBox = document.getElementById("resultBox");

  // 숫자만 입력 가능하도록 제한 함수 (키 입력 + 붙여넣기)
  const restrictToNumbers = (input) => {
    input.addEventListener("keydown", (e) => {
      const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"];
      if (
        allowedKeys.includes(e.key) ||
        /^[0-9]$/.test(e.key)
      ) {
        return;
      }
      e.preventDefault();
    });

    input.addEventListener("paste", (e) => {
      const pasteData = (e.clipboardData || window.clipboardData).getData("text");
      if (!/^\d*$/.test(pasteData)) {
        e.preventDefault();
      }
    });
  };

  // 새 과목 행 만들기
  const createSubjectRow = () => {
    const row = document.createElement("div");
    row.className = "subject-row";
    row.innerHTML = `
      <input type="text" placeholder="과목명" class="subject-name" />
      <input type="number" inputmode="numeric" placeholder="단위수" class="subject-credit" min="1" />
      <input type="number" inputmode="numeric" placeholder="등급 (1~9)" class="subject-grade" min="1" max="9" />
      <button class="remove-subject-btn">❌</button>
    `;

    restrictToNumbers(row.querySelector(".subject-credit"));
    restrictToNumbers(row.querySelector(".subject-grade"));

    return row;
  };

  // 초기 행 숫자 입력 제한 적용
  document.querySelectorAll(".subject-row").forEach(row => {
    restrictToNumbers(row.querySelector(".subject-credit"));
    restrictToNumbers(row.querySelector(".subject-grade"));
  });

  // 과목 추가 버튼
  addBtn.addEventListener("click", () => {
    const newRow = createSubjectRow();
    subjectsContainer.appendChild(newRow);
  });

  // 과목 삭제 버튼 (최소 1개 유지)
  subjectsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-subject-btn")) {
      const rows = document.querySelectorAll(".subject-row");
      if (rows.length > 1) {
        e.target.closest(".subject-row").remove();
      } else {
        alert("최소 한 과목은 남겨야 합니다.");
      }
    }
  });

  // 성적 산출 버튼
  calcBtn.addEventListener("click", () => {
    const rows = document.querySelectorAll(".subject-row");
    let totalCredits = 0;
    let weightedSum = 0;

    for (const row of rows) {
      const credit = parseInt(row.querySelector(".subject-credit").value);
      const grade = parseInt(row.querySelector(".subject-grade").value);

      if (isNaN(credit) || isNaN(grade)) {
        alert("모든 과목의 단위수와 등급을 숫자로 입력해주세요.");
        return;
      }
      if (credit < 1) {
        alert("단위수는 1 이상이어야 합니다.");
        return;
      }
      if (grade < 1 || grade > 9) {
        alert("등급은 1~9 사이여야 합니다.");
        return;
      }

      totalCredits += credit;
      weightedSum += credit * grade;
    }

    const avgGrade = weightedSum / totalCredits;

    document.getElementById("total-credit").textContent = totalCredits;
    document.getElementById("weighted-grade").textContent = avgGrade.toFixed(2);
    resultBox.style.display = "block";
  });
});
