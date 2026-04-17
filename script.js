// =====================================================================
// KHAI BÁO BIẾN TOÀN CỤC & VÁ LỖI GIAO DIỆN CUỘN
// =====================================================================
window.syncFileId = null;
window.currentEditingNoteId = null;
// MIDDLEMAN SIÊU QUÉT: Ánh xạ ảnh chỉ dựa trên Tên File gốc (VD: "uuid.jpg")
window.globalImagesMap = {}; // Lưu trữ Blob thực tế: { "uuid.jpg": Blob }
window.imageBlobUrls = {};   // Lưu Blob URL để hiển thị: { "uuid.jpg": "blob:http..." }
window.currentEditingImages = []; // Mảng tạm cho Editor
// Các biến phục vụ Incremental Sync
window.lastSyncTime = parseInt(localStorage.getItem('gino_last_sync_time') || '0');
window.pendingUploadImages = []; // Hàng đợi ảnh mới cần upload
let isDOMReady = false;
let gapiInited = false;
let gisInited = false;
// Biến quản lý Lịch & Tags
let currentCalendarDate = new Date();
let selectedFilterDate = null;
let selectedFilterTag = null;
let autoSaveInterval;
window.globalNotesArray = []; // Khởi tạo mảng toàn cục chứa ghi chú

// =====================================================================
// KHỞI TẠO DEXIE.JS DATABASE
// =====================================================================
const db = new Dexie('GinoNoteDB');
db.version(1).stores({
    notes: 'id, updatedAt, syncStatus', // syncStatus: 'synced', 'pending', 'deleted'
    images: 'fileName, syncStatus', // Thêm syncStatus để SW biết ảnh nào cần upload
    settings: 'key'
});

// Hàm tạo UUID
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Hàm lấy URL ảnh từ Dexie cho chế độ Offline (Dùng chung)
async function getImageUrlOffline(fileName) {
    const imageRecord = await db.images.get(fileName);
    if (imageRecord && imageRecord.blob) {
        return URL.createObjectURL(imageRecord.blob);
    }
    return null;
}

// CSS Fix cho khung Editor cuộn mượt mà
const styleFix = document.createElement('style');
styleFix.innerHTML = `
    .editor-body { display: flex; flex-direction: column; height: calc(100vh - 70px) !important; overflow-y: auto !important; }
    .editor-textarea { flex-grow: 1; min-height: 50vh; overflow-y: auto !important; resize: none; padding-bottom: 50px; }
    .note-editor-overlay { overflow: hidden !important; }
`;
document.head.appendChild(styleFix);

// =====================================================================
// TÍNH NĂNG LỊCH (CALENDAR) VÀ TAGS
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
        selectedFilterDate = null; // Bỏ lọc
        renderCalendarView();
        window.loadNotesFromDBAndRender(); // Hiển thị lại toàn bộ
    });
}

async function renderCalendarView() {
    const grid = document.querySelector('.calendar-grid');
    const monthYearText = document.getElementById('calendarMonthYear');
    if (!grid) return;
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    monthYearText.innerText = `Tháng ${month + 1}, ${year}`;
    // Giữ lại phần tiêu đề Thứ
    const dayNames = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    dayNames.forEach(name => grid.appendChild(name));
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    // Lấy danh sách ngày có ghi chú từ Dexie
    const daysWithNotes = new Set();
    const notesArray = await db.notes.toArray();
    notesArray.forEach(note => {
        if (note.isDeleted) return; // Bỏ qua ghi chú đã xóa
        const noteDate = new Date(note.updatedAt || note.createdAt);
        if (noteDate.getFullYear() === year && noteDate.getMonth() === month) {
            daysWithNotes.add(noteDate.getDate());
        }
    });
    const today = new Date();
    for (let i = 0; i < startOffset; i++) {
        const emptyDiv = document.createElement('div');
        grid.appendChild(emptyDiv);
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
            selectedFilterTag = null; // Reset bộ lọc tag
            renderCalendarView();
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelector('[data-target="viewNotes"]').classList.add('active');
            document.querySelectorAll('.view-section').forEach(view => {
                view.style.display = view.id === 'viewNotes' ? 'block' : 'none';
            });
            window.loadNotesFromDBAndRender();
        });
        grid.appendChild(dayDiv);
    }
}

