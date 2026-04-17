// =====================================================================
// KHAI BÁO BIẾN TOÀN CỤC & TỐI ƯU BỘ NHỚ
// =====================================================================
window.currentEditingNoteId = null;
window.globalImagesMap = {}; // Lưu trữ Blob thực tế: { "uuid.jpg": Blob }
window.imageBlobUrls = {};   // Lưu Blob URL để hiển thị: { "uuid.jpg": "blob:http..." }
window.currentEditingImages = []; 
window.lastSyncTime = parseInt(localStorage.getItem('gino_last_sync_time') || '0');
window.pendingUploadImages = [];

let isDOMReady = false;
let gapiInited = false;
let gisInited = false;
let currentCalendarDate = new Date();
let selectedFilterDate = null;
let selectedFilterTag = null;

// [TỐI ƯU 4]: Lưu cache toàn bộ dữ liệu vào RAM sau lần quét DB đầu tiên
// Các hàm Calendar/Tags sẽ chỉ filter trên RAM, không gọi xuống Dexie nữa.
window.globalNotesArray = []; 

// =====================================================================
// KHỞI TẠO DEXIE.JS DATABASE
// =====================================================================
const db = new Dexie('GinoNoteDB');
db.version(1).stores({
    notes: 'id, updatedAt, syncStatus', 
    images: 'fileName, syncStatus',
    settings: 'key'
});

// Hàm tạo UUID
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// [TỐI ƯU 2]: Quản lý Blob URL để tránh Memory Leak
async function getImageUrlSafe(fileName) {
    if (window.imageBlobUrls[fileName]) {
        return window.imageBlobUrls[fileName];
    }
    const imageRecord = await db.images.get(fileName);
    if (imageRecord && imageRecord.blob) {
        const url = URL.createObjectURL(imageRecord.blob);
        window.imageBlobUrls[fileName] = url;
        return url;
    }
    return null;
}

// CSS Fix
const styleFix = document.createElement('style');
styleFix.innerHTML = `
    .editor-body { display: flex; flex-direction: column; height: calc(100vh - 70px) !important; overflow-y: auto !important; }
    .editor-textarea { flex-grow: 1; min-height: 50vh; overflow-y: auto !important; resize: none; padding-bottom: 50px; }
    .note-editor-overlay { overflow: hidden !important; }
`;
document.head.appendChild(styleFix);


// =====================================================================
// TÍNH NĂNG LỊCH (CALENDAR) VÀ TAGS (TỐI ƯU DÙNG RAM CACHE)
// =====================================================================
function initCalendar() {
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendarView();
    });
    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendarView();
    });
    document.getElementById('todayBtn').addEventListener('click', () => {
        currentCalendarDate = new Date();
        selectedFilterDate = null;
        renderCalendarView();
        window.renderSyncedNotesToWeb(); 
    });
}

function renderCalendarView() {
    const grid = document.querySelector('.calendar-grid');
    const monthYearText = document.getElementById('calendarMonthYear');
    if (!grid) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    monthYearText.innerText = `Tháng ${month + 1}, ${year}`;
    
    const dayNames = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    dayNames.forEach(name => grid.appendChild(name));
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    // Sử dụng globalNotesArray thay vì query Dexie
    const daysWithNotes = new Set();
    window.globalNotesArray.forEach(note => {
        if (note.isDeleted || note.is_deleted === 1) return; 
        const noteDate = new Date(note.updatedAt || note.createdAt);
        if (noteDate.getFullYear() === year && noteDate.getMonth() === month) {
            daysWithNotes.add(noteDate.getDate());
        }
    });

    const today = new Date();
    for (let i = 0; i < startOffset; i++) {
        grid.appendChild(document.createElement('div'));
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';
        dayDiv.innerText = day;
        
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayDiv.classList.add('today');
        }
        if (selectedFilterDate && selectedFilterDate.getFullYear() === year &&
            selectedFilterDate.getMonth() === month && selectedFilterDate.getDate() === day) {
            dayDiv.classList.add('selected');
        }
        if (daysWithNotes.has(day)) {
            const dot = document.createElement('div');
            dot.className = 'note-dot';
            dayDiv.appendChild(dot);
        }
        
        dayDiv.addEventListener('click', () => {
            selectedFilterDate = new Date(year, month, day);
            selectedFilterTag = null;
            renderCalendarView();
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelector('[data-target="viewNotes"]').classList.add('active');
            document.querySelectorAll('.view-section').forEach(view => {
                view.style.display = view.id === 'viewNotes' ? 'block' : 'none';
            });
            window.renderSyncedNotesToWeb();
        });
        grid.appendChild(dayDiv);
    }
}

function renderTagsSidebar() {
    const tagCountMap = {};
    window.globalNotesArray.forEach(note => {
        if (note.isDeleted || note.is_deleted === 1) return;
        let tagsArray = extractTagsFromNote(note);
        tagsArray.forEach(tag => {
            if (tag) tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
        });
    });

    const tagsContainer = document.getElementById('allTagsContainer');
    if(!tagsContainer) return;
    tagsContainer.innerHTML = '';
    
    let savedOrder = [];
    try {
        const orderStr = localStorage.getItem('gino_tag_order');
        if (orderStr) savedOrder = JSON.parse(orderStr);
    } catch(e) {}

    const sortedTags = Object.keys(tagCountMap).sort((a, b) => {
        const indexA = savedOrder.indexOf(a);
        const indexB = savedOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return tagCountMap[b] - tagCountMap[a];
        else if (indexA === -1) return 1;
        else if (indexB === -1) return -1;
        return indexA - indexB;
    });

    localStorage.setItem('gino_tag_order', JSON.stringify(sortedTags));
    
    sortedTags.forEach(tagText => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.innerText = `${tagText} (${tagCountMap[tagText]})`;
        tagSpan.addEventListener('click', () => {
            selectedFilterTag = tagText;
            selectedFilterDate = null;
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelector('[data-target="viewNotes"]').classList.add('active');
            document.querySelectorAll('.view-section').forEach(view => {
                view.style.display = view.id === 'viewNotes' ? 'block' : 'none';
            });
            window.renderSyncedNotesToWeb();
        });
        tagsContainer.appendChild(tagSpan);
    });
}

// Helpers đồng bộ JSON format với Android App
function extractTagsFromNote(note) {
    let tagsArray = [];
    if (note.tags) {
        try {
            let parsed = JSON.parse(note.tags);
            if (Array.isArray(parsed)) tagsArray = parsed;
            else tagsArray = note.tags.split(',').map(t => t.trim());
        } catch(e) {
            tagsArray = typeof note.tags === 'string' ? note.tags.split(',').map(t => t.trim()) : [];
        }
    }
    return tagsArray;
}

function extractImageNamesFromNote(note) {
    let imageNames = [];
    const rawPaths = note.imagePaths || note.images;
    if (rawPaths) {
        try {
            let parsed = JSON.parse(rawPaths);
            if (Array.isArray(parsed)) {
                // Tương thích Android: Chỉ lấy fileName từ path
                imageNames = parsed.map(path => path.split('/').pop().split('\\').pop());
            }
        } catch(e) {}
    }
    return imageNames;
}


