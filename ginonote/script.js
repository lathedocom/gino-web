// --- Xử lý Đa Ngôn Ngữ ---
const translations = {
    "vi": {
        "slogan": "Khắc ghi chú vào trí nhớ",
        "hero_desc": "Ghi chú, ôn tập và ghi nhớ kiến thức bằng Active Recall và Spaced Repetition trong một ứng dụng duy nhất.",
        "download": "Tải trên Google Play",
        "download_cta": "Tải trên Google Play",

        // Khối 1: Không gian ghi chú tối giản
        "box1_title": "Không gian ghi chú tối giản",
        "box1_desc": "Tập trung vào nội dung với trình soạn thảo đơn giản, gọn gàng và dễ sử dụng.",
        "icon_lightbulb": "Tạo câu hỏi điền từ từ bất kỳ từ khóa nào.",
        "icon_play": "Chuyển ghi chú thành bài ôn tập chỉ với một chạm.",

        // Khối 2: Hệ thống ôn tập chủ động
        "recall_title": "Hệ thống ôn tập chủ động",
        "recall_desc": "Thay thế việc đọc lại thụ động bằng phương pháp tự hồi tưởng giúp ghi nhớ hiệu quả hơn.",
        "recall_help": "Gợi ý từng phần khi bạn chưa nhớ ra đáp án.",
        "recall_check": "So sánh câu trả lời với nội dung gốc ngay sau khi hoàn thành.",
        "recall_detail": "Chấm điểm tự động và bỏ qua lỗi gõ nhỏ.",
        "recall_diff": "Tự động lên lịch ôn tập dựa trên mức độ ghi nhớ của bạn.",

        // Khối 3: Lịch sử học tập
        "cal_title": "Lịch sử học tập",
        "cal_desc": "Xem lại những ngày bạn đã ghi chú và ôn tập để duy trì thói quen học tập đều đặn.",
        "cal_dot": "Đánh dấu những ngày có hoạt động.",
        "cal_today": "Quay về hôm nay chỉ với một chạm.",
        "cal_notes": "Xem chi tiết ghi chú và lịch sử ôn tập theo từng ngày.",

        // Khối 4: Thống kê tiến độ học tập
        "stats_title": "Thống kê tiến độ học tập",
        "stats_desc": "Theo dõi số lượng ghi chú, phiên ôn tập và khả năng ghi nhớ theo thời gian.",
        "stats_metrics": "Theo dõi hoạt động theo tuần, tháng hoặc năm.",
        "stats_visual": "Đánh giá mức độ ghi nhớ dựa trên kết quả ôn tập thực tế.",

        // Khối 5: Đồng bộ và sao lưu dữ liệu
        "sync_title": "Đồng bộ và sao lưu dữ liệu",
        "sync_desc": "Giữ dữ liệu luôn an toàn và sẵn sàng trên mọi thiết bị.",
        "sync_drive": "Tự động sao lưu và đồng bộ dữ liệu qua Google Drive.",
        "sync_share": "Xuất và chia sẻ toàn bộ ghi chú bằng một tệp duy nhất.",

        // Khối 6: Video
        "box5_title": "Tìm hiểu cách hoạt động",
        "box5_desc": "Xem video ngắn để hiểu cách ghi chú và ôn tập hiệu quả với GinoNote.",
        
        // Khối 7: Ưu điểm
        "adv4_title": "Ghi nhớ hiệu quả",
        "adv4_desc": "Active Recall và Spaced Repetition giúp kiến thức được lưu giữ lâu hơn.",
        "adv5_title": "Theo dõi tiến độ",
        "adv5_desc": "Biết mình đã học được bao nhiêu và cần ôn tập gì tiếp theo.",
        "adv6_title": "Chia sẻ dễ dàng",
        "adv6_desc": "Xuất và gửi bộ ghi chú chỉ với một tệp .gino.",
        
        // Khối 8: CTA
        "free_title": "Bắt đầu ghi nhớ hiệu quả hơn",
        "free_desc": "Tạo ghi chú, ôn tập bằng Active Recall và xây dựng trí nhớ dài hạn với GinoNote. Sở hữu trọn đời chỉ với một lần thanh toán.",
        
        "policy": "Chính sách bảo mật",
        "terms": "Điều khoản sử dụng"
    },
    "en": {
        "slogan": "Take notes to remember longer",
        "hero_desc": "Take notes, review, and retain knowledge using Active Recall and Spaced Repetition in a single app.",
        "download": "Get it on Google Play",
        "download_cta": "Get it on Google Play",

        // Block 1: Minimalist Note Space
        "box1_title": "Minimalist workspace",
        "box1_desc": "Focus on your content with a simple, clean, and intuitive editor.",
        "icon_lightbulb": "Create fill-in-the-blank questions from any keyword.",
        "icon_play": "Turn notes into a review session with a single tap.",

        // Block 2: Active Review System
        "recall_title": "Active review system",
        "recall_desc": "Replace passive rereading with self-retrieval techniques for better memory retention.",
        "recall_help": "Get partial hints when you can't recall the answer.",
        "recall_check": "Compare your answers with the original content immediately.",
        "recall_detail": "Automatic scoring with typo tolerance.",
        "recall_diff": "Automatically schedule reviews based on your retention level.",

        // Block 3: Study History
        "cal_title": "Study history",
        "cal_desc": "Review your note-taking and study sessions to maintain consistent learning habits.",
        "cal_dot": "Highlight days with learning activities.",
        "cal_today": "Return to today with a single tap.",
        "cal_notes": "View detailed notes and review history for each day.",

        // Block 4: Learning Progress
        "stats_title": "Learning progress stats",
        "stats_desc": "Track your note count, review sessions, and memory retention over time.",
        "stats_metrics": "Monitor your activity by week, month, or year.",
        "stats_visual": "Evaluate memory retention based on actual review results.",

        // Block 5: Sync & Backup
        "sync_title": "Sync and backup",
        "sync_desc": "Keep your data safe and accessible across all devices.",
        "sync_drive": "Automatically backup and sync data via Google Drive.",
        "sync_share": "Export and share all your notes in a single file.",

        // Block 6: Video
        "box5_title": "See how it works",
        "box5_desc": "Watch a short video to learn how to take notes and review effectively with GinoNote.",
        
        // Block 7: Advantages
        "adv4_title": "Effective retention",
        "adv4_desc": "Active Recall and Spaced Repetition help you retain knowledge longer.",
        "adv5_title": "Track progress",
        "adv5_desc": "Know exactly what you've learned and what to review next.",
        "adv6_title": "Easy sharing",
        "adv6_desc": "Export and send your notes easily with a single .gino file.",
        
        // Block 8: CTA
        "free_title": "Start remembering more effectively",
        "free_desc": "Create notes, review with Active Recall, and build long-term memory with GinoNote. Lifetime access with a one-time payment.",
        
        "policy": "Privacy Policy",
        "terms": "Terms of Use"
    }
};