async function renderTagsSidebar() {
    const tagCountMap = {};
    const notesArray = await db.notes.toArray();
    notesArray.forEach(note => {
        if (note.isDeleted) return; // Bỏ qua ghi chú đã xóa
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
        tagsArray.forEach(tag => {
            if (tag) {
                tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
            }
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
            window.loadNotesFromDBAndRender();
        });
        tagsContainer.appendChild(tagSpan);
    });
}

// =====================================================================
// HÀM LƯU CỤC BỘ (DEXIE) & AUTO-SAVE
// =====================================================================
async function saveNoteLocal(noteData) {
    try {
        noteData.syncStatus = 'pending'; // Đánh dấu là chưa lên mây
        await db.notes.put(noteData);
    } catch (error) {
        console.error("Lỗi khi lưu cục bộ vào Dexie:", error);
    }
}

// =====================================================================
// PHẦN 1: KHỞI TẠO GIAO DIỆN (UI)
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
            // Xoá bộ lọc khi bấm vào "Tất cả ghi chú"
            if(targetId === 'viewNotes') {
                selectedFilterDate = null;
                selectedFilterTag = null;
                window.loadNotesFromDBAndRender();
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
    
    // Thiết lập Auto-save mỗi 10 giây khi đang ở trong Editor
    editBody.addEventListener('focus', () => {
        autoSaveInterval = setInterval(() => {
            if (window.currentEditingNoteId) {
                const currentDraft = {
                    id: window.currentEditingNoteId,
                    title: editTitle.value.trim(),
                    content: editBody.value.trim(),
                    updatedAt: Date.now(),
                    color: editorBody.style.backgroundColor,
                    tags: newTagInput.value ? JSON.stringify(newTagInput.value.split(',').map(t => t.trim()).filter(t => t)) : null,
                    imagePaths: window.currentEditingImages.length > 0 ? JSON.stringify(window.currentEditingImages.map(imgObj => imgObj.fileName)) : null,
                    images: window.currentEditingImages.length > 0 ? JSON.stringify(window.currentEditingImages.map(imgObj => imgObj.fileName)) : null,
                };
                saveNoteLocal(currentDraft);
                console.log("Đã auto-save nháp vào máy.");
            }
        }, 10000);
    });
    
    editBody.addEventListener('blur', () => {
        clearInterval(autoSaveInterval);
    });
    
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
        if (noteData) {
            window.currentEditingNoteId = noteData.id;
            editTitle.value = noteData.title || noteData.memoTitle || '';
            editBody.value = noteData.content || noteData.memoContent || noteData.text || '';
            if (noteData.color || noteData.bgColor) {
                const hexColor = noteData.color || noteData.bgColor;
                editorBody.style.backgroundColor = hexColor;
                document.querySelectorAll('.color-option').forEach(opt => {
                    if(opt.getAttribute('data-color') === hexColor) opt.classList.add('active');
                });
            }
            let tagsArray = [];
            if (noteData.tags) {
                try {
                    let parsed = JSON.parse(noteData.tags);
                    if (Array.isArray(parsed)) tagsArray = parsed;
                    else tagsArray = noteData.tags.split(',');
                } catch(e) {
                    tagsArray = typeof noteData.tags === 'string' ? noteData.tags.split(',') : [];
                }
            }
            newTagInput.value = tagsArray.join(', ');
            const noteStr = JSON.stringify(noteData);
            const addedImages = new Set();
            
            // Quét ảnh từ Dexie thay vì RAM
            const allOfflineImages = await db.images.toArray();
            for (let imgRecord of allOfflineImages) {
                let rawFileName = imgRecord.fileName;
                if (noteStr.includes(rawFileName) && !addedImages.has(rawFileName)) {
                    let localUrl = window.imageBlobUrls[rawFileName] || URL.createObjectURL(imgRecord.blob);
                    window.imageBlobUrls[rawFileName] = localUrl; // Lưu đệm lại để dùng
                    window.currentEditingImages.push({
                        fileName: rawFileName,
                        blob: imgRecord.blob,
                        url: localUrl
                    });
                    addedImages.add(rawFileName);
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
    document.getElementById('closeEditorBtn').addEventListener('click', () => { noteEditor.classList.remove('active'); colorPalettePopup.classList.remove('open'); });
    
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
        // Đọc file thành Blob
        const blob = new Blob([file], { type: file.type });
        const blobUrl = URL.createObjectURL(blob);
        // 1. Lưu ngay vào IndexedDB (Dexie) để dùng offline
        await db.images.put({
            fileName: uniqueFileName,
            blob: blob,
            syncStatus: 'pending' // Đánh dấu chờ đẩy lên mây
        });
        // 2. Hiển thị tạm thời lên Editor
        window.currentEditingImages.push({
            fileName: uniqueFileName,
            url: blobUrl
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
    
    document.getElementById('saveNoteBtn').addEventListener('click', async () => {
        const title = editTitle.value.trim();
        const content = editBody.value.trim();
        const color = editorBody.style.backgroundColor;
        const tags = newTagInput.value ? newTagInput.value.split(',').map(t => t.trim()).filter(t => t) : [];
        const tagsStr = tags.length > 0 ? JSON.stringify(tags) : null;
        const finalFileNames = window.currentEditingImages.map(imgObj => imgObj.fileName);
        const imagesStr = finalFileNames.length > 0 ? JSON.stringify(finalFileNames) : null;
        let noteData = {
            id: window.currentEditingNoteId || new Date().getTime(),
            title: title,
            content: content,
            color: color,
            tags: tagsStr,
            imagePaths: imagesStr,
            images: imagesStr,
            updatedAt: new Date().getTime(),
            isDeleted: false // Tương thích trường Soft Delete của App
        };
        if (!window.currentEditingNoteId) {
            noteData.createdAt = noteData.updatedAt;
        }
        // 1. Lưu chốt vào máy tính ngay lập tức
        await saveNoteLocal(noteData);
        // Đưa ảnh mới vào bản đồ cục bộ và Hàng đợi Upload
        window.currentEditingImages.forEach(imgObj => {
            window.globalImagesMap[imgObj.fileName] = imgObj.blob;
            window.imageBlobUrls[imgObj.fileName] = imgObj.url;
            if (imgObj.isNew) {
                if (!window.pendingUploadImages) window.pendingUploadImages = [];
                window.pendingUploadImages.push(imgObj);
                imgObj.isNew = false; // Đã đưa vào hàng đợi
            }
        });
        // 2. Kích hoạt đồng bộ lên Drive (Manual Sync)
        const saveBtn = document.getElementById('saveNoteBtn');
        saveBtn.innerHTML = '<i class="material-icons">sync</i>';
        const isSuccess = await window.saveNotesToDrive();
        saveBtn.innerHTML = '<i class="material-icons">save</i>';
        if (isSuccess) {
            await db.notes.update(noteData.id, { syncStatus: 'synced' });
            setEditorMode(false);
            window.loadNotesFromDBAndRender(); // Cập nhật lại giao diện từ DB
        } else if (!gapi.client.getToken()) {
            // Nếu chưa đăng nhập, chỉ lưu local và vẽ lại UI
            setEditorMode(false);
            window.loadNotesFromDBAndRender();
        }
    });
    
    initCalendar();
    window.loadNotesFromDBAndRender(); // Render từ local trước
    checkAndFetchDriveData();
});

// =====================================================================
// PHẦN 2: GOOGLE DRIVE API (INCREMENTAL SYNC - KHÔNG DÙNG JSZIP)
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
        fetchNotesFromHiddenDrive();
    } else {
        clearDriveSession();
    }
}

function handleAuthClick(e) {
    e.preventDefault();
    // 1. NẾU ĐÃ ĐĂNG NHẬP RỒI -> Bấm vào sẽ ép đồng bộ thủ công
    if (gapi.client.getToken() !== null) {
        document.getElementById('syncText').innerText = "Đang đồng bộ...";
        // Kéo dữ liệu mới nhất từ Cloud về
        fetchNotesFromHiddenDrive().then(() => {
            // Sau khi kéo về, đẩy các thay đổi cục bộ (nếu có) lên Cloud
            window.saveNotesToDrive();
        });
        return; // Dừng hàm tại đây, không gọi lệnh đăng nhập nữa
    }
    // 2. NẾU CHƯA ĐĂNG NHẬP -> Hiện cửa sổ chọn tài khoản Google
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error("Lỗi đăng nhập:", resp.error);
            return;
        }
        // Lưu token duy trì đăng nhập khi F5
        const expiresAt = Date.now() + (resp.expires_in * 1000);
        localStorage.setItem('gino_gdrive_token', resp.access_token);
        localStorage.setItem('gino_gdrive_expires', expiresAt.toString());
        document.getElementById('syncText').innerText = "Đang đồng bộ...";
        document.getElementById('btnAuthGoogle').classList.add('active-auth');
        // Tải dữ liệu lần đầu
        await fetchNotesFromHiddenDrive();
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

function handleDriveApiError(err) {
    if (err.status === 401) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        clearDriveSession();
    } else {
        document.getElementById('syncText').innerText = "Lỗi đồng bộ";
    }
}

// Hàm trộn dữ liệu từ Drive (Cloud) vào ổ cứng (Local)
async function mergeCloudToLocal(cloudNotes) {
    if (!Array.isArray(cloudNotes)) return;
    
    for (const cloudNote of cloudNotes) {
        const localNote = await db.notes.get(cloudNote.id);
        
        // Xử lý "Last Write Wins" (Bản nào sửa sau cùng thì thắng)
        if (!localNote) {
            // Local chưa có -> Lưu mới luôn
            cloudNote.syncStatus = 'synced';
            await db.notes.put(cloudNote);
        } else {
            // Nếu có xung đột, ưu tiên cái mới hơn
            if (cloudNote.updatedAt > localNote.updatedAt) {
                cloudNote.syncStatus = 'synced';
                await db.notes.put(cloudNote);
            } 
            // Nếu localNote.updatedAt > cloudNote.updatedAt thì giữ nguyên bản Local, 
            // vì lát nữa ta sẽ push (đẩy) bản Local đó lên đè lại Cloud.
        }
    }
}

// Tải dữ liệu Delta thay vì File ZIP
async function fetchNotesFromHiddenDrive() {
    try {
        let allFiles = [];
        let pageToken = null;
        // 1. Quét toàn bộ file trong thư mục AppData
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
        // 2. Phân loại File (Chỉ lấy Delta JSON mới và ảnh chưa có)
        allFiles.forEach(f => {
            if (!f.name) return;
            if (f.name.startsWith('ginonote_delta_') && f.name.endsWith('.json')) {
                let tsStr = f.name.replace('ginonote_delta_', '').replace('.json', '');
                let fileTs = parseInt(tsStr);
                if (!isNaN(fileTs) && fileTs > window.lastSyncTime) {
                    deltaFilesToDownload.push({ file: f, ts: fileTs });
                }
            } else if (f.name.endsWith('.jpg') || f.name.endsWith('.png') || f.name.endsWith('.webp') || f.mimeType === 'image/jpeg') {
                if (!window.globalImagesMap[f.name]) {
                    imagesToDownload.push(f);
                }
            }
        });
        // Sắp xếp Delta tăng dần theo thời gian để merge dữ liệu đúng thứ tự
        deltaFilesToDownload.sort((a, b) => a.ts - b.ts);
        const token = gapi.client.getToken().access_token;
        // 3. Tải và gộp các file JSON Delta
        for (let i = 0; i < deltaFilesToDownload.length; i++) {
            const fileId = deltaFilesToDownload[i].file.id;
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const deltaNotes = await res.json();
                // SỬ DỤNG HÀM MỚI Ở ĐÂY:
                await mergeCloudToLocal(deltaNotes); 
            }
        }
        // 4. Tải trực tiếp các file ảnh mới
        for (let i = 0; i < imagesToDownload.length; i++) {
            const f = imagesToDownload[i];
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const blob = await res.blob();
                window.globalImagesMap[f.name] = blob;
                window.imageBlobUrls[f.name] = URL.createObjectURL(blob);
                // Đồng thời lưu vào Dexie để có thể hiển thị khi offline lần sau
                await db.images.put({
                    fileName: f.name,
                    blob: blob,
                    syncStatus: 'synced'
                });
            }
        }
        // 5. Cập nhật mốc thời gian đồng bộ và VẼ LẠI GIAO DIỆN
        if (deltaFilesToDownload.length > 0) {
            window.lastSyncTime = deltaFilesToDownload[deltaFilesToDownload.length - 1].ts;
            localStorage.setItem('gino_last_sync_time', window.lastSyncTime.toString());
        }
        document.getElementById('syncText').innerText = "Đã đồng bộ";
        // SỬ DỤNG HÀM MỚI Ở ĐÂY: Yêu cầu tải từ DB ra và hiển thị
        await window.loadNotesFromDBAndRender();
    } catch (err) {
        handleDriveApiError(err);
    }
}