// =====================================================================
// PHẦN 1: KHỞI TẠO GIAO DIỆN (UI) VÀ EDITOR
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    isDOMReady = true;
    
    // --- ĐIỀU HƯỚNG ---
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');
    
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            sidebar.classList.remove('mobile-open');
            const targetId = this.getAttribute('data-target');
            if(targetId === 'viewNotes') {
                selectedFilterDate = null;
                selectedFilterTag = null;
                window.renderSyncedNotesToWeb();
            }
            views.forEach(view => view.style.display = view.id === targetId ? 'block' : 'none');
        });
    });

    // --- EDITOR ---
    const noteEditor = document.getElementById('noteEditor');
    const editorBody = document.getElementById('editorBody');
    const editTitle = document.getElementById('editNoteTitle');
    const editBody = document.getElementById('editNoteBody');
    const newTagInput = document.getElementById('newTagInput');
    const colorPalettePopup = document.getElementById('colorPalettePopup');
    const editNoteModeBtn = document.getElementById('editNoteModeBtn');
    const editModeToolbar = document.getElementById('editModeToolbar');
    
    function setEditorMode(isEditing) {
        if (isEditing) {
            editNoteModeBtn.style.display = 'none';
            editModeToolbar.style.display = 'flex';
            editorBody.classList.remove('readonly-mode');
            newTagInput.style.display = 'block';
            document.querySelectorAll('.image-remove-btn').forEach(b => b.style.display = 'flex');
        } else {
            editNoteModeBtn.style.display = 'flex';
            editModeToolbar.style.display = 'none';
            editorBody.classList.add('readonly-mode');
            newTagInput.style.display = 'none';
            document.querySelectorAll('.image-remove-btn').forEach(b => b.style.display = 'none');
        }
    }
    
    window.openNoteInEditor = async function(noteData) {
        editTitle.value = '';
        editBody.value = '';
        newTagInput.value = '';
        editorBody.style.backgroundColor = '#ffffff';
        colorPalettePopup.classList.remove('open');
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
        document.querySelector('.color-option.default').classList.add('active');
        window.currentEditingImages = [];
        window.currentRawNoteData = null; // Lưu bản gốc để không mất FSRS data

        if (noteData) {
            window.currentEditingNoteId = noteData.id;
            window.currentRawNoteData = noteData; // Bảo lưu syncHistories & lastReviewAt
            editTitle.value = noteData.title || noteData.memoTitle || '';
            editBody.value = noteData.content || noteData.memoContent || noteData.text || '';
            
            if (noteData.color || noteData.bgColor) {
                const hexColor = noteData.color || noteData.bgColor;
                editorBody.style.backgroundColor = hexColor;
                document.querySelectorAll('.color-option').forEach(opt => {
                    if(opt.getAttribute('data-color') === hexColor) opt.classList.add('active');
                });
            }
            
            const tagsArray = extractTagsFromNote(noteData);
            newTagInput.value = tagsArray.join(', ');
            
            // [TỐI ƯU 1]: Quét ảnh dựa trên JSON Array, không dùng chuỗi includes()
            const imageNames = extractImageNamesFromNote(noteData);
            for (let rawFileName of imageNames) {
                let localUrl = await getImageUrlSafe(rawFileName);
                if (localUrl) {
                    window.currentEditingImages.push({
                        fileName: rawFileName,
                        url: localUrl
                    });
                }
            }
            
            renderEditorImages();
            setEditorMode(false);
        } else {
            window.currentEditingNoteId = null;
            renderEditorImages();
            setEditorMode(true);
        }
        noteEditor.classList.add('active');
    };
    
    function renderEditorImages() {
        let imageArea = document.getElementById('editorImageArea');
        if (!imageArea) {
            imageArea = document.createElement('div');
            imageArea.id = 'editorImageArea';
            imageArea.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0; margin-bottom: 10px; border-bottom: 1px solid #eee; flex-shrink: 0;';
            const tagsArea = document.getElementById('editorTagsArea');
            tagsArea.parentNode.insertBefore(imageArea, tagsArea.nextSibling);
        }
        imageArea.innerHTML = '';
        if (window.currentEditingImages.length === 0) {
            imageArea.style.display = 'none';
            return;
        }
        imageArea.style.display = 'flex';
        window.currentEditingImages.forEach((imgObj, index) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position: relative; width: 80px; height: 80px; border-radius: 4px; overflow: hidden; border: 1px solid #ddd;';
            const img = document.createElement('img');
            img.src = imgObj.url;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'image-remove-btn';
            removeBtn.innerHTML = '<i class="material-icons" style="font-size: 16px;">close</i>';
            removeBtn.style.cssText = 'position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; cursor: pointer; display: none; align-items: center; justify-content: center; padding: 0;';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.currentEditingImages.splice(index, 1);
                renderEditorImages();
            });
            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            imageArea.appendChild(wrapper);
        });
        const isEditing = editModeToolbar.style.display === 'flex';
        document.querySelectorAll('.image-remove-btn').forEach(b => b.style.display = isEditing ? 'flex' : 'none');
    }
    
    document.getElementById('fabBtn').addEventListener('click', () => { window.openNoteInEditor(null); editTitle.focus(); });
    editNoteModeBtn.addEventListener('click', () => { setEditorMode(true); editBody.focus(); });
    document.getElementById('closeEditorBtn').addEventListener('click', () => { 
        noteEditor.classList.remove('active'); 
        colorPalettePopup.classList.remove('open'); 
    });
    
    // --- CHỌN ẢNH VÀ TẠO UUID CHO WEB ---
    const insertImageBtn = document.getElementById('insertImageBtn');
    const hiddenImageInput = document.getElementById('hiddenImageInput');
    insertImageBtn.addEventListener('click', () => hiddenImageInput.click());
    hiddenImageInput.addEventListener('change', async function(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            alert('Chỉ được chọn hình ảnh.');
            return;
        }
        const extension = file.name.split('.').pop() || 'jpg';
        const uniqueFileName = `${generateUUID()}.${extension}`;
        
        const blob = new Blob([file], { type: file.type });
        const blobUrl = URL.createObjectURL(blob);
        
        await db.images.put({
            fileName: uniqueFileName,
            blob: blob,
            syncStatus: 'pending' 
        });
        
        window.currentEditingImages.push({
            fileName: uniqueFileName,
            url: blobUrl,
            blob: blob,
            isNew: true
        });
        renderEditorImages();
        hiddenImageInput.value = '';
    });
    
    document.getElementById('wrapTextBtn').addEventListener('click', () => {
        const startPos = editBody.selectionStart;
        const endPos = editBody.selectionEnd;
        const selectedText = editBody.value.substring(startPos, endPos);
        if (selectedText) editBody.value = editBody.value.substring(0, startPos) + `{${selectedText}}` + editBody.value.substring(endPos);
    });
    
    document.getElementById('colorPaletteBtn').addEventListener('click', () => colorPalettePopup.classList.toggle('open'));
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            editorBody.style.backgroundColor = this.getAttribute('data-color');
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Nút Lưu (Chịu trách nhiệm đồng bộ trực tiếp)
    document.getElementById('saveNoteBtn').addEventListener('click', async () => {
        const title = editTitle.value.trim();
        const content = editBody.value.trim();
        const color = editorBody.style.backgroundColor;
        const tags = newTagInput.value ? newTagInput.value.split(',').map(t => t.trim()).filter(t => t) : [];
        const finalFileNames = window.currentEditingImages.map(imgObj => imgObj.fileName);
        
        let noteData = window.currentRawNoteData ? { ...window.currentRawNoteData } : {};
        noteData.id = window.currentEditingNoteId || new Date().getTime();
        noteData.title = title;
        noteData.content = content;
        noteData.color = color;
        noteData.tags = JSON.stringify(tags);
        noteData.imagePaths = JSON.stringify(finalFileNames);
        noteData.updatedAt = new Date().getTime();
        noteData.isDeleted = false;
        noteData.syncStatus = 'pending';
        
        if (!window.currentEditingNoteId) {
            noteData.createdAt = noteData.updatedAt;
        }

        await db.notes.put(noteData);
        
        window.currentEditingImages.forEach(imgObj => {
            if (imgObj.isNew) {
                if (!window.pendingUploadImages) window.pendingUploadImages = [];
                window.pendingUploadImages.push(imgObj);
                imgObj.isNew = false; 
            }
        });
        
        // Cập nhật lại UI lập tức
        setEditorMode(false);
        await window.loadNotesFromDBAndRender(); 
        
        // Đẩy lên mây
        const saveBtn = document.getElementById('saveNoteBtn');
        saveBtn.innerHTML = '<i class="material-icons">sync</i>';
        const isSuccess = await window.saveNotesToDrive();
        saveBtn.innerHTML = '<i class="material-icons">save</i>';
        
        if (isSuccess) {
            noteData.syncStatus = 'synced';
            await db.notes.put(noteData);
            await window.loadNotesFromDBAndRender();
        }
    });
    
    initCalendar();
    window.loadNotesFromDBAndRender(); 
    checkAndFetchDriveData();
});

