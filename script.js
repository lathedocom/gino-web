document.addEventListener('DOMContentLoaded', () => {
    // --- Quản lý Sidebar & Menu ---
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');

    menuBtn.addEventListener('click', () => {
        // Trên di động sidebar đã ẩn hoàn toàn qua CSS media query,
        // nút này chỉ để phục vụ logic sau này nếu có màn hình máy tính.
    });

    // Xử lý hiệu ứng chọn (Active) cho Menu Sidebar
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // --- Quản lý Màn hình Biên tập (Editor) ---
    const fabBtn = document.getElementById('fabBtn');
    const noteEditor = document.getElementById('noteEditor');
    const closeEditorBtn = document.getElementById('closeEditorBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const editTitle = document.getElementById('editNoteTitle');
    const editBody = document.getElementById('editNoteBody');

    // Mở editor (New Note)
    fabBtn.addEventListener('click', () => {
        editTitle.value = ''; // Reset nội dung
        editBody.value = '';
        noteEditor.classList.add('active');
        // Tự động focus vào ô tiêu đề
        editTitle.focus(); 
    });

    // Đóng editor (Arrow Back)
    closeEditorBtn.addEventListener('click', () => {
        // Có thể thêm thông báo "Huỷ bỏ" nếu cần
        noteEditor.classList.remove('active');
    });

    // Lưu ghi chú (Save Done)
    saveNoteBtn.addEventListener('click', () => {
        const title = editTitle.value.trim();
        const body = editBody.value.trim();

        if (title || body) {
            // Giả lập lưu (Vì đây là web tĩnh)
            alert(`Lưu ghi chú giả lập:\nTiêu đề: ${title || "(Trống)"}\nNội dung: ${body}`);
            // Đóng editor
            noteEditor.classList.remove('active');
        } else {
            alert("Vui lòng nhập nội dung ghi chú.");
        }
    });

    // --- Giả lập Data Card Click to Edit ---
    const noteCards = document.querySelectorAll('.note-card');
    noteCards.forEach(card => {
        card.addEventListener('click', function() {
            // Đổ dữ liệu Card demo vào editor để giả lập
            const title = this.querySelector('.note-title').innerText;
            const body = this.querySelector('.note-body').innerText;
            
            editTitle.value = title;
            editBody.value = body;
            noteEditor.classList.add('active');
            editBody.focus(); // Focus vào nội dung nếu là edit
        });
    });

});