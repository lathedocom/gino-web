// --- Xử lý Đa Ngôn Ngữ ---
const translations = {
    "vi": {
        "slogan": "Khắc ghi chú vào trí nhớ",
        "hero_desc": "Ứng dụng ghi chú thông minh kết hợp phương pháp Active Recall và Spaced Repetition, giúp bạn chuyển hóa thông tin thành tri thức dài hạn.",
        "download": "Tải ứng dụng từ Play Store",
        "box1_title": "Không gian Ghi chú Tối giản, Tập trung và Hỗ trợ Học tập",
        "box1_desc": "Màn hình soạn thảo của GinoNote mang đến trải nghiệm viết hoàn toàn không gây phân tâm nhờ thiết kế tối giản và chế độ nền tối (dark mode) dịu mắt. Điểm ưu việt của màn hình này là sự kết hợp giữa hệ thống \"Thẻ phân loại\" (Tags) giúp tổ chức dữ liệu khoa học, và tính năng đánh dấu từ khóa thông minh bằng ngoặc nhọn {...}, rất lý tưởng để tạo các bài ôn tập dạng điền từ.",
        "box1_list_intro": "Khám phá các tính năng đặc biệt:",
        "icon_lightbulb": "Bôi đen từ khóa bạn cho là quan trọng/ cần ghi nhớ. Khi bôi đen từ khóa và nhấn vào biểu tượng bóng đèn, hệ thống sẽ bọc từ khóa trong ngoặc nhọn (ví dụ: {quan điểm}) để tạo thành các ô trống ẩn từ.",
        "icon_play": "Khởi động chế độ ôn tập tập trung. Hệ thống sẽ chuyển sang giao diện thực hành, ẩn đi các từ khóa trong ngoặc nhọn để bạn chính thức kiểm tra trí nhớ.",
        "recall_title": "Hệ thống Ôn tập Chủ động",
        "recall_desc": "GinoNote thay đổi hoàn toàn thói quen đọc lại thụ động bằng cách kết hợp sức mạnh của phương pháp Active Recall (Chủ động gọi nhớ) và Spaced Repetition (Lặp lại ngắt quãng).",
        "recall_list_intro": "Chi tiết Chức năng & Cách thức Hoạt động:",
        "recall_help": "Icon Trợ giúp (?): Khi bạn \"bí\" từ, nhấn vào biểu tượng này để nhận một gợi ý nhỏ mà không làm mất đi nỗ lực tự hồi tưởng.",
        "recall_check": "Nút Kiểm tra đáp án: Khóa đáp án của bạn và tiến hành đối chiếu với bản gốc để đưa ra kết quả ngay lập tức.",
        "recall_detail": "Sửa lỗi trực quan: Hệ thống chấm điểm %, tô xanh từ đúng và bôi đỏ từ sai kèm đáp án chính xác. Tính năng châm chước giúp sửa lỗi đánh máy nhanh.",
        "recall_diff": "Đánh giá độ khó (Again - Easy): Thuật toán căn cứ vào lựa chọn của bạn để lên lịch ôn tập hoàn hảo cho lần tiếp theo.",
        "cal_title": "Nhật ký Học tập Trực quan",
        "cal_desc": "Màn hình Lịch đóng vai trò như một cuốn nhật ký cá nhân, nơi mọi ghi chép và tiến độ ôn tập của bạn được lưu vết cẩn thận theo thời gian thực.",
        "cal_dot": "Dấu chấm đỏ dưới các ngày: Đánh dấu các mốc \"Dấu chân tri thức\" khi bạn tạo ghi chú hoặc ôn tập mới trong ngày.",
        "cal_today": "Trở về hiện tại: Một chạm để quay lại lịch trình của ngày hôm nay dù bạn đang ở bất kỳ tháng nào.",
        "cal_notes": "Dòng thời gian bài học: Hiển thị chi tiết toàn bộ danh sách ghi chú đã tạo hoặc lịch sử ôn tập khi chọn một ngày cụ thể.",
        "stats_title": "Trực Quan Hóa Mọi Hành Trình Ghi Nhớ",
        "stats_desc": "Trung tâm phân tích học tập giúp bạn nắm bắt thói quen, hiệu suất ôn tập và tiến độ ghi nhớ dài hạn thông qua dữ liệu thực tế.",
        "stats_metrics": "Thống kê theo Tuần/Tháng/Năm: Đếm tổng lượng ghi chú và lượt tương tác để theo dõi sự tăng trưởng tri thức.",
        "stats_visual": "Phân tích Ghi nhớ: Trực quan hóa số lượng ghi chú \"Đang ôn\" và \"Đã thuộc\" để đánh giá chất lượng học tập.",
        "sync_title": "Kết Nối Tri Thức Không Giới Hạn",
        "sync_desc": "Xóa tan nỗi lo mất mát thông tin nhờ giải pháp đồng bộ hóa tức thì và hệ thống xuất tệp tin độc quyền để chia sẻ kiến thức.",
        "sync_drive": "Đồng bộ Google Drive: Tự động sao lưu mọi chỉnh sửa lên đám mây, đảm bảo dữ liệu luôn nhất quán trên mọi thiết bị.",
        "sync_share": "Chia sẻ file .gino: Đóng gói toàn bộ nội dung và hình ảnh thành một tệp tin duy nhất để trao đổi tài liệu cực kỳ nhanh chóng.",
        "box5_title": "Khám phá sức mạnh của GinoNote",
        "box5_desc": "Xem video ngắn để nắm bắt cách ứng dụng có thể thay đổi cách bạn tổ chức cuộc sống và nâng tầm tư duy.",
        "adv4_title": "Tối ưu ghi nhớ khoa học",
        "adv4_desc": "Khắc sâu kiến thức vào trí nhớ dài hạn nhờ sự kết hợp giữa Active Recall và Spaced Repetition, giúp tiết kiệm thời gian học mà vẫn đạt hiệu quả cao nhất.",
        "adv5_title": "Thống kê thông minh",
        "adv5_desc": "Theo dõi tiến độ bản thân qua hệ thống trực quan, tự động dự báo khối lượng bài cần ôn để bạn luôn làm chủ kế hoạch học tập mỗi ngày.",
        "adv6_title": "Dễ dàng chia sẻ",
        "adv6_desc": "Đóng gói và chia sẻ kho tàng kiến thức qua file .gino độc quyền, giúp trao đổi các bộ thẻ ghi chú tiện lợi và sử dụng ngoại tuyến dễ dàng.",
        "free_title": "Sẵn sàng khắc ghi chú vào trí nhớ?",
        "free_desc": "Đừng chỉ ghi chép rồi để đó. Hãy để GinoNote giúp bạn chuyển hóa thông tin thành tri thức. Ứng dụng hệ thống khoa học Active Recall và Spaced Repetition là khoản đầu tư bền vững nhất cho tư duy của bạn.",
        "policy": "Chính sách bảo mật",
        "terms": "Điều khoản sử dụng"
    },
    "en": {
        "slogan": "Etch notes into your memory",
        "hero_desc": "Smart note-taking app combining Active Recall and Spaced Repetition to turn information into long-term knowledge.",
        "download": "Download on Google Play",
        "box1_title": "Minimalist, Focused Note Space",
        "box1_desc": "GinoNote's editor offers a completely distraction-free writing experience thanks to its minimalist design and soothing dark mode. Perfect for creating review exercises by emphasizing core keywords using curly brackets.",
        "box1_list_intro": "Discover special features:",
        "icon_lightbulb": "Select a keyword to memorize. Tapping this wraps it in curly brackets to create hidden blanks for active recall sessions.",
        "icon_play": "Start focused review mode. The system hides bracketed keywords to test your memory.",
        "recall_title": "Active Review System",
        "recall_desc": "GinoNote transforms passive reading habits by combining the power of Active Recall and Spaced Repetition for long-term retention.",
        "recall_list_intro": "Function Details & How It Works:",
        "recall_help": "Help Icon (?): When stuck, tap for a small hint without losing the effort of self-retrieval.",
        "recall_check": "Check Answer: Locks your answer and compares it with the original for immediate feedback.",
        "recall_detail": "Visual Correction: Scores your session, highlights correct words in green and mistakes in red. Mercy feature fixes typos quickly.",
        "recall_diff": "Difficulty Rating (Again - Easy): The algorithm uses your choice to schedule the perfect next review session.",
        "cal_title": "Visual Learning Diary",
        "cal_desc": "The Calendar acts as a personal diary, where every note and review progress is tracked in real-time.",
        "cal_dot": "Red dots under dates: Marks 'Footprints of Knowledge' when you create notes or review sessions.",
        "cal_today": "Return to Today: One tap to return to today's schedule from any month.",
        "cal_notes": "Lesson Timeline: Displays a detailed list of notes and review history for a specific day.",
        "stats_title": "Visualize Every Memory Journey",
        "stats_desc": "An analysis center helping you grasp habits, review performance, and long-term memory progress through actual data.",
        "stats_metrics": "Weekly/Monthly/Yearly Stats: Counts total notes and interactions to track knowledge growth.",
        "stats_visual": "Memory Analysis: Visualizes 'Learning' vs 'Mastered' notes to evaluate study quality.",
        "sync_title": "Unlimited Knowledge Connection",
        "sync_desc": "Eliminate worries about data loss with instant synchronization and a proprietary file sharing system.",
        "sync_drive": "Google Drive Sync: Automatically back up edits to the cloud, keeping data consistent across all devices.",
        "sync_share": "Share .gino files: Pack content and images into a single file for incredibly fast material exchange.",
        "box5_title": "Discover the Power of GinoNote",
        "box5_desc": "Watch a short video to see how the app can change your organization and elevate your thinking.",
        "adv4_title": "Scientific Memorization",
        "adv4_desc": "Engrave knowledge into long-term memory using Active Recall and Spaced Repetition, maximizing learning efficiency.",
        "adv5_title": "Smart Achievement Stats",
        "adv5_desc": "Track progress through a visual system that forecasts upcoming review workloads to master your study plan.",
        "adv6_title": "Easy Sharing",
        "adv6_desc": "Share knowledge via proprietary .gino files, making deck exchanges convenient and accessible offline.",
        "free_title": "Ready to etch notes into memory?",
        "free_desc": "Don't just take notes. Let GinoNote transform information into knowledge. Using scientific systems is the best investment for your mind.",
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

// Chạy khởi tạo khi DOM tải xong
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});