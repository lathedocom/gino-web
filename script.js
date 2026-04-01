// =====================================================================
// KHAI BÁO BIẾN TOÀN CỤC ĐỂ QUẢN LÝ ĐỒNG BỘ
// =====================================================================
window.syncFileId = null;           // ID của file JSON trên Drive
window.globalNotesArray = [];       // Mảng chứa toàn bộ ghi chú hiện tại
window.currentEditingNoteId = null; // ID của ghi chú đang được mở (nếu = null nghĩa là đang tạo mới)

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
        document.querySelectorAll('.note-card').forEach(card => {
            const tags = card.getAttribute('data-tags');
            if(tags) tags.split(',').forEach(tag => allTags.add(tag.trim()));
        });

        const tagsContainer = document.getElementById('allTagsContainer');
        tagsContainer.innerHTML = '';
        allTags.forEach(tagText => {
            if(!tagText) return;
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.innerText = tagText;
            
            tagSpan.addEventListener('click', () => {
                navItems.forEach(nav => nav.classList.remove('active'));
                document.querySelector('[data-target="viewNotes"]').classList.add('active');
                views.forEach(view => view.style.display = view.id === 'viewNotes' ? 'block' : 'none');
                
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

    function setEditorMode(isEditing) {
        if (isEditing) {
            editNoteModeBtn.style.display = 'none';
            editModeToolbar.style.display = 'flex';
            editorBody.classList.remove('readonly-mode');
            newTagInput.style.display = 'block';
        } else {
            editNoteModeBtn.style.display = 'flex';
            editModeToolbar.style.display = 'none';
            editorBody.classList.add('readonly-mode');
            newTagInput.style.display = 'none';
        }
    }

    editNoteModeBtn.addEventListener('click', () => {
        setEditorMode(true);
        editBody.focus();
    });

    // Mở bằng FAB (+) -> Tạo mới -> Bật sẵn chế độ SỬA
    fabBtn.addEventListener('click', () => {
        resetEditor();
        window.currentEditingNoteId = null; // Xác nhận đây là tạo mới
        setEditorMode(true); 
        noteEditor.classList.add('active');
        editTitle.focus();
    });

    // Mở Ghi chú có sẵn (Logic chung cho cả ghi chú được sinh từ Drive)
    window.attachNoteClickEvent = function(card, noteData) {
        card.addEventListener('click', function() {
            resetEditor();
            window.currentEditingNoteId = noteData.id; // Ghi nhớ ID đang sửa
            
            // Điền dữ liệu cũ vào form
            editTitle.value = noteData.title || '';
            editBody.value = noteData.content || '';
            editorBody.style.backgroundColor = noteData.color || '#ffffff';
            
            if (noteData.tags && noteData.tags.length > 0) {
                newTagInput.value = noteData.tags.join(', ');
            }

            setEditorMode(false); // Chế độ ĐỌC
            noteEditor.classList.add('active');
        });
    }

    // Đóng Editor
    closeEditorBtn.addEventListener('click', () => {
        noteEditor.classList.remove('active');
        colorPalettePopup.classList.remove('open');
    });

    // Reset Editor
    function resetEditor() {
        editTitle.value = '';
        editBody.value = '';
        newTagInput.value = '';
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

    // =================================================================
    // NÚT LƯU & XỬ LÝ LOGIC LƯU LÊN DRIVE
    // =================================================================
    saveNoteBtn.addEventListener('click', async () => {
        if (!gapi.client.getToken()) {
            alert("Bạn cần bấm 'Đăng nhập Google' ở màn hình chính trước khi lưu!");
            return;
        }

        // Lấy dữ liệu từ giao diện
        const title = editTitle.value.trim();
        const content = editBody.value.trim();
        const color = editorBody.style.backgroundColor;
        const tags = newTagInput.value ? newTagInput.value.split(',').map(t => t.trim()).filter(t => t) : [];

        // Cập nhật mảng toàn cục
        if (!window.globalNotesArray) window.globalNotesArray = [];
        
        if (window.currentEditingNoteId) {
            // Trường hợp 1: Chỉnh sửa ghi chú cũ
            const index = window.globalNotesArray.findIndex(n => n.id === window.currentEditingNoteId);
            if (index !== -1) {
                window.globalNotesArray[index].title = title;
                window.globalNotesArray[index].content = content;
                window.globalNotesArray[index].color = color;
                window.globalNotesArray[index].tags = tags;
                window.globalNotesArray[index].updatedAt = new Date().getTime();
            }
        } else {
            // Trường hợp 2: Tạo ghi chú mới
            const newNote = {
                id: new Date().getTime(), // Dùng timestamp làm ID duy nhất
                title: title,
                content: content,
                color: color,
                tags: tags,
                updatedAt: new Date().getTime(),
                createdAt: new Date().getTime()
            };
            window.globalNotesArray.unshift(newNote); // Thêm lên đầu mảng
            window.currentEditingNoteId = newNote.id; // Gắn ID để lỡ bấm lưu tiếp thì nó hiểu là update
        }

        // Đổi Icon thành biểu tượng loading
        saveNoteBtn.innerHTML = '<i class="material-icons">sync</i>';
        
        // Gọi hàm gửi lên Google Drive
        const isSuccess = await window.saveNotesToDrive(window.globalNotesArray);
        
        // Trả lại Icon Save
        saveNoteBtn.innerHTML = '<i class="material-icons">save</i>';

        if (isSuccess) {
            setEditorMode(false); // Lưu xong chuyển sang chế độ đọc
            window.renderSyncedNotesToWeb(window.globalNotesArray); // Vẽ lại trang chủ
        }
    });
});


// =====================================================================
// API KẾT NỐI GOOGLE DRIVE SYNC (THƯ MỤC ẨN) - ĐÃ CÓ LƯU PHIÊN ĐĂNG NHẬP
// =====================================================================

const CLIENT_ID = '631532964907-hi703ubcopoqjmv0e5fn6ui3h2u2mi5b.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SYNC_FILE_NAME = 'ginonote_SyncData.json';

let tokenClient;
let gapiInited = false;
let gisInited = false;

window.gapiLoaded = function() {
    gapi.load('client', async () => {
        await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        gapiInited = true;
        maybeEnableAuthButton();
    });
};

window.gisLoaded = function() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', 
    });
    gisInited = true;
    maybeEnableAuthButton();
};