// Đẩy dữ liệu lên Drive bằng cơ chế Delta (Chỉ đẩy 'pending')
window.saveNotesToDrive = async function() {
    const syncText = document.getElementById('syncText');
    const tokenObj = gapi.client.getToken();
    if (!tokenObj) {
        return false;
    }
    const token = tokenObj.access_token;
    try {
        const syncStartTime = Date.now();
        // 1. Chỉ lọc ra các ghi chú có trạng thái 'pending' trong DB
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
            if (!response.ok) {
                if (response.status === 401) throw { status: 401 };
                throw new Error("Lỗi tải lên Delta");
            }
            // Cập nhật trạng thái thành 'synced' sau khi push thành công
            const ids = pendingNotes.map(n => n.id);
            await db.notes.where('id').anyOf(ids).modify({ syncStatus: 'synced' });
        }
        // 2. Upload Ảnh mới trực tiếp (Rời rạc)
        if (window.pendingUploadImages && window.pendingUploadImages.length > 0) {
            syncText.innerText = "Đang tải ảnh lên...";
            for (let i = 0; i < window.pendingUploadImages.length; i++) {
                let imgObj = window.pendingUploadImages[i];
                const imgMetadata = { name: imgObj.fileName, parents: ['appDataFolder'] };
                const imgForm = new FormData();
                imgForm.append('metadata', new Blob([JSON.stringify(imgMetadata)], { type: 'application/json' }));
                imgForm.append('file', imgObj.blob, imgObj.fileName);
                const imgUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
                await fetch(imgUrl, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: imgForm
                });
            }
            window.pendingUploadImages = []; // Xóa hàng đợi sau khi upload thành công
        }
        // 3. Ghi nhận mốc Sync mới nhất
        window.lastSyncTime = syncStartTime;
        localStorage.setItem('gino_last_sync_time', syncStartTime.toString());
        syncText.innerText = "Đã đồng bộ";
        return true;
    } catch (err) {
        handleDriveApiError(err);
        return false;
    }
}