// =====================================================================
// PHẦN 2: GOOGLE DRIVE API (ANDROID-COMPATIBLE INCREMENTAL SYNC)
// =====================================================================
const CLIENT_ID = '631532964907-hi703ubcopoqjmv0e5fn6ui3h2u2mi5b.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

window.gapiLoaded = function() {
    gapi.load('client', async () => {
        await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        gapiInited = true;
        checkAndFetchDriveData();
    });
};

window.gisLoaded = function() {
    tokenClient = google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: '' });
    gisInited = true;
    checkAndFetchDriveData();
};

function checkAndFetchDriveData() {
    if (!isDOMReady || !gapiInited || !gisInited) return;
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    const syncText = document.getElementById('syncText');
    btnAuthGoogle.removeEventListener('click', handleAuthClick);
    btnAuthGoogle.addEventListener('click', handleAuthClick);
    
    const savedToken = localStorage.getItem('gino_gdrive_token');
    const savedExpires = localStorage.getItem('gino_gdrive_expires');
    
    if (savedToken && savedExpires && Date.now() < parseInt(savedExpires)) {
        gapi.client.setToken({ access_token: savedToken });
        syncText.innerText = "Đang tải dữ liệu...";
        btnAuthGoogle.classList.add('active-auth');
        fetchNotesFromHiddenDrive().then(() => { window.saveNotesToDrive(); });
    } else {
        clearDriveSession();
    }
}

