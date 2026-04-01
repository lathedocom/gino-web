// =====================================================================
// KHAI BÁO BIẾN TOÀN CỤC
// =====================================================================
window.syncFileId = null;           
window.globalNotesArray = [];       
window.currentEditingNoteId = null; 

// Biến kiểm soát đồng bộ thời gian (Tránh Race Condition)
let isDOMReady = false;
let gapiInited = false;
let gisInited = false;

// =====================================================================
// PHẦN 1: KHỞI TẠO GIAO DIỆN (UI) KHI TRANG TẢI XONG
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    isDOMReady = true;

    // --- XỬ LÝ THANH ĐIỀU HƯỚNG & MENU ---
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');
    
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });

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

    // Vẽ lịch giả lập
    const grid = document.querySelector('.calendar-grid');
    if (grid) {
        grid.querySelectorAll('.cal-day').forEach(day => day.remove());
        for(let i = 1; i <= 30; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'cal-day';
            dayDiv.innerText = i;
            if (i === 15) dayDiv.classList.add('today'); 
            grid.appendChild(dayDiv);
        }
    }

    // --- XỬ LÝ EDITOR (TRÌNH SOẠN THẢO) ---
    const noteEditor = document.getElementById('noteEditor');
    const editorBody = document.getElementById('editorBody');
    const editTitle = document.getElementById('editNoteTitle');
    const editBody = document.getElementById('editNoteBody');
    const newTagInput = document.getElementById('newTagInput');
    const colorPalettePopup = document.getElementById('colorPalettePopup');
    const editNoteModeBtn = document.getElementById('editNoteModeBtn');
    const editModeToolbar = document.getElementById('editModeToolbar');

    // Hàm đổi giữa chế độ Xem và Sửa
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

    // Hàm gọi khi muốn mở 1 ghi chú (cũ hoặc tạo mới)
    window.openNoteInEditor = function(noteData) {
        // Reset sạch sẽ editor
        editTitle.value = '';
        editBody.value = '';
        newTagInput.value = '';
        editorBody.style.backgroundColor = '#ffffff';
        colorPalettePopup.classList.remove('open');
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
        document.querySelector('.color-option.default').classList.add('active');

        if (noteData) { // MỞ GHI CHÚ ĐÃ CÓ
            window.currentEditingNoteId = noteData.id;
            // Bao phủ các trường hợp tên biến json từ Android
            editTitle.value = noteData.title || noteData.memoTitle || '';
            editBody.value = noteData.content || noteData.memoContent || noteData.text || '';
            
            // Xử lý màu sắc
            if (noteData.color || noteData.bgColor) {
                const hexColor = noteData.color || noteData.bgColor;
                editorBody.style.backgroundColor = hexColor;
                document.querySelectorAll('.color-option').forEach(opt => {
                    if(opt.getAttribute('data-color') === hexColor) opt.classList.add('active');
                });
            }

            // Xử lý mảng Tags
            if (noteData.tags && Array.isArray(noteData.tags)) {
                newTagInput.value = noteData.tags.join(', ');
            } else if (typeof noteData.tags === 'string') {
                newTagInput.value = noteData.tags;
            }

            setEditorMode(false); // Mode ĐỌC
        } else { // TẠO GHI CHÚ MỚI
            window.currentEditingNoteId = null;
            setEditorMode(true); // Mode SỬA
        }

        noteEditor.classList.add('active');
    };

    // Gắn sự kiện các nút cơ bản trong Editor
    document.getElementById('fabBtn').addEventListener('click', () => {
        window.openNoteInEditor(null); // Tạo mới
        editTitle.focus();
    });

    editNoteModeBtn.addEventListener('click', () => {
        setEditorMode(true);
        editBody.focus();
    });

    document.getElementById('closeEditorBtn').addEventListener('click', () => {
        noteEditor.classList.remove('active');
        colorPalettePopup.classList.remove('open');
    });

    document.getElementById('wrapTextBtn').addEventListener('click', () => {
        const startPos = editBody.selectionStart;
        const endPos = editBody.selectionEnd;
        const selectedText = editBody.value.substring(startPos, endPos);
        if (selectedText) {
            editBody.value = editBody.value.substring(0, startPos) + `{${selectedText}}` + editBody.value.substring(endPos);
        }
    });

    document.getElementById('colorPaletteBtn').addEventListener('click', () => {
        colorPalettePopup.classList.toggle('open');
    });

    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            editorBody.style.backgroundColor = this.getAttribute('data-color');
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // LƯU GHI CHÚ & ĐỒNG BỘ LÊN DRIVE
    document.getElementById('saveNoteBtn').addEventListener('click', async () => {
        if (!gapi.client.getToken()) {
            alert("Bạn cần bấm 'Đăng nhập Google' ở góc trên để có thể lưu dữ liệu!");
            return;
        }

        const title = editTitle.value.trim();
        const content = editBody.value.trim();
        const color = editorBody.style.backgroundColor;
        const tags = newTagInput.value ? newTagInput.value.split(',').map(t => t.trim()).filter(t => t) : [];

        if (!window.globalNotesArray) window.globalNotesArray = [];
        
        if (window.currentEditingNoteId) {
            // Cập nhật
            const index = window.globalNotesArray.findIndex(n => n.id === window.currentEditingNoteId);
            if (index !== -1) {
                window.globalNotesArray[index].title = title;
                window.globalNotesArray[index].content = content;
                window.globalNotesArray[index].color = color;
                window.globalNotesArray[index].tags = tags;
                window.globalNotesArray[index].updatedAt = new Date().getTime();
            }
        } else {
            // Tạo mới
            const newNote = {
                id: new Date().getTime(),
                title: title,
                content: content,
                color: color,
                tags: tags,
                updatedAt: new Date().getTime(),
                createdAt: new Date().getTime()
            };
            window.globalNotesArray.unshift(newNote);
            window.currentEditingNoteId = newNote.id; 
        }

        const saveBtn = document.getElementById('saveNoteBtn');
        saveBtn.innerHTML = '<i class="material-icons">sync</i>';
        
        const isSuccess = await window.saveNotesToDrive(window.globalNotesArray);
        
        saveBtn.innerHTML = '<i class="material-icons">save</i>';

        if (isSuccess) {
            setEditorMode(false); 
            window.renderSyncedNotesToWeb(window.globalNotesArray); 
        }
    });

    // Bắt đầu kiểm tra và tải dữ liệu nếu Google API đã tải xong
    checkAndFetchDriveData();
});


