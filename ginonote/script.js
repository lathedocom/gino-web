// --- Xử lý Đa Ngôn Ngữ ---
const translations = {
  "vi": {
    "slogan": "Khắc ghi chú vào trí nhớ",
    "hero_desc": "Ứng dụng ghi chú thông minh kết hợp phương pháp Active Recall và Spaced Repetition, giúp bạn chuyển hóa thông tin thành tri thức dài hạn.",
    "download": "Tải ứng dụng từ Play Store",
    
    // Khối 1: Không gian Ghi chú Tối giản
    "box1_title": "Không gian Ghi chú Tối giản",
    "box1_desc": "Trải nghiệm viết hoàn toàn không phân tâm với giao diện tối giản.",
    "box1_list_intro": "Thao tác nhanh:",
    "icon_lightbulb": "Tạo ô trống điền từ: Chọn từ khóa quan trọng và nhấn biểu tượng Bóng đèn.",
    "icon_play": "Bắt đầu ôn tập: Nhấn biểu tượng Play để vào chế độ Active Recall.",
    
    // Khối 2: Hệ thống ôn tập chủ động
    "recall_title": "Hệ thống ôn tập chủ động",
    "recall_desc": "Đột phá thói quen đọc lại thụ động nhờ sự kết hợp giữa Active Recall và Spaced Repetition.",
    "recall_list_intro": "Chi tiết Chức năng & Cách thức Hoạt động:",
    "recall_help": "Gợi ý (Hint): Nhận manh mối nhỏ khi \"bí\" từ, duy trì hiệu quả tự hồi tưởng.",
    "recall_check": "Kiểm tra đáp án: Đối chiếu câu trả lời với bản gốc và nhận kết quả ngay sau hoàn thành.",
    "recall_detail": "Chấm điểm trực quan: Hiển thị điểm số %, phân biệt đúng/sai bằng màu sắc trực quan và tính năng tự động bỏ qua lỗi đánh máy.",
    "recall_diff": "Thuật toán thông minh: Tự động lên lịch ôn tập cho lần tới dựa trên mức độ đánh giá (Again - Hard - Good - Easy) của chính bạn.",
    
    // Khối 3: Nhật ký ghi chú trực quan
    "cal_title": "Nhật ký ghi chú trực quan",
    "cal_desc": "Theo dõi hoạt động ghi chú qua giao diện Lịch thông minh, nơi mọi nỗ lực của bạn được lưu vết theo thời gian.",
    "cal_dot": "Dấu chân tri thức: Chấm đỏ trực quan đánh dấu những ngày có hoạt động ghi chú.",
    "cal_today": "Trở về \"Hôm nay\": Nút thao tác nhanh giúp bạn quay lại lịch trình hiện tại từ bất kỳ đâu chỉ với một chạm.",
    "cal_notes": "Dòng thời gian: Xem chi tiết toàn bộ danh sách bài học và lịch sử ôn tập của từng ngày cụ thể một cách khoa học.",
    
    // Khối 4: Trực Quan Hóa Hành Trình Ghi Nhớ
    "stats_title": "Trực Quan Hóa Hành Trình Ghi Nhớ",
    "stats_desc": "Nắm bắt thói quen và hiệu suất ôn tập thông qua trung tâm phân tích dữ liệu trực quan.",
    "stats_metrics": "Biểu đồ Thống kê: Đếm tổng lượng ghi chú và lượt tương tác theo Tuần/Tháng/Năm để theo dõi đà tăng trưởng tri thức.",
    "stats_visual": "Phân tích khả năng ghi nhớ: Hiển thị rõ ràng tỷ lệ chất lượng ghi nhớ ghi chú, giúp bạn tự đánh giá chất lượng và mức độ làm chủ kiến thức.",
    
    // Khối 5: Kết Nối & Lưu Trữ An Toàn
    "sync_title": "Kết Nối & Lưu Trữ An Toàn",
    "sync_desc": "Bảo vệ tri thức của bạn với giải pháp đồng bộ hóa đám mây và hệ thống xuất tệp tin thông minh.",
    "sync_drive": "Đồng bộ Google Drive: Tự động sao lưu và giữ cho dữ liệu luôn đồng nhất, xuyên suốt giữa ứng dụng di động và nền tảng web.",
    "sync_share": "Chia sẻ file .gino: Đóng gói thông minh toàn bộ nội dung và hình ảnh vào một tệp tin duy nhất, giúp việc gửi và chia sẻ tài liệu nhanh chóng hơn bao giờ hết.",
    
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
    
    // Block 1: Minimalist Note Space
    "box1_title": "Minimalist Note Space",
    "box1_desc": "Experience completely distraction-free writing with a minimalist interface.",
    "box1_list_intro": "Quick actions:",
    "icon_lightbulb": "Create fill-in-the-blanks: Select important keywords and tap the Lightbulb icon.",
    "icon_play": "Start reviewing: Tap the Play icon to enter Active Recall mode.",
    
    // Block 2: Active Review System
    "recall_title": "Active Review System",
    "recall_desc": "Break the habit of passive rereading through the combination of Active Recall and Spaced Repetition.",
    "recall_list_intro": "Function Details & How It Works:",
    "recall_help": "Hint: Get a small clue when stuck, maintaining the effectiveness of self-retrieval.",
    "recall_check": "Check Answer: Compare your answers with the original and get instant results upon completion.",
    "recall_detail": "Visual Scoring: Displays percentage scores, visually distinguishes right/wrong with colors, and automatically ignores typos.",
    "recall_diff": "Smart Algorithm: Automatically schedules your next review session based on your self-assessment (Again - Hard - Good - Easy).",
    
    // Block 3: Visual Note Diary
    "cal_title": "Visual Note Diary",
    "cal_desc": "Track your note-taking activities through a smart Calendar interface, where all your efforts are recorded over time.",
    "cal_dot": "Footprints of Knowledge: Visual red dots mark the days with note-taking activities.",
    "cal_today": "Return to \"Today\": A quick-action button helps you instantly return to the current schedule from anywhere with just one tap.",
    "cal_notes": "Timeline: View the detailed list of lessons and review history for any specific day scientifically.",
    
    // Block 4: Visualize the Memory Journey
    "stats_title": "Visualize the Memory Journey",
    "stats_desc": "Grasp your habits and review performance through a visual data analysis center.",
    "stats_metrics": "Statistical Charts: Count total notes and interactions by Week/Month/Year to track knowledge growth.",
    "stats_visual": "Memory Analysis: Clearly displays the retention quality ratio of your notes, helping you self-assess quality and mastery.",
    
    // Block 5: Secure Connection & Storage
    "sync_title": "Secure Connection & Storage",
    "sync_desc": "Protect your knowledge with cloud synchronization solutions and a smart file export system.",
    "sync_drive": "Google Drive Sync: Automatically back up and keep your data consistent across the mobile app and web platform.",
    "sync_share": "Share .gino files: Smartly package all content and images into a single file, making document sharing faster than ever.",
    
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