function handleAuthClick(e) {
    e.preventDefault();
    if (gapi.client.getToken() !== null) {
        document.getElementById('syncText').innerText = "Đang đồng bộ...";
        fetchNotesFromHiddenDrive().then(() => { window.saveNotesToDrive(); });
        return; 
    }
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) return;
        const expiresAt = Date.now() + (resp.expires_in * 1000);
        localStorage.setItem('gino_gdrive_token', resp.access_token);
        localStorage.setItem('gino_gdrive_expires', expiresAt.toString());
        document.getElementById('syncText').innerText = "Đang đồng bộ...";
        document.getElementById('btnAuthGoogle').classList.add('active-auth');
        await fetchNotesFromHiddenDrive();
        await window.saveNotesToDrive();
    };
    tokenClient.requestAccessToken({prompt: 'consent'});
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

// Logic Trộn Dữ liệu (Android Conflict Resolution)
async function mergeCloudToLocal(cloudNotes) {
    if (!Array.isArray(cloudNotes)) return;
    for (const cloudNote of cloudNotes) {
        const localNote = await db.notes.get(cloudNote.id);
        if (!localNote) {
            cloudNote.syncStatus = 'synced';
            await db.notes.put(cloudNote);
        } else {
            // Android Logic: Cập nhật nếu cloudNote.updatedAt > localNote.updatedAt
            // HOẶC nếu lastReviewAt của Cloud mới hơn
            let cloudNewer = cloudNote.updatedAt > localNote.updatedAt;
            if (cloudNote.lastReviewAt && (!localNote.lastReviewAt || cloudNote.lastReviewAt > localNote.lastReviewAt)) {
                cloudNewer = true;
            }
            if (cloudNewer) {
                cloudNote.syncStatus = 'synced';
                await db.notes.put(cloudNote);
            } 
        }
    }
}