// =====================================================================
// PHẦN 3: VẼ GIAO DIỆN TRANG CHỦ & DEEP SCAN ẢNH TRANG CHỦ
// =====================================================================

// HÀM MỚI: Đọc từ Dexie và kích hoạt vẽ giao diện
window.loadNotesFromDBAndRender = async function() {
    try {
        // Lấy tất cả ghi chú từ Dexie (loại bỏ những cái đã bị xóa mềm)
        const allNotes = await db.notes.filter(note => !note.isDeleted).toArray();
        
        // Sắp xếp ghi chú mới nhất lên đầu
        allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
        
        // Gán lại vào mảng global để các hàm Lịch/Tag cũ của bạn vẫn hoạt động
        window.globalNotesArray = allNotes;
        
        // Gọi hàm vẽ giao diện trang chủ
        window.renderSyncedNotesToWeb(window.globalNotesArray);
        console.log("Đã tải và hiển thị dữ liệu từ Dexie.");
    } catch (err) {
        console.error("Lỗi khi đọc dữ liệu từ Dexie:", err);
    }
};

window.renderSyncedNotesToWeb = async function(notesArrayToRender) {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;
    notesGrid.innerHTML = '';
    
    // Sử dụng mảng truyền vào (nếu có), nếu không có tham số thì tự động fallback query từ DB
    let notesArray = notesArrayToRender;
    if (!notesArray) {
        notesArray = await db.notes.toArray();
        notesArray.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    
    // Lấy danh sách ảnh offline từ Dexie một lần để tăng tốc
    const allOfflineImages = await db.images.toArray();
    
    // Lọc Notes dựa vào Date, Tag, và trường isDeleted (Soft Delete của App)
    let filteredNotes = notesArray.filter(note => {
        if (note.isDeleted) return false; // Ẩn các ghi chú đã bị xóa từ App
        if (selectedFilterTag) {
            const cardTags = note.tags || "";
            if (!cardTags.includes(selectedFilterTag)) return false;
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
    
    filteredNotes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.style.backgroundColor = note.color || note.bgColor || '#ffffff';
        let tagsHtml = '';
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
        if (tagsArray.length > 0) {
            card.setAttribute('data-tags', tagsArray.join(','));
            tagsArray.forEach(tag => { if(tag) tagsHtml += `<span class="tag">${tag}</span>`; });
        }
        const noteStr = JSON.stringify(note);
        let imagesPreviewHtml = '';
        let matchCount = 0;
        imagesPreviewHtml += '<div class="note-images-preview" style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap;">';
        
        // Quét qua danh sách ảnh lấy từ Dexie
        for (let imgRecord of allOfflineImages) {
            let rawFileName = imgRecord.fileName;
            if (matchCount >= 4) break;
            if (noteStr.includes(rawFileName)) {
                // Tạo URL từ Blob nếu chưa có trong đệm
                if (!window.imageBlobUrls[rawFileName]) {
                    window.imageBlobUrls[rawFileName] = URL.createObjectURL(imgRecord.blob);
                }
                imagesPreviewHtml += `<img src="${window.imageBlobUrls[rawFileName]}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">`;
                matchCount++;
            }
        }
        imagesPreviewHtml += '</div>';
        let displayContent = note.content || note.memoContent || note.text || '';
        
        // Ẩn file name trong text body
        for (let imgRecord of allOfflineImages) {
            let rawFileName = imgRecord.fileName;
            if (displayContent.includes(rawFileName)) {
                const regex = new RegExp(`(?:file:\\/\\/|\\/storage\\/|\\/data\\/|images\\/)?[\\w\\/\\.\\-]*${rawFileName}`, 'g');
                displayContent = displayContent.replace(regex, '[Hình ảnh đính kèm]');
            }
        }
        
        card.innerHTML = `
            ${matchCount > 0 ? imagesPreviewHtml : ''}
            <div class="note-title">${note.title || note.memoTitle || 'Không có tiêu đề'}</div>
            <div class="note-body">${displayContent}</div>
            <div class="note-tags">${tagsHtml}</div>
        `;
        card.addEventListener('click', () => { window.openNoteInEditor(note); });
        notesGrid.appendChild(card);
    });
    renderCalendarView();
    renderTagsSidebar();
}
