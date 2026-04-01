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

    // Chuyển đổi giữa các màn hình
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            sidebar.classList.remove('mobile-open');

            const targetId = this.getAttribute('data-target');
            views.forEach(view => {
                view.style.display = view.id === targetId ? 'block' : 'none';
            });

            if (targetId === 'viewNotes') {
                document.querySelectorAll('.note-card').forEach(card => card.style.display = 'flex');
            }
        });
    });

    // --- LOGIC LỊCH VÀ TAGS (Giữ nguyên giao diện mấu) ---
    function renderCalendar() {
        const grid = document.querySelector('.calendar-grid');
        const days = grid.querySelectorAll('.cal-day');
        days.forEach(day => day.remove());
        for(let i = 1; i <= 30; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'cal-day';
            dayDiv.innerText = i;
            if (i === 15) dayDiv.classList.add('today'); 
            grid.appendChild(dayDiv);
        }
    }
    renderCalendar();

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

    // Bấm nút Dấu cộng (+) -> Chế độ Tạo mới
    fabBtn.addEventListener('click', () => {
        resetEditor();
        window.currentEditingNoteId = null; // Xác nhận đây là tạo mới
        setEditorMode(true); 
        noteEditor.classList.add('active');
        editTitle.focus();
    });

    // Mở Ghi chú có sẵn (Sẽ được gọi tự động khi Render ghi chú từ Drive)
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

    closeEditorBtn.addEventListener('click', () => {
        noteEditor.classList.remove('active');
        colorPalettePopup.classList.remove('open');
    });

    function resetEditor() {
        editTitle.value = '';
        editBody.value = '';
        newTagInput.value = '';
        editorBody.style.backgroundColor = '#ffffff';
        colorPalettePopup.classList.remove('open');
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
        document.querySelector('.color-option.default').classList.add('active');
    }

    // Các hiệu ứng Toolbar
    document.getElementById('wrapTextBtn').addEventListener('click', () => {
        const start = editBody.selectionStart;
        const end = editBody.selectionEnd;
        const text = editBody.value.substring(start, end);
        if (text) {
            editBody.value = editBody.value.substring(0, start) + `{${text}}` + editBody.value.substring(end);
        }
    });

    document.getElementById('colorPaletteBtn').addEventListener('click', () => colorPalettePopup.classList.toggle('open'));

    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            editorBody.style.backgroundColor = this.getAttribute('data-color');
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
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
// API KẾT NỐI GOOGLE DRIVE SYNC (THƯ MỤC ẨN)
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
    if (gapiInited && gisInited && btnAuthGoogle) {
        document.getElementById('syncText').innerText = "Đăng nhập Google";
        btnAuthGoogle.classList.remove('active-auth');
        btnAuthGoogle.addEventListener('click', handleAuthClick);
    }
}

function handleAuthClick(e) {
    e.preventDefault();
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) return;
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
            alert('Chưa có dữ liệu trên Drive. Tạo ghi chú và bấm Lưu để khởi tạo đồng bộ nhé!');
            document.getElementById('syncText').innerText = "Sẵn sàng lưu";
            window.syncFileId = null;
            window.globalNotesArray = [];
            return;
        }

        window.syncFileId = files[0].id; // Nhớ File ID để lát nữa ghi đè
        let fileContent = await gapi.client.drive.files.get({ fileId: window.syncFileId, alt: 'media' });
        
        window.globalNotesArray = typeof fileContent.body === 'string' 
                            ? JSON.parse(fileContent.body) 
                            : fileContent.result;
        
        document.getElementById('syncText').innerText = "Đã đồng bộ";
        window.renderSyncedNotesToWeb(window.globalNotesArray);

    } catch (err) {
        console.error(err);
        document.getElementById('syncText').innerText = "Lỗi đồng bộ";
    }
}

// Hàm tải dữ liệu LÊN (Ghi đè hoặc Tạo mới)
window.saveNotesToDrive = async function(notesArray) {
    const syncText = document.getElementById('syncText');
    syncText.innerText = "Đang tải lên...";
    
    const token = gapi.client.getToken().access_token;
    const fileContent = JSON.stringify(notesArray);

    try {
        if (window.syncFileId) {
            // Đã có file -> UPDATE (PATCH Request)
            const url = 'https://www.googleapis.com/upload/drive/v3/files/' + window.syncFileId + '?uploadType=media';
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: fileContent
            });
            if (!response.ok) throw new Error("Lỗi khi update file");
        } else {
            // Chưa có file -> TẠO MỚI (Multipart POST Request vào appDataFolder)
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
            if (!response.ok) throw new Error("Lỗi khi tạo file mới");
            
            const result = await response.json();
            window.syncFileId = result.id; // Lưu lại ID mới tạo
        }

        syncText.innerText = "Đã đồng bộ";
        return true;
    } catch (err) {
        console.error("Lỗi khi lưu lên Drive:", err);
        syncText.innerText = "Lỗi lưu file";
        alert("Đã xảy ra lỗi khi đồng bộ lên Google Drive!");
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
            window.attachNoteClickEvent(card, note); // Gắn sự kiện để click vào mở đúng note này lên
        }
        notesGrid.appendChild(card);
    });
}