// =====================================================================
// PHẦN 2: GOOGLE DRIVE API & ĐỒNG BỘ
// =====================================================================

const CLIENT_ID = '631532964907-hi703ubcopoqjmv0e5fn6ui3h2u2mi5b.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SYNC_FILE_NAME = 'ginonote_SyncData.json';

window.gapiLoaded = function() {
    gapi.load('client', async () => {
        await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        gapiInited = true;
        checkAndFetchDriveData(); // Kích hoạt kiểm tra
    });
};

window.gisLoaded = function() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', 
    });
    gisInited = true;
    checkAndFetchDriveData(); // Kích hoạt kiểm tra
};

// Hàm điều phối trung tâm: Chỉ chạy khi CẢ HTML VÀ GOOGLE đều đã sẵn sàng
function checkAndFetchDriveData() {
    if (!isDOMReady || !gapiInited || !gisInited) return;

    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    const syncText = document.getElementById('syncText');
    
    // Gắn sự kiện click
    btnAuthGoogle.removeEventListener('click', handleAuthClick);
    btnAuthGoogle.addEventListener('click', handleAuthClick);

    // Kiểm tra phiên đăng nhập trong LocalStorage
    const savedToken = localStorage.getItem('gino_gdrive_token');
    const savedExpires = localStorage.getItem('gino_gdrive_expires');

    if (savedToken && savedExpires && Date.now() < parseInt(savedExpires)) {
        gapi.client.setToken({ access_token: savedToken });
        syncText.innerText = "Đang tải dữ liệu...";
        btnAuthGoogle.classList.add('active-auth');
        fetchNotesFromHiddenDrive();
    } else {
        clearDriveSession();
    }
}

function handleAuthClick(e) {
    e.preventDefault();
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) return;

        // Lưu Token 1 tiếng vào LocalStorage
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

function clearDriveSession() {
    localStorage.removeItem('gino_gdrive_token');
    localStorage.removeItem('gino_gdrive_expires');
    if (gapi && gapi.client) gapi.client.setToken(null);
    
    const syncText = document.getElementById('syncText');
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    if (syncText) syncText.innerText = "Đăng nhập Google";
    if (btnAuthGoogle) btnAuthGoogle.classList.remove('active-auth');
}

function handleDriveApiError(err) {
    if (err.status === 401) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng bấm 'Đăng nhập Google' lại.");
        clearDriveSession();
    } else {
        document.getElementById('syncText').innerText = "Lỗi đồng bộ";
    }
}

// TẢI FILE TỪ DRIVE XUỐNG
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

// ĐẨY FILE LÊN DRIVE
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
                throw new Error("Lỗi update file");
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
                throw new Error("Lỗi tạo file mới");
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

// =====================================================================
// PHẦN 3: VẼ GIAO DIỆN TỪ DỮ LIỆU
// =====================================================================
window.renderSyncedNotesToWeb = function(notesArray) {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;
    
    // Xóa sạch ghi chú mẫu
    notesGrid.innerHTML = '';

    notesArray.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.style.backgroundColor = note.color || note.bgColor || '#ffffff';

        let tagsHtml = '';
        let tagsString = '';
        let tagsArray = [];
        
        // Chuẩn hóa định dạng tags từ Android 
        if (note.tags && Array.isArray(note.tags)) {
            tagsArray = note.tags;
        } else if (typeof note.tags === 'string') {
            tagsArray = note.tags.split(',').map(t => t.trim());
        }

        if (tagsArray.length > 0) {
            tagsString = tagsArray.join(',');
            tagsArray.forEach(tag => {
                if(tag) tagsHtml += `<span class="tag">${tag}</span>`;
            });
        }

        card.setAttribute('data-tags', tagsString);

        card.innerHTML = `
            <div class="note-title">${note.title || note.memoTitle || 'Không có tiêu đề'}</div>
            <div class="note-body">${note.content || note.memoContent || note.text || ''}</div>
            <div class="note-tags">${tagsHtml}</div>
        `;

        // Gắn sự kiện click mở Editor ĐÃ SỬA LỖI
        card.addEventListener('click', () => {
            window.openNoteInEditor(note);
        });

        notesGrid.appendChild(card);
    });

    // Cập nhật lại thanh menu Tags bên trái
    renderTagsSidebar();
}

function renderTagsSidebar() {
    const allTags = new Set();
    document.querySelectorAll('.note-card').forEach(card => {
        const tags = card.getAttribute('data-tags');
        if(tags) tags.split(',').forEach(tag => {
            if(tag.trim()) allTags.add(tag.trim());
        });
    });

    const tagsContainer = document.getElementById('allTagsContainer');
    if(!tagsContainer) return;
    tagsContainer.innerHTML = '';
    
    allTags.forEach(tagText => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.innerText = tagText;
        
        tagSpan.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelector('[data-target="viewNotes"]').classList.add('active');
            
            document.querySelectorAll('.view-section').forEach(view => {
                view.style.display = view.id === 'viewNotes' ? 'block' : 'none';
            });
            
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