async function fetchNotesFromHiddenDrive() {
    try {
        let allFiles = [];
        let pageToken = null;
        
        do {
            let response = await gapi.client.drive.files.list({
                spaces: 'appDataFolder',
                fields: 'nextPageToken, files(id, name, mimeType)',
                pageToken: pageToken,
                pageSize: 1000
            });
            if (response.result.files) {
                allFiles = allFiles.concat(response.result.files);
            }
            pageToken = response.result.nextPageToken;
        } while (pageToken);
        
        if (allFiles.length === 0) {
            document.getElementById('syncText').innerText = "Sẵn sàng lưu";
            return;
        }
        
        let deltaFilesToDownload = [];
        let imagesToDownload = [];
        
        allFiles.forEach(f => {
            if (!f.name) return;
            if (f.name.startsWith('ginonote_delta_') && f.name.endsWith('.json')) {
                let tsStr = f.name.replace('ginonote_delta_', '').replace('.json', '');
                let fileTs = parseInt(tsStr);
                if (!isNaN(fileTs) && fileTs > window.lastSyncTime) {
                    deltaFilesToDownload.push({ file: f, ts: fileTs });
                }
            } else if (f.name.endsWith('.jpg') || f.name.endsWith('.png') || f.name.endsWith('.webp') || f.mimeType === 'image/jpeg') {
                imagesToDownload.push(f);
            }
        });
        
        deltaFilesToDownload.sort((a, b) => a.ts - b.ts);
        const token = gapi.client.getToken().access_token;
        
        for (let i = 0; i < deltaFilesToDownload.length; i++) {
            const fileId = deltaFilesToDownload[i].file.id;
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const deltaNotes = await res.json();
                await mergeCloudToLocal(deltaNotes); 
            }
        }
        
        // Tải ảnh (Chỉ tải những ảnh chưa có trong Dexie để tiết kiệm)
        for (let i = 0; i < imagesToDownload.length; i++) {
            const f = imagesToDownload[i];
            const existingImage = await db.images.get(f.name);
            if (!existingImage) {
                const res = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (res.ok) {
                    const blob = await res.blob();
                    await db.images.put({
                        fileName: f.name,
                        blob: blob,
                        syncStatus: 'synced'
                    });
                }
            }
        }
        
        if (deltaFilesToDownload.length > 0) {
            window.lastSyncTime = deltaFilesToDownload[deltaFilesToDownload.length - 1].ts;
            localStorage.setItem('gino_last_sync_time', window.lastSyncTime.toString());
        }
        
        document.getElementById('syncText').innerText = "Đã đồng bộ";
        await window.loadNotesFromDBAndRender();
        
    } catch (err) {
        console.error(err);
        if (err.status === 401) clearDriveSession();
    }
}

window.saveNotesToDrive = async function() {
    const syncText = document.getElementById('syncText');
    const tokenObj = gapi.client.getToken();
    if (!tokenObj) return false;
    
    const token = tokenObj.access_token;
    try {
        const syncStartTime = Date.now();
        const pendingNotes = await db.notes.where('syncStatus').equals('pending').toArray();
        
        if (pendingNotes.length > 0) {
            syncText.innerText = "Đang đẩy JSON...";
            const deltaFileName = `ginonote_delta_${syncStartTime}.json`;
            const deltaBlob = new Blob([JSON.stringify(pendingNotes)], { type: 'application/json' });
            const metadata = { name: deltaFileName, parents: ['appDataFolder'] };
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', deltaBlob, deltaFileName);
            
            const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: form
            });
            if (!response.ok) throw new Error("Lỗi tải lên Delta");
            
            const ids = pendingNotes.map(n => n.id);
            await db.notes.where('id').anyOf(ids).modify({ syncStatus: 'synced' });
        }
        
        if (window.pendingUploadImages && window.pendingUploadImages.length > 0) {
            syncText.innerText = "Đang tải ảnh lên...";
            for (let i = 0; i < window.pendingUploadImages.length; i++) {
                let imgObj = window.pendingUploadImages[i];
                const imgMetadata = { name: imgObj.fileName, mimeType: 'image/jpeg', parents: ['appDataFolder'] };
                const imgForm = new FormData();
                imgForm.append('metadata', new Blob([JSON.stringify(imgMetadata)], { type: 'application/json' }));
                imgForm.append('file', imgObj.blob, imgObj.fileName);
                
                await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: imgForm
                });
            }
            window.pendingUploadImages = []; 
        }
        
        window.lastSyncTime = syncStartTime;
        localStorage.setItem('gino_last_sync_time', syncStartTime.toString());
        syncText.innerText = "Đã đồng bộ";
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