function maybeEnableAuthButton() {
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    const syncText = document.getElementById('syncText');

    if (gapiInited && gisInited && btnAuthGoogle) {
        // LUÔN GẮN SỰ KIỆN CLICK CHO NÚT (Dùng khi chưa đăng nhập hoặc token hết hạn)
        btnAuthGoogle.removeEventListener('click', handleAuthClick);
        btnAuthGoogle.addEventListener('click', handleAuthClick);

        // --- BƯỚC 1: KIỂM TRA TOKEN TRONG LOCAL STORAGE ---
        const savedToken = localStorage.getItem('gino_gdrive_token');
        const savedExpires = localStorage.getItem('gino_gdrive_expires');

        if (savedToken && savedExpires && Date.now() < parseInt(savedExpires)) {
            // Token cũ vẫn còn hạn -> KHÔI PHỤC PHIÊN ĐĂNG NHẬP
            gapi.client.setToken({ access_token: savedToken });
            
            syncText.innerText = "Đang tải dữ liệu...";
            btnAuthGoogle.classList.add('active-auth');
            
            // Tự động tải dữ liệu từ Drive xuống
            fetchNotesFromHiddenDrive();
        } else {
            // Không có Token hoặc Token đã hết hạn (sau 1 tiếng) -> Xóa dọn dẹp
            clearDriveSession();
        }
    }
}

function handleAuthClick(e) {
    e.preventDefault();
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error("Lỗi xác thực:", resp);
            return;
        }

        // --- BƯỚC 2: LƯU TOKEN MỚI VÀO LOCAL STORAGE ---
        // Token Google cấp thường sống được 3599 giây (1 tiếng)
        const expiresAt = Date.now() + (resp.expires_in * 1000);
        localStorage.setItem('gino_gdrive_token', resp.access_token);
        localStorage.setItem('gino_gdrive_expires', expiresAt.toString());

        document.getElementById('syncText').innerText = "Đang đồng bộ...";
        document.getElementById('btnAuthGoogle').classList.add('active-auth');
        await fetchNotesFromHiddenDrive();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

