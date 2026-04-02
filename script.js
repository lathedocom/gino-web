// =====================================================================
// KHAI BÁO BIẾN TOÀN CỤC & VÁ LỖI GIAO DIỆN CUỘN
// =====================================================================
window.syncFileId = null;           
window.globalNotesArray = [];       
window.currentEditingNoteId = null; 

// MIDDLEMAN: Bản đồ ánh xạ ảnh
window.globalImagesMap = {}; // Lưu trữ Blob thực tế với key chuẩn: "images/uuid.jpg"
window.imageBlobUrls = {};   // Lưu Blob URL để hiển thị: "images/uuid.jpg" -> "blob:http..."
window.currentEditingImages = []; // Mảng tạm cho Editor

let isDOMReady = false;
let gapiInited = false;
let gisInited = false;

// Hàm tạo UUID hỗ trợ cả các trình duyệt cũ hoặc chạy localhost
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
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
            views.forEach(view => view.style.display = view.id === targetId ? 'block' : 'none');
            if (targetId === 'viewNotes') document.querySelectorAll('.note-card').forEach(card => card.style.display = 'flex');
        });
    });

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

    // MỞ EDITOR & ĐỌC DỮ LIỆU MIDDLEMAN
    window.openNoteInEditor = function(noteData) {
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

            // Gắn tags
            let tagsArray = [];
            if (Array.isArray(noteData.tags)) tagsArray = noteData.tags;
            else if (typeof noteData.tags === 'string') tagsArray = noteData.tags.split(',');
            newTagInput.value = tagsArray.join(', ');

            // TÁCH ẢNH KIỂU TRUNG GIAN (MIDDLEMAN)
            let pathsToExtract = noteData.imagePaths || noteData.images || [];
            if (typeof pathsToExtract === 'string') pathsToExtract = pathsToExtract.split(',');

            if (Array.isArray(pathsToExtract)) {
                pathsToExtract.forEach(pathStr => {
                    if(!pathStr) return;
                    // Bóc tách lấy đúng tên file bất chấp Android đang dùng đường dẫn vật lý hay Web dùng tên gốc
                    const rawFileName = pathStr.split('/').pop().split('\\').pop(); 
                    const mapKey = `images/${rawFileName}`; // Chuẩn hóa về đúng key trong file ZIP

                    if (window.globalImagesMap[mapKey]) {
                        window.currentEditingImages.push({
                            fileName: rawFileName,     // "uuid.jpg" -> Dùng lưu vào JSON
                            mapKey: mapKey,            // "images/uuid.jpg" -> Dùng lưu vào ZIP
                            blob: window.globalImagesMap[mapKey],
                            url: window.imageBlobUrls[mapKey] 
                        });
                    }
                });
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

    // --- SỰ KIỆN TOOLBAR ---
    document.getElementById('fabBtn').addEventListener('click', () => { window.openNoteInEditor(null); editTitle.focus(); });
    editNoteModeBtn.addEventListener('click', () => { setEditorMode(true); editBody.focus(); });
    document.getElementById('closeEditorBtn').addEventListener('click', () => { noteEditor.classList.remove('active'); colorPalettePopup.classList.remove('open'); });

    // --- CHỌN ẢNH VÀO TẠO UUID CHO WEB ---
    const insertImageBtn = document.getElementById('insertImageBtn');
    const hiddenImageInput = document.getElementById('hiddenImageInput');

    insertImageBtn.addEventListener('click', () => hiddenImageInput.click());

    hiddenImageInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        if (!file.type.startsWith('image/')) { alert('Chỉ được chọn hình ảnh.'); return; }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const blob = new Blob([event.target.result], { type: file.type });
            const blobUrl = URL.createObjectURL(blob);
            
            // TẠO UUID ĐỂ KHỚP VỚI CƠ CHẾ MIDDLEMAN
            const extension = file.name.split('.').pop() || 'jpg';
            const uniqueFileName = `${generateUUID()}.${extension}`; // VD: crypto-uuid.jpg
            const mapKey = `images/${uniqueFileName}`; // VD: images/crypto-uuid.jpg
            
            window.currentEditingImages.push({
                fileName: uniqueFileName, 
                mapKey: mapKey,
                blob: blob,
                url: blobUrl
            });
            
            renderEditorImages();
            hiddenImageInput.value = '';
        };
        reader.readAsArrayBuffer(file);
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

    // --- GÓI DỮ LIỆU ĐỂ LƯU MIDDLEMAN ---
    document.getElementById('saveNoteBtn').addEventListener('click', async () => {
        if (!gapi.client.getToken()) { alert("Bạn cần đăng nhập Google trước!"); return; }

        const title = editTitle.value.trim();
        const content = editBody.value.trim();
        const color = editorBody.style.backgroundColor;
        const tags = newTagInput.value ? newTagInput.value.split(',').map(t => t.trim()).filter(t => t) : [];

        // Trích xuất list Tên File duy nhất (uuid.jpg) để lưu JSON
        const finalFileNames = window.currentEditingImages.map(imgObj => imgObj.fileName);

        if (!window.globalNotesArray) window.globalNotesArray = [];
        
        if (window.currentEditingNoteId) {
            const index = window.globalNotesArray.findIndex(n => n.id === window.currentEditingNoteId);
            if (index !== -1) {
                window.globalNotesArray[index].title = title;
                window.globalNotesArray[index].content = content;
                window.globalNotesArray[index].color = color;
                window.globalNotesArray[index].tags = tags;
                window.globalNotesArray[index].imagePaths = finalFileNames; // Ghi tên gốc vào file json
                window.globalNotesArray[index].images = finalFileNames;     // Backup
                window.globalNotesArray[index].updatedAt = new Date().getTime();
            }
        } else {
            const newNote = {
                id: new Date().getTime(),
                title: title,
                content: content,
                color: color,
                tags: tags,
                imagePaths: finalFileNames,
                images: finalFileNames,
                updatedAt: new Date().getTime(),
                createdAt: new Date().getTime()
            };
            window.globalNotesArray.unshift(newNote);
            window.currentEditingNoteId = newNote.id; 
        }

        // Cập nhật thư viện MAP ngầm
        window.currentEditingImages.forEach(imgObj => {
            window.globalImagesMap[imgObj.mapKey] = imgObj.blob;
            window.imageBlobUrls[imgObj.mapKey] = imgObj.url;
        });
        
        const saveBtn = document.getElementById('saveNoteBtn');
        saveBtn.innerHTML = '<i class="material-icons">sync</i>';
        
        const isSuccess = await window.saveNotesToDrive(window.globalNotesArray);
        saveBtn.innerHTML = '<i class="material-icons">save</i>';

        if (isSuccess) {
            setEditorMode(false); 
            window.renderSyncedNotesToWeb(window.globalNotesArray); 
        }
    });

    checkAndFetchDriveData();
});


