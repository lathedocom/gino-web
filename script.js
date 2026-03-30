document.addEventListener('DOMContentLoaded', () => {
    // --- Quản lý Màn hình Biên tập (GinoNote Editor) ---
    const fabBtn = document.getElementById('fabBtn');
    const noteEditor = document.getElementById('noteEditor');
    const editorBody = document.getElementById('editorBody');
    const closeEditorBtn = document.getElementById('closeEditorBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const editTitle = document.getElementById('editNoteTitle');
    const editTime = document.getElementById('editNoteTime');
    const editBody = document.getElementById('editNoteBody');
    const wrapTextBtn = document.getElementById('wrapTextBtn');
    const colorPaletteBtn = document.getElementById('colorPaletteBtn');
    const colorPalettePopup = document.getElementById('colorPalettePopup');

    // Mở editor (New Note) -> Giả lập hành vi chuẩn app
    fabBtn.addEventListener('click', () => {
        resetEditor(); // Làm trống
        editTime.innerText = "Tự động tạo thời gian..."; // Chờ lưu
        noteEditor.classList.add('active');
        editTitle.focus(); 
    });

    // Đóng editor (Arrow Back)
    closeEditorBtn.addEventListener('click', () => {
        // Có thể thêm cảnh báo "Hủy bỏ"
        noteEditor.classList.remove('active');
        colorPalettePopup.classList.remove('open'); // Đóng luôn màu
    });

    // --- Chức năng icon Bóng đèn (Bôi đen {}) ---
    wrapTextBtn.addEventListener('click', () => {
        const textarea = editBody;
        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;
        const selectedText = textarea.value.substring(startPos, endPos);

        if (selectedText) {
            const wrappedText = `{${selectedText}}`;
            // Thay thế chữ bôi đen bằng chữ nằm trong {}
            textarea.value = textarea.value.substring(0, startPos) + wrappedText + textarea.value.substring(endPos);
            textarea.focus();
            textarea.setSelectionRange(startPos, startPos + wrappedText.length); // Giữ vùng chọn
        } else {
            alert("Vui lòng bôi đen đoạn chữ muốn bao trong ngoặc {}.");
        }
    });

    // --- Chức năng icon Palette (Chọn màu nền) ---
    colorPaletteBtn.addEventListener('click', () => {
        colorPalettePopup.classList.toggle('open');
    });

    // Click ra ngoài màu để đóng
    document.addEventListener('click', (event) => {
        if (!colorPaletteBtn.contains(event.target) && !colorPalettePopup.contains(event.target)) {
            colorPalettePopup.classList.remove('open');
        }
    });

    // Xử lý chọn màu cụ thể
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            
            // Đổi nền editor body
            editorBody.style.backgroundColor = color;
            
            // Đổi active state
            colorOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // --- Chức năng icon Image (Chèn ảnh) -> Giả lập ---
    document.getElementById('insertImageBtn').addEventListener('click', () => {
        alert("Sau này đây sẽ là nơi popup chọn ảnh từ thiết bị mở ra và giả lập hiển thị ảnh placeholder trong ghi chú.");
    });

    // --- Chức năng icon Save (Lưu & Tạo thời gian) ---
    saveNoteBtn.addEventListener('click', () => {
        const title = editTitle.value.trim();
        const body = editBody.value.trim();

        if (title || body) {
            // Tự động tạo thời gian thực khi lưu
            const now = new Date();
            const timeString = now.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
            editTime.innerText = timeString;

            // Lấy màu nền hiện tại để lưu
            const currentBgColor = window.getComputedStyle(editorBody).backgroundColor;

            // Giả lập lưu thành công
            alert(`💾 Ghi chú GIẢ LẬP đã được lưu thành công!\nThời gian: ${timeString}\nMàu nền (giả lập): ${currentBgColor}\n\n(Lưu ý: Mọi thay đổi sẽ không được giữ lại sau khi tải lại trang vì đây là web tĩnh.)`);
            noteEditor.classList.remove('active');
        } else {
            alert("Vui lòng nhập nội dung ghi chú.");
        }
    });

    // --- Giả lập Data Card Click to Edit ---
    const noteCards = document.querySelectorAll('.note-card');
    noteCards.forEach(card => {
        card.addEventListener('click', function() {
            resetEditor(); // Làm trống trước
            
            const title = this.querySelector('.note-title').innerText;
            const body = this.querySelector('.note-body').innerText;
            const cardBgColor = window.getComputedStyle(this).backgroundColor;
            
            editTitle.value = title;
            editBody.value = body;
            editorBody.style.backgroundColor = cardBgColor; // Đổ màu giả lập
            
            // Data demo cho thời gian khi edit
            editTime.innerText = "Data demo: 10:30, 05/04/2026";
            
            noteEditor.classList.add('active');
            editBody.focus(); 
        });
    });

    // Reset editor về trạng thái mặc định
    function resetEditor() {
        editTitle.value = '';
        editBody.value = '';
        editTime.innerText = 'Tự động tạo thời gian...';
        editorBody.style.backgroundColor = '#ffffff'; // Mặc định trắng
        colorPalettePopup.classList.remove('open');
        colorOptions.forEach(opt => opt.classList.remove('active'));
        document.querySelector('.color-option.default').classList.add('active');
    }

    // --- Hiệu ứng Active cho Sidebar ---
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
});