// Hàm dọn dẹp phiên (Dùng khi hết hạn hoặc lỗi xác thực)
function clearDriveSession() {
    localStorage.removeItem('gino_gdrive_token');
    localStorage.removeItem('gino_gdrive_expires');
    gapi.client.setToken(null);
    
    const syncText = document.getElementById('syncText');
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    if (syncText) syncText.innerText = "Đăng nhập Google";
    if (btnAuthGoogle) btnAuthGoogle.classList.remove('active-auth');
}

// Hàm xử lý lỗi 401 (Hết hạn Token khi đang thao tác)
function handleDriveApiError(err) {
    console.error("Lỗi Google Drive API:", err);
    if (err.status === 401) {
        alert("Phiên đăng nhập Google đã hết hạn. Vui lòng bấm 'Đăng nhập Google' lại.");
        clearDriveSession();
    } else {
        const syncText = document.getElementById('syncText');
        if (syncText) syncText.innerText = "Lỗi đồng bộ";
    }
}

// Hàm tải dữ liệu XUỐNG
async function fetchNotesFromHiddenDrive() {
    try {
        let response = await gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            q: `name = '${SYNC_FILE_NAME}' and trashed = false`,
            fields: 'files(id, name)'
        });

        const files = response.result.files;
        if (!files || files.length === 0) {
            document.getElementById('syncText').innerText = "Sẵn sàng lưu";
            window.syncFileId = null;
            window.globalNotesArray = [];
            window.renderSyncedNotesToWeb(window.globalNotesArray);
            return;
        }

        window.syncFileId = files[0].id;
        let fileContent = await gapi.client.drive.files.get({ fileId: window.syncFileId, alt: 'media' });
        
        window.globalNotesArray = typeof fileContent.body === 'string' 
                            ? JSON.parse(fileContent.body) 
                            : fileContent.result;
        
        document.getElementById('syncText').innerText = "Đã đồng bộ";
        window.renderSyncedNotesToWeb(window.globalNotesArray);

    } catch (err) {
        handleDriveApiError(err);
    }
}

// Hàm tải dữ liệu LÊN (Ghi đè hoặc Tạo mới)
window.saveNotesToDrive = async function(notesArray) {
    const syncText = document.getElementById('syncText');
    syncText.innerText = "Đang tải lên...";
    
    const tokenObj = gapi.client.getToken();
    if (!tokenObj) {
        clearDriveSession();
        return false;
    }

    const token = tokenObj.access_token;
    const fileContent = JSON.stringify(notesArray);

    try {
        if (window.syncFileId) {
            const url = 'https://www.googleapis.com/upload/drive/v3/files/' + window.syncFileId + '?uploadType=media';
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: fileContent
            });
            if (!response.ok) {
                if (response.status === 401) throw { status: 401 };
                throw new Error("Lỗi khi update file");
            }
        } else {
            const metadata = { name: SYNC_FILE_NAME, parents: ['appDataFolder'] };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([fileContent], { type: 'application/json' }));

            const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: form
            });
            if (!response.ok) {
                if (response.status === 401) throw { status: 401 };
                throw new Error("Lỗi khi tạo file mới");
            }
            
            const result = await response.json();
            window.syncFileId = result.id; 
        }

        syncText.innerText = "Đã đồng bộ";
        return true;
    } catch (err) {
        handleDriveApiError(err);
        return false;
    }
}

// Hàm vẽ giao diện
window.renderSyncedNotesToWeb = function(notesArray) {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;
    notesGrid.innerHTML = '';

    notesArray.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.style.backgroundColor = note.color || '#ffffff';

        let tagsHtml = '';
        let tagsString = '';
        if (note.tags && Array.isArray(note.tags) && note.tags.length > 0) {
            tagsString = note.tags.join(',');
            note.tags.forEach(tag => tagsHtml += `<span class="tag">${tag}</span>`);
        }
        card.setAttribute('data-tags', tagsString);

        card.innerHTML = `
            <div class="note-title">${note.title || 'Không có tiêu đề'}</div>
            <div class="note-body">${note.content || ''}</div>
            <div class="note-tags">${tagsHtml}</div>
        `;

        if(window.attachNoteClickEvent) {
            window.attachNoteClickEvent(card, note);
        }
        notesGrid.appendChild(card);
    });
}