// =====================================================================
// PHẦN 2: GOOGLE DRIVE API & JSZIP
// =====================================================================
const CLIENT_ID = '631532964907-hi703ubcopoqjmv0e5fn6ui3h2u2mi5b.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SYNC_FILE_NAME = 'ginonote_SyncData.zip'; 

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
    } else { clearDriveSession(); }
}

function handleAuthClick(e) {
    e.preventDefault();
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) return;
        const expiresAt = Date.now() + (resp.expires_in * 1000);
        localStorage.setItem('gino_gdrive_token', resp.access_token);
        localStorage.setItem('gino_gdrive_expires', expiresAt.toString());
        document.getElementById('syncText').innerText = "Đang đồng bộ...";
        document.getElementById('btnAuthGoogle').classList.add('active-auth');
        await fetchNotesFromHiddenDrive();
    };
    if (gapi.client.getToken() === null) tokenClient.requestAccessToken({prompt: 'consent'});
    else tokenClient.requestAccessToken({prompt: ''});
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

async function fetchNotesFromHiddenDrive() {
    try {
        let response = await gapi.client.drive.files.list({
            spaces: 'appDataFolder', q: `name = '${SYNC_FILE_NAME}' and trashed = false`, fields: 'files(id, name)'
        });

        const files = response.result.files;
        if (!files || files.length === 0) {
            document.getElementById('syncText').innerText = "Sẵn sàng lưu";
            window.syncFileId = null;
            window.globalNotesArray = [];
            window.globalImagesMap = {};
            window.imageBlobUrls = {};
            window.renderSyncedNotesToWeb(window.globalNotesArray);
            return;
        }

        window.syncFileId = files[0].id;
        const token = gapi.client.getToken().access_token;
        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${window.syncFileId}?alt=media`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!fileRes.ok) throw new Error("Lỗi tải file");
        
        const arrayBuffer = await fileRes.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        if (zip.file("data.json")) {
            const jsonStr = await zip.file("data.json").async("string");
            window.globalNotesArray = JSON.parse(jsonStr);
        } else { window.globalNotesArray = []; }

        for (let path in window.imageBlobUrls) { URL.revokeObjectURL(window.imageBlobUrls[path]); }
        window.globalImagesMap = {};
        window.imageBlobUrls = {};
        
        const zipFiles = Object.keys(zip.files);
        for (let i = 0; i < zipFiles.length; i++) {
            const filePath = zipFiles[i];
            if (filePath.startsWith('images/') && !zip.files[filePath].dir) {
                const blob = await zip.files[filePath].async("blob");
                window.globalImagesMap[filePath] = blob; // Key dạng: "images/uuid.jpg"
                window.imageBlobUrls[filePath] = URL.createObjectURL(blob);
            }
        }

        document.getElementById('syncText').innerText = "Đã đồng bộ";
        window.renderSyncedNotesToWeb(window.globalNotesArray);
    } catch (err) { handleDriveApiError(err); }
}

// LƯU ĐÓNG GÓI CHUẨN THƯ MỤC IMAGES/ VÀO ZIP
window.saveNotesToDrive = async function(notesArray) {
    const syncText = document.getElementById('syncText');
    const tokenObj = gapi.client.getToken();
    if (!tokenObj) { clearDriveSession(); return false; }
    const token = tokenObj.access_token;

    try {
        const zip = new JSZip();
        zip.file('data.json', JSON.stringify(notesArray));
        
        // Nhét ảnh vào ZIP theo key "images/uuid.jpg"
        for (let imagePath in window.globalImagesMap) {
            zip.file(imagePath, window.globalImagesMap[imagePath]);
        }

        syncText.innerText = "Đang nén ZIP...";
        const zipBlob = await zip.generateAsync({ type: "blob", mimeType: "application/zip" });
        syncText.innerText = "Đang tải lên...";

        if (window.syncFileId) {
            const url = 'https://www.googleapis.com/upload/drive/v3/files/' + window.syncFileId + '?uploadType=media';
            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/zip' },
                body: zipBlob
            });
            if (!response.ok) { if (response.status === 401) throw { status: 401 }; throw new Error("Lỗi update file"); }
        } else {
            const metadata = { name: SYNC_FILE_NAME, parents: ['appDataFolder'] };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', zipBlob, SYNC_FILE_NAME);

            const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: form
            });
            if (!response.ok) { if (response.status === 401) throw { status: 401 }; throw new Error("Lỗi tạo mới"); }
            const result = await response.json();
            window.syncFileId = result.id; 
        }

        syncText.innerText = "Đã đồng bộ";
        return true;
    } catch (err) { handleDriveApiError(err); return false; }
}

// =====================================================================
// PHẦN 3: VẼ GIAO DIỆN TRANG CHỦ
// =====================================================================
window.renderSyncedNotesToWeb = function(notesArray) {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;
    
    notesGrid.innerHTML = '';

    notesArray.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.style.backgroundColor = note.color || note.bgColor || '#ffffff';

        let tagsHtml = '';
        let tagsArray = [];
        if (Array.isArray(note.tags)) tagsArray = note.tags;
        else if (typeof note.tags === 'string') tagsArray = note.tags.split(',').map(t => t.trim());
        if (tagsArray.length > 0) {
            card.setAttribute('data-tags', tagsArray.join(','));
            tagsArray.forEach(tag => { if(tag) tagsHtml += `<span class="tag">${tag}</span>`; });
        }

        // TÁCH ẢNH KIỂU MIDDLEMAN CHO TRANG CHỦ
        let imagesPreviewHtml = '';
        let matchCount = 0;
        let pathsToExtract = note.imagePaths || note.images || [];
        if (typeof pathsToExtract === 'string') pathsToExtract = pathsToExtract.split(',');

        if (Array.isArray(pathsToExtract) && pathsToExtract.length > 0) {
            imagesPreviewHtml += '<div class="note-images-preview" style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap;">';
            pathsToExtract.forEach(pathStr => {
                if (matchCount >= 4 || !pathStr) return;
                // Bóc tách tên file, dù là file path Android hay Web
                const rawFileName = pathStr.split('/').pop().split('\\').pop(); 
                const mapKey = `images/${rawFileName}`;
                
                if (window.imageBlobUrls[mapKey]) {
                    imagesPreviewHtml += `<img src="${window.imageBlobUrls[mapKey]}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">`;
                    matchCount++;
                }
            });
            imagesPreviewHtml += '</div>';
        }

        let displayContent = note.content || note.memoContent || note.text || '';
        
        // Ẩn bớt các đường dẫn ảnh rác trong nội dung chữ (nếu có do Android chèn)
        if (Array.isArray(pathsToExtract)) {
            pathsToExtract.forEach(pathStr => {
                const rawFileName = pathStr.split('/').pop().split('\\').pop();
                const regex = new RegExp(`(?:file:\\/\\/|\\/storage\\/|\\/data\\/|images\\/)?[\\w\\/\\.\\-]*${rawFileName}`, 'g');
                displayContent = displayContent.replace(regex, '[Hình ảnh đính kèm]');
            });
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

    renderTagsSidebar();
}

function renderTagsSidebar() {
    const allTags = new Set();
    document.querySelectorAll('.note-card').forEach(card => {
        const tags = card.getAttribute('data-tags');
        if(tags) tags.split(',').forEach(tag => { if(tag.trim()) allTags.add(tag.trim()); });
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
            document.querySelectorAll('.view-section').forEach(view => { view.style.display = view.id === 'viewNotes' ? 'block' : 'none'; });
            document.querySelectorAll('.note-card').forEach(card => {
                const cardTags = card.getAttribute('data-tags') || "";
                if (cardTags.includes(tagText)) card.style.display = 'flex';
                else card.style.display = 'none';
            });
        });
        tagsContainer.appendChild(tagSpan);
    });
}