let currentLang = "vi";
function toggleLanguage() {
    currentLang = currentLang === "vi" ? "en" : "vi";
    const elements = document.querySelectorAll("[data-i18n]");
    elements.forEach(element => {
        const key = element.getAttribute("data-i18n");
        if (translations[currentLang][key]) {
            element.innerHTML = translations[currentLang][key];
        }
    });
    document.getElementById("link-policy").href = currentLang === "vi" ? "policy_vi.html" : "policy_en.html";
    document.getElementById("link-terms").href = currentLang === "vi" ? "terms_vi.html" : "terms_en.html";
    document.getElementById("langToggle").innerText = currentLang === "vi" ? "VI / EN" : "EN / VI";
}

// --- Xử lý Giao diện Sáng / Tối (Đồng bộ với Trình duyệt/OS) ---
const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const themeIcon = document.getElementById('themeIcon');
const htmlEl = document.documentElement;

// Hàm áp dụng theme và đổi icon
function applyTheme(theme) {
    if (theme === 'dark') {
        htmlEl.setAttribute('data-theme', 'dark');
        if(themeIcon) themeIcon.innerText = 'light_mode'; // Hiển thị mặt trời
    } else {
        htmlEl.removeAttribute('data-theme');
        if(themeIcon) themeIcon.innerText = 'dark_mode'; // Hiển thị mặt trăng
    }
}

// Khởi tạo theme khi load trang
function initTheme() {
    const savedTheme = localStorage.getItem('gino_theme');
    // Nếu user đã từng bấm nút chọn thủ công thì ưu tiên lựa chọn đó
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Nếu chưa, lấy theo cài đặt mặc định của trình duyệt/Hệ điều hành
        applyTheme(prefersDarkQuery.matches ? 'dark' : 'light');
    }
}

// Hàm chạy khi user chủ động bấm nút Toggle trên web
function toggleTheme() {
    const isCurrentlyDark = htmlEl.getAttribute('data-theme') === 'dark';
    const newTheme = isCurrentlyDark ? 'light' : 'dark';
    applyTheme(newTheme);
    // Lưu lại lựa chọn thủ công của user
    localStorage.setItem('gino_theme', newTheme);
}

// Lắng nghe sự thay đổi theme từ hệ thống theo thời gian thực
prefersDarkQuery.addEventListener('change', (e) => {
    // Chỉ tự động đổi theo hệ thống nếu user CHƯA từng cài đặt thủ công trên web
    if (!localStorage.getItem('gino_theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});
