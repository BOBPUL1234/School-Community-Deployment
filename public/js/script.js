// 현재 페이지 이름 가져오기
const currentPage = window.location.pathname.split("/").pop();

// 버튼 이미지와 매핑
const navItems = [
    { page: "main.html", selector: ".btn7-icon", active: "/png/home_2.png", inactive: "/png/home_1.png" },
    { page: "timetable.html", selector: ".btn8-icon", active: "/png/table_2.png", inactive: "/png/table_1.png" },
    { page: "chat.html", selector: ".btn9-icon", active: "/png/chat_2.png", inactive: "/png/chat_1.png" },
    { page: "anonymous.html", selector: ".btn10-icon", active: "/png/board_2.png", inactive: "/png/board_1.png" },
    { page: "profile.html", selector: ".btn11-icon", active: "/png/profile_2.png", inactive: "/png/profile_1.png" }
];

// 이미지 변경 적용
window.onload = function() {
    const currentPage = window.location.pathname.split("/").pop();
    navItems.forEach(item => {
        const icon = document.querySelector(item.selector);
        if (icon) {
            icon.src = (item.page === currentPage) ? item.active : item.inactive;
        }
    });
};
