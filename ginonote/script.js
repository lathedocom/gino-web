// --- Xử lý Đa Ngôn Ngữ ---
const translations = {
"vi": {
"slogan": "Khắc ghi chú vào trí nhớ",
"hero_desc": "Ghi chú, ôn tập kiến thức bằng Active Recall và Spaced Repetition trong một ứng dụng duy nhất.",
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
"recall_diff": "Gợi ý mức độ ghi nhớ dựa trên kết quả của bạn.",
// Khối 3: Lịch sử học tập
"cal_title": "Lịch sử ghi chú",
"cal_desc": "Xem lại những ngày bạn đã ghi chú.",
"cal_dot": "ĐĐánh dấu những ngày có ghi chú.",
"cal_today": "Xem lịch sử ghi chú và quay về hôm nay chỉ với một chạm.",
"cal_notes": "Xem chi tiết ghi chú theo từng ngày.",
// Khối 4: Thống kê tiến độ học tập
"stats_title": "Thống kê tiến độ học tập",
"stats_desc": "Theo dõi số lượng ghi chú, phiên ôn tập và khả năng ghi nhớ theo thời gian.",
"stats_metrics": "Theo dõi hoạt động theo tuần, tháng hoặc năm.",
"stats_visual": "Đánh giá mức độ ghi nhớ dựa trên kết quả ôn tập thực tế.",
// Khối 5: Đồng bộ và sao lưu dữ liệu
"sync_title": "Đồng bộ & Chia sẻ",
"sync_desc": "Tự động đồng bộ qua Google Drive cá nhân.",
"sync_drive": "Truy cập dữ liệu trên mọi thiết bị và web.",
"sync_share": "Xuất, nhập và chia sẻ tệp .gino theo tags hoặc toàn bộ ghi chú.",
// Khối 6: Video
"box5_title": "Tìm hiểu cách hoạt động",
"box5_desc": "Xem video ngắn để hiểu cách ghi chú và ôn tập hiệu quả với GinoNote.",

// Khối Tải file mẫu
"gino_download_title": "Trải nghiệm bộ ghi chú mẫu",
"gino_download_desc": "Tải các tệp .gino dưới đây và mở bằng ứng dụng GinoNote để khám phá ngay hệ thống ôn tập.",
"gino_file1_title": "Tiếng Anh Giao Tiếp",
"gino_file1_desc": "Bộ 50 từ vựng và câu giao tiếp cơ bản kèm ví dụ.",
"gino_file2_title": "Lập trình cơ bản",
"gino_file2_desc": "Các khái niệm cốt lõi về thuật toán và cấu trúc dữ liệu.",
"gino_file3_title": "Lịch sử Thế giới",
"gino_file3_desc": "Tóm tắt các cột mốc lịch sử quan trọng dễ nhớ nhất.",
"gino_btn_download": "Tải file .gino",

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
"slogan": "Etch notes into your memory",
"hero_desc": "Take notes, review knowledge using Active Recall and Spaced Repetition in a single app.",
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
"recall_diff": "Receive recall rating suggestions based on your results.",
// Block 3: Study History
"cal_title": "Note History",
"cal_desc": "View the days you've taken notes.",
"cal_dot": "Highlight days with notes.",
"cal_today": "Browse your note history and jump back to today with one tap.",
"cal_notes": "View detailed notes for a specific day.",
// Block 4: Learning Progress
"stats_title": "Learning progress stats",
"stats_desc": "Track your note count, review sessions, and memory retention over time.",
"stats_metrics": "Monitor your activity by week, month, or year.",
"stats_visual": "Evaluate memory retention based on actual review results.",
// Block 5: Sync & Backup
"sync_title": "Sync & Share",
"sync_desc": "Automatically sync and back up your data with your personal Google Drive.",
"sync_drive": "Access your notes across all devices and the web.",
"sync_share": "Share .gino files by selected tags  or your entire note collection.",
// Block 6: Video
"box5_title": "See how it works",
"box5_desc": "Watch a short video to learn how to take notes and review effectively with GinoNote.",

// Sample Files Block
"gino_download_title": "Try our sample notes",
"gino_download_desc": "Download the .gino files below and open them with GinoNote to experience the review system instantly.",
"gino_file1_title": "Basic English",
"gino_file1_desc": "Essential Words & Phrases",
"gino_file2_title": "Programming 101",
"gino_file2_desc": "Core concepts of algorithms and data structures.",
"gino_file3_title": "World History",
"gino_file3_desc": "Summary of the most important historical milestones.",
"gino_btn_download": "Download .gino",

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
