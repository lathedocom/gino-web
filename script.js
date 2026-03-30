document.addEventListener('DOMContentLoaded', () => {
    // Các Element chung
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');
    
    // Toggle Menu Mobile
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });

    // Chuyển đổi giữa các màn hình (Tất cả, Lịch, Tags)
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            // Đổi active menu
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Ẩn sidebar trên mobile sau khi click
            sidebar.classList.remove('mobile-open');

            // Đổi view
            const targetId = this.getAttribute('data-target');
            views.forEach(view => {
                view.style.display = view.id === targetId ? 'block' : 'none';
            });

            // Khôi phục hiển thị tất cả ghi chú nếu đang ở All Notes
            if (targetId === 'viewNotes') {
                document.querySelectorAll('.note-card').forEach(card => card.style.display = 'flex');
            }
        });
    });

    // --- LOGIC LỊCH (CALENDAR) ---
    function renderCalendar() {
        const grid = document.querySelector('.calendar-grid');
        // Xóa các ngày cũ (giữ lại header thứ)
        const days = grid.querySelectorAll('.cal-day');
        days.forEach(day => day.remove());

        // Giả lập render 30 ngày của tháng
        for(let i = 1; i <= 30; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'cal-day';
            dayDiv.innerText = i;
            
            // Đánh dấu hôm nay
            if (i === 15) dayDiv.classList.add('today'); 
            
            // Đánh dấu chấm đỏ (có ghi chú) cho ngày 12 và 18 (Giả lập)
            if (i === 12 || i === 18) {
                const dot = document.createElement('div');
                dot.className = 'note-dot';
                dayDiv.appendChild(dot);
            }

            // Click chọn ngày
            dayDiv.addEventListener('click', () => {
                document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
                dayDiv.classList.add('selected');
            });

            grid.appendChild(dayDiv);
        }
    }
    renderCalendar();

    // --- LOGIC TAGS ---
    function renderTags() {
        const allTags = new Set();
        // Lấy tất cả các tags từ các ghi chú đang có
        document.querySelectorAll('.note-card').forEach(card => {
            const tags = card.getAttribute('data-tags');
            if(tags) tags.split(',').forEach(tag => allTags.add(tag.trim()));
        });

        const tagsContainer = document.getElementById('allTagsContainer');
        tagsContainer.innerHTML = '';
        allTags.forEach(tagText => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.innerText = tagText;
            
            // Click vào tag -> Mở màn Tất cả ghi chú -> Chỉ hiện ghi chú có tag này
            tagSpan.addEventListener('click', () => {
                // Đổi menu sang Notes
                navItems.forEach(nav => nav.classList.remove('active'));
                document.querySelector('[data-target="viewNotes"]').classList.add('active');
                views.forEach(view => view.style.display = view.id === 'viewNotes' ? 'block' : 'none');
                
                // Lọc ghi chú
                document.querySelectorAll('.note-card').forEach(card => {
                    const cardTags = card.getAttribute('data-tags') || "";
                    if (cardTags.includes(tagText)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
            tagsContainer.appendChild(tagSpan);
        });
    }
    renderTags();

    // --- MÀN HÌNH EDITOR ---
    const fabBtn = document.getElementById('fabBtn');
    const noteEditor = document.getElementById('noteEditor');
    const editorBody = document.getElementById('editorBody');
    const closeEditorBtn = document.getElementById('closeEditorBtn');
    
    // Nút trên Toolbar
    const editNoteModeBtn = document.getElementById('editNoteModeBtn');
    const editModeToolbar = document.getElementById('editModeToolbar');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    
    // Vùng nhập liệu
    const editTitle = document.getElementById('editNoteTitle');
    const editBody = document.getElementById('editNoteBody');
    const newTagInput = document.getElementById('newTagInput');
    const colorPalettePopup = document.getElementById('colorPalettePopup');

    // Hàm set chế độ Đọc hoặc Sửa
    function setEditorMode(isEditing) {
        if (isEditing) {
            editNoteModeBtn.style.display = 'none'; // Ẩn nút cây bút
            editModeToolbar.style.display = 'flex'; // Hiện 4 nút kia
            editorBody.classList.remove('readonly-mode');
            newTagInput.style.display = 'block';
        } else {
            editNoteModeBtn.style.display = 'flex'; // Hiện nút cây bút
            editModeToolbar.style.display = 'none'; // Ẩn 4 nút kia
            editorBody.classList.add('readonly-mode');
            newTagInput.style.display = 'none'; // Không cho gõ tag
        }
    }

    // Nút Bút Chì (Chuyển sang chế độ sửa)
    editNoteModeBtn.addEventListener('click', () => {
        setEditorMode(true);
        editBody.focus();
    });

    // Mở bằng FAB (+) -> Tạo mới -> Bật sẵn chế độ SỬA
    fabBtn.addEventListener('click', () => {
        resetEditor();
        setEditorMode(true); 
        noteEditor.classList.add('active');
        editTitle.focus();
    });

    // Mở Ghi chú có sẵn -> Bật chế độ ĐỌC
    const noteCards = document.querySelectorAll('.note-card');
    noteCards.forEach(card => {
        card.addEventListener('click', function() {
            resetEditor();
            editTitle.value = this.querySelector('.note-title').innerText;
            editBody.value = this.querySelector('.note-body').innerText;
            editorBody.style.backgroundColor = window.getComputedStyle(this).backgroundColor;
            
            setEditorMode(false); // Chế độ ĐỌC (chỉ có cây bút)
            noteEditor.classList.add('active');
        });
    });

    // Đóng Editor
    closeEditorBtn.addEventListener('click', () => {
        noteEditor.classList.remove('active');
        colorPalettePopup.classList.remove('open');
    });

    // Reset Editor
    function resetEditor() {
        editTitle.value = '';
        editBody.value = '';
        editorBody.style.backgroundColor = '#ffffff';
        colorPalettePopup.classList.remove('open');
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
        document.querySelector('.color-option.default').classList.add('active');
    }

    // --- CÁC NÚT TOOLBAR (Bóng đèn, Palette, Image, Save) ---
    document.getElementById('wrapTextBtn').addEventListener('click', () => {
        const startPos = editBody.selectionStart;
        const endPos = editBody.selectionEnd;
        const selectedText = editBody.value.substring(startPos, endPos);
        if (selectedText) {
            const wrappedText = `{${selectedText}}`;
            editBody.value = editBody.value.substring(0, startPos) + wrappedText + editBody.value.substring(endPos);
            editBody.setSelectionRange(startPos, startPos + wrappedText.length);
        } else {
            alert("Vui lòng bôi đen đoạn chữ.");
        }
    });

    const colorPaletteBtn = document.getElementById('colorPaletteBtn');
    colorPaletteBtn.addEventListener('click', () => {
        colorPalettePopup.classList.toggle('open');
    });

    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            editorBody.style.backgroundColor = this.getAttribute('data-color');
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.getElementById('insertImageBtn').addEventListener('click', () => {
        alert("Tính năng chèn ảnh sẽ được kết nối sau.");
    });

    saveNoteBtn.addEventListener('click', () => {
        alert("Đã lưu ghi chú thành công!");
        setEditorMode(false); // Lưu xong quay về chế độ đọc
    });
});
