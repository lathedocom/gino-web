document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ĐIỀU HƯỚNG SIDEBAR & MOBILE MENU ---
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('mobileBackdrop');
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    function toggleMobileMenu() {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('open');
    }

    menuBtn.addEventListener('click', toggleMobileMenu);
    backdrop.addEventListener('click', toggleMobileMenu);

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            // Đổi active menu
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Chuyển View
            const targetView = this.getAttribute('data-view');
            viewSections.forEach(view => view.classList.remove('active'));
            document.getElementById(targetView).classList.add('active');

            // Đóng menu nếu ở mobile
            if(window.innerWidth <= 600) toggleMobileMenu();

            // Nếu mở lịch, render lại lịch
            if(targetView === 'view-calendar') renderCalendar();
        });
    });

    // --- 2. LOGIC LỊCH (CALENDAR) ---
    const calendarGrid = document.getElementById('calendarGrid');
    const monthYearText = document.getElementById('calendarMonthYear');
    const btnToday = document.getElementById('btnToday');
    const notesOnDate = document.getElementById('notesOnDate');

    // Mảng giả lập các ngày có ghi chú trong tháng hiện tại (ví dụ ngày 5, 12, 18)
    const daysWithNotes = [5, 12, 18]; 

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth();
        const today = date.getDate();

        monthYearText.innerText = `Tháng ${month + 1}, ${year}`;

        const firstDayIndex = new Date(year, month, 1).getDay() || 7; // 1: T2, 7: CN
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Ô trống đầu tháng
        for(let x = 1; x < firstDayIndex; x++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.classList.add('cal-day', 'other-month');
            calendarGrid.appendChild(emptyDiv);
        }

        // Ngày trong tháng
        for(let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('cal-day');
            dayDiv.innerText = i;
            
            if(i === today) dayDiv.classList.add('today');
            
            // Vẽ chấm đỏ nếu ngày có ghi chú
            if(daysWithNotes.includes(i)) {
                const dot = document.createElement('div');
                dot.classList.add('cal-dot');
                dayDiv.appendChild(dot);
            }

            dayDiv.addEventListener('click', () => {
                document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
                dayDiv.classList.add('selected');
                
                if(daysWithNotes.includes(i)) {
                    notesOnDate.innerHTML = `<div class="note-card"><div class="note-title">Ghi chú ngày ${i}/${month+1}</div><div class="note-body">Đây là nội dung ghi chú mô phỏng...</div></div>`;
                } else {
                    notesOnDate.innerHTML = `<p style="color: var(--text-light); text-align: center; margin-top:20px;">Không có ghi chú nào trong ngày này.</p>`;
                }
            });

            calendarGrid.appendChild(dayDiv);
        }
    }

    btnToday.addEventListener('click', () => {
        renderCalendar();
        notesOnDate.innerHTML = `<p style="color: var(--text-light); text-align: center; margin-top: 20px;">Chọn một ngày để xem ghi chú</p>`;
    });


    // --- 3. LOGIC TAGS (LỌC GHI CHÚ) ---
    const tagItems = document.querySelectorAll('.tag-item');
    const filterMessage = document.getElementById('filterMessage');
    const currentTagFilter = document.getElementById('currentTagFilter');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const noteCards = document.querySelectorAll('#view-notes .note-card');

    tagItems.forEach(tagBtn => {
        tagBtn.addEventListener('click', () => {
            const selectedTag = tagBtn.getAttribute('data-tag');
            
            // Chuyển về màn hình Ghi chú
            navItems[0].click(); 

            // Hiện thanh báo đang lọc
            filterMessage.style.display = 'flex';
            currentTagFilter.innerText = selectedTag;

            // Lọc card
            noteCards.forEach(card => {
                const tagsStr = card.getAttribute('data-tags') || "";
                if(tagsStr.includes(selectedTag)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    clearFilterBtn.addEventListener('click', () => {
        filterMessage.style.display = 'none';
        noteCards.forEach(card => card.style.display = 'flex');
    });


    // --- 4. EDITOR (2 TRẠNG THÁI: READ VÀ EDIT) ---
    const fabBtn = document.getElementById('fabBtn');
    const noteEditor = document.getElementById('noteEditor');
    const editorBody = document.getElementById('editorBody');
    const closeEditorBtn = document.getElementById('closeEditorBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const editNoteModeBtn = document.getElementById('editNoteModeBtn');
    const wrapTextBtn = document.getElementById('wrapTextBtn');
    const colorPaletteBtn = document.getElementById('colorPaletteBtn');
    const colorPalettePopup = document.getElementById('colorPalettePopup');
    
    const editTitle = document.getElementById('editNoteTitle');
    const editTime = document.getElementById('editNoteTime');
    const editBody = document.getElementById('editNoteBody');

    // Mở bằng FAB -> Chế độ EDIT
    fabBtn.addEventListener('click', () => {
        resetEditor();
        setEditorMode('edit');
        editTime.innerText = "Tự động tạo thời gian...";
        noteEditor.classList.add('active');
        editTitle.focus();
    });

    // Mở bằng click thẻ ghi chú -> Chế độ READ
    noteCards.forEach(card => {
        card.addEventListener('click', function() {
            resetEditor();
            setEditorMode('read');
            
            editTitle.value = this.querySelector('.note-title').innerText;
            editBody.value = this.querySelector('.note-body').innerText;
            editorBody.style.backgroundColor = window.getComputedStyle(this).backgroundColor;
            editTime.innerText = "10:30, Hôm nay"; // Fake time
            
            noteEditor.classList.add('active');
        });
    });

    // Bấm nút Edit (Cây bút) -> Chuyển sang EDIT
    editNoteModeBtn.addEventListener('click', () => {
        setEditorMode('edit');
        editBody.focus();
    });

    // Đóng Editor
    closeEditorBtn.addEventListener('click', () => {
        noteEditor.classList.remove('active');
        colorPalettePopup.classList.remove('open');
    });

    // Lưu ghi chú
    saveNoteBtn.addEventListener('click', () => {
        const title = editTitle.value.trim();
        const body = editBody.value.trim();
        if (title || body) {
            const timeString = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
            editTime.innerText = timeString;
            
            alert("Lưu ghi chú thành công!");
            setEditorMode('read'); // Lưu xong chuyển về chế độ đọc
        } else {
            alert("Vui lòng nhập nội dung.");
        }
    });

    // Hàm đổi trạng thái UI của Editor
    function setEditorMode(mode) {
        if(mode === 'read') {
            noteEditor.classList.remove('edit-mode');
            noteEditor.classList.add('read-mode');
            editTitle.setAttribute('readonly', true);
            editBody.setAttribute('readonly', true);
        } else {
            noteEditor.classList.remove('read-mode');
            noteEditor.classList.add('edit-mode');
            editTitle.removeAttribute('readonly');
            editBody.removeAttribute('readonly');
        }
    }

    function resetEditor() {
        editTitle.value = '';
        editBody.value = '';
        editorBody.style.backgroundColor = '#ffffff';
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
        document.querySelector('.color-option.default').classList.add('active');
        colorPalettePopup.classList.remove('open');
    }

    // --- Các nút chức năng Edit ({} và Palette) ---
    wrapTextBtn.addEventListener('click', () => {
        const startPos = editBody.selectionStart;
        const endPos = editBody.selectionEnd;
        const selectedText = editBody.value.substring(startPos, endPos);
        if (selectedText) {
            const wrapped = `{${selectedText}}`;
            editBody.value = editBody.value.substring(0, startPos) + wrapped + editBody.value.substring(endPos);
            editBody.setSelectionRange(startPos, startPos + wrapped.length);
        } else {
            alert("Bôi đen chữ để tạo ngoặc {}.");
        }
    });

    colorPaletteBtn.addEventListener('click', () => colorPalettePopup.classList.toggle('open'));
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', function() {
            editorBody.style.backgroundColor = this.getAttribute('data-color');
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.getElementById('insertImageBtn').addEventListener('click', () => {
        alert("Chức năng chèn ảnh.");
    });
});