// =====================================================================
// PHẦN 3: VẼ GIAO DIỆN TRANG CHỦ (ĐÃ TỐI ƯU MEMORY & QUERY)
// =====================================================================

window.loadNotesFromDBAndRender = async function() {
    try {
        const allNotes = await db.notes.filter(note => !note.isDeleted && note.is_deleted !== 1).toArray();
        allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
        window.globalNotesArray = allNotes;
        
        window.renderSyncedNotesToWeb();
    } catch (err) {
        console.error("Lỗi Dexie:", err);
    }
};

window.renderSyncedNotesToWeb = async function() {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;
    notesGrid.innerHTML = '';
    
    let filteredNotes = window.globalNotesArray.filter(note => {
        if (selectedFilterTag) {
            const tagsArray = extractTagsFromNote(note);
            if (!tagsArray.includes(selectedFilterTag)) return false;
        }
        if (selectedFilterDate) {
            const noteDate = new Date(note.updatedAt || note.createdAt);
            if (noteDate.getFullYear() !== selectedFilterDate.getFullYear() ||
                noteDate.getMonth() !== selectedFilterDate.getMonth() ||
                noteDate.getDate() !== selectedFilterDate.getDate()) {
                return false;
            }
        }
        return true;
    });
    
    for (const note of filteredNotes) {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.style.backgroundColor = note.color || note.bgColor || '#ffffff';
        
        let tagsHtml = '';
        const tagsArray = extractTagsFromNote(note);
        if (tagsArray.length > 0) {
            card.setAttribute('data-tags', tagsArray.join(','));
            tagsArray.forEach(tag => { if(tag) tagsHtml += `<span class="tag">${tag}</span>`; });
        }
        
        let imagesPreviewHtml = '';
        const imageNames = extractImageNamesFromNote(note);
        let matchCount = 0;
        
        // [TỐI ƯU 1]: Quét trực tiếp dựa trên JSON Array
        if (imageNames.length > 0) {
            imagesPreviewHtml += '<div class="note-images-preview" style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap;">';
            for (let rawFileName of imageNames) {
                if (matchCount >= 4) break;
                let localUrl = await getImageUrlSafe(rawFileName);
                if (localUrl) {
                    imagesPreviewHtml += `<img src="${localUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">`;
                    matchCount++;
                }
            }
            imagesPreviewHtml += '</div>';
        }
        
        let displayContent = note.content || note.memoContent || note.text || '';
        imageNames.forEach(rawFileName => {
            if (displayContent.includes(rawFileName)) {
                const regex = new RegExp(`(?:file:\\/\\/|\\/storage\\/|\\/data\\/|images\\/)?[\\w\\/\\.\\-]*${rawFileName}`, 'g');
                displayContent = displayContent.replace(regex, '[Hình ảnh đính kèm]');
            }
        });
        
        card.innerHTML = `
            ${matchCount > 0 ? imagesPreviewHtml : ''}
            <div class="note-title">${note.title || note.memoTitle || 'Không có tiêu đề'}</div>
            <div class="note-body">${displayContent}</div>
            <div class="note-tags">${tagsHtml}</div>
        `;
        card.addEventListener('click', () => { window.openNoteInEditor(note); });
        notesGrid.appendChild(card);
    }
    
    renderCalendarView();
    renderTagsSidebar();
}
