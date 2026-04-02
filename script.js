// =====================================================================
// KHAI BÁO BIẾN TOÀN CỤC
// =====================================================================
window.syncFileId = null;           
window.globalNotesArray = [];       
window.currentEditingNoteId = null; 

// Quản lý ảnh từ file ZIP (CỰC KỲ QUAN TRỌNG)
window.globalImagesMap = {}; // Thư mục ẩn chứa các file Blob gốc: { 'images/abc.jpg': Blob }
window.imageBlobUrls = {};   // Chứa đường dẫn tạm (blob:http...) để hiển thị: { 'images/abc.jpg': 'blob:http...' }

// Quản lý ảnh mới được thêm trong phiên làm việc hiện tại (để preview nhanh)
window.currentEditingImages = []; // Array chứa { path: string, blob: Blob, url: string }

let isDOMReady = false;
let gapiInited = false;
let gisInited = false;

// =====================================================================
// PHẦN 1: KHỞI TẠO GIAO DIỆN (UI) KHI TRANG TẢI XONG
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    isDOMReady = true;

    // --- UI ĐIỀU HƯỚNG CHUNG ---
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

    // --- XỬ LÝ EDITOR (TRÌNH SOẠN THẢO) ---
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
            document.querySelectorAll('.image-remove-btn').forEach(b => b.style.display = 'flex'); // Hiện nút xóa ảnh
        } else {
            editNoteModeBtn.style.display = 'flex';
            editModeToolbar.style.display = 'none';
            editorBody.classList.add('readonly-mode');
            newTagInput.style.display = 'none';
            document.querySelectorAll('.image-remove-btn').forEach(b => b.style.display = 'none'); // Ẩn nút xóa ảnh
        }
    }

    // --- CẬP NHẬT: HÀM MỞ EDITOR ĐỂ HIỂN THỊ ẢNH ---
    window.openNoteInEditor = function(noteData) {
        // Reset Editor
        editTitle.value = '';
        editBody.value = '';
        newTagInput.value = '';
        editorBody.style.backgroundColor = '#ffffff';
        colorPalettePopup.classList.remove('open');
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
        document.querySelector('.color-option.default').classList.add('active');
        
        // Xóa danh sách ảnh preview đang hiện
        window.currentEditingImages = []; 
        let imageArea = document.getElementById('editorImageArea');
        if (imageArea) imageArea.innerHTML = '';

        if (noteData) { // MỞ GHI CHÚ ĐÃ CÓ
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

            if (noteData.tags && Array.isArray(noteData.tags)) {
                newTagInput.value = noteData.tags.join(', ');
            } else if (typeof noteData.tags === 'string') {
                newTagInput.value = noteData.tags;
            }

            // --- BỔ SUNG: KHÔI PHỤC MẢNG ẢNH CỦA GHI CHÚ ---
            if (noteData.images && Array.isArray(noteData.images)) {
                noteData.images.forEach(imagePath => {
                    if (window.globalImagesMap[imagePath] && window.imageBlobUrls[imagePath]) {
                        window.currentEditingImages.push({
                            path: imagePath,
                            blob: window.globalImagesMap[imagePath],
                            url: window.imageBlobUrls[imagePath] // Dùng URL ảo đã tạo lúc giải nén
                        });
                    }
                });
            }
            renderEditorImages(); // Vẽ mảng ảnh lên editor
            setEditorMode(false); // Mode ĐỌC
        } else { // TẠO GHI CHÚ MỚI
            window.currentEditingNoteId = null;
            renderEditorImages(); 
            setEditorMode(true); // Mode SỬA
        }

        noteEditor.classList.add('active');
    };

    // Vẽ mảng ảnh trong Editor (Nằm phía dưới khu vực tags, trên khu vực nội dung)
    function renderEditorImages() {
        let editorBody = document.getElementById('editorBody');
        let imageArea = document.getElementById('editorImageArea');
        
        // Nếu chưa có khu vực chứa ảnh, tạo mới và chèn vào
        if (!imageArea) {
            imageArea = document.createElement('div');
            imageArea.id = 'editorImageArea';
            imageArea.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0; margin-bottom: 10px; border-bottom: 1px solid #eee;';
            // Chèn vào sau editorTagsArea
            const tagsArea = document.getElementById('editorTagsArea');
            tagsArea.parentNode.insertBefore(imageArea, tagsArea.nextSibling);
        }
        
        imageArea.innerHTML = ''; // Xóa ảnh cũ
        
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
            
            // Nút xóa ảnh
            const removeBtn = document.createElement('button');
            removeBtn.className = 'image-remove-btn';
            removeBtn.innerHTML = '<i class="material-icons" style="font-size: 16px;">close</i>';
            removeBtn.style.cssText = 'position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; cursor: pointer; display: none; align-items: center; justify-content: center; padding: 0;';
            
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.currentEditingImages.splice(index, 1); // Xóa khỏi mảng đang edit
                renderEditorImages(); // Vẽ lại
            });
            
            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            imageArea.appendChild(wrapper);
        });

        // Cập nhật lại trạng thái nút xóa dựa trên chế độ (Đọc/Sửa)
        const isEditing = editModeToolbar.style.display === 'flex';
        document.querySelectorAll('.image-remove-btn').forEach(b => b.style.display = isEditing ? 'flex' : 'none');
    }

    // --- CÁC SỰ KIỆN CHUNG TRÊN UI EDITOR ---
    document.getElementById('fabBtn').addEventListener('click', () => {
        window.openNoteInEditor(null); 
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

    // =================================================================
    // CẬP NHẬT: KÍCH HOẠT TÍNH NĂNG CHÈN ẢNH (INSERT IMAGE)
    // =================================================================
    const insertImageBtn = document.getElementById('insertImageBtn');
    const hiddenImageInput = document.getElementById('hiddenImageInput');

    // 1. Bấm nút toolbar -> Gọi lệnh Click của Input ẩn
    insertImageBtn.addEventListener('click', () => {
        hiddenImageInput.click();
    });

    // 2. Xử lý khi người dùng chọn tệp tin ảnh thành công
    hiddenImageInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        const file = files[0]; // Chỉ lấy 1 ảnh đầu tiên
        
        // Kiểm tra xem có phải file ảnh không
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chỉ chọn tệp tin hình ảnh.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            // Tạo một đường dẫn ảo (Blob URL) để preview ảnh ngay lập tức
            const blob = new Blob([event.target.result], { type: file.type });
            const blobUrl = URL.createObjectURL(blob);
            
            // Tạo tên file ngẫu nhiên để không bị trùng (y hệt app Android)
            const extension = file.name.split('.').pop() || 'jpg';
            const randomFileName = `images/web_${new Date().getTime()}.${extension}`;
            
            // Nhét vào mảng ảnh đang edit
            window.currentEditingImages.push({
                path: randomFileName,
                blob: blob,
                url: blobUrl
            });
            
            // Vẽ lại khu vực ảnh trong Editor
            renderEditorImages();
            
            // Reset input tệp tin để có thể chọn lại cùng 1 file
            hiddenImageInput.value = '';
        };
        
        // Đọc file dưới dạng mảng nhị phân
        reader.readAsArrayBuffer(file);
    });

    // Các hiệu ứng Toolbar khác giữ nguyên
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

    // =================================================================
    // CẬP NHẬT LOGIC LƯU GHI CHÚ (BAO GỒM CẢ MẢNG ẢNH MỚI)
    // =================================================================
    document.getElementById('saveNoteBtn').addEventListener('click', async () => {
        if (!gapi.client.getToken()) {
            alert("Bạn cần đăng nhập Google trước!");
            return;
        }

        const title = editTitle.value.trim();
        const content = editBody.value.trim();
        const color = editorBody.style.backgroundColor;
        const tags = newTagInput.value ? newTagInput.value.split(',').map(t => t.trim()).filter(t => t) : [];

        // --- BỔ SUNG: CHUẨN BỊ MẢNG ĐƯỜNG DẪN ẢNH ĐỂ LƯU VÀO JSON ---
        const finalImagePaths = window.currentEditingImages.map(imgObj => imgObj.path);

        if (!window.globalNotesArray) window.globalNotesArray = [];
        
        if (window.currentEditingNoteId) {
            // Cập nhật
            const index = window.globalNotesArray.findIndex(n => n.id === window.currentEditingNoteId);
            if (index !== -1) {
                window.globalNotesArray[index].title = title;
                window.globalNotesArray[index].content = content;
                window.globalNotesArray[index].color = color;
                window.globalNotesArray[index].tags = tags;
                window.globalNotesArray[index].images = finalImagePaths; // Lưu mảng đường dẫn mới
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
                images: finalImagePaths, // Lưu mảng đường dẫn
                updatedAt: new Date().getTime(),
                createdAt: new Date().getTime()
            };
            window.globalNotesArray.unshift(newNote);
            window.currentEditingNoteId = newNote.id; 
        }

        // --- CỰC KỲ QUAN TRỌNG: CẬP NHẬT MẢNG ẢNH GỐC (GLOBAL MAP) TRƯỚC KHI NÉN ZIP ---
        // Chúng ta lấy mảng đang edit đổ vào mảng gốc để lát nữa hàm saveNotesToDrive lấy ra nén
        window.currentEditingImages.forEach(imgObj => {
            if (!window.globalImagesMap[imgObj.path]) {
                window.globalImagesMap[imgObj.path] = imgObj.blob;
                window.imageBlobUrls[imgObj.path] = imgObj.url;
            }
        });
        
        // (Tùy chọn) dọn dẹp các ảnh thừa trong globalImagesMap không còn ghi chú nào dùng đến. 
        // Phần này phức tạp, tạm thời bỏ qua, file ZIP sẽ hơi nặng nhưng an toàn.

        const saveBtn = document.getElementById('saveNoteBtn');
        saveBtn.innerHTML = '<i class="material-icons">sync</i>';
        
        // Gửi mảng dữ liệu đã cập nhật lên Drive
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
// PHẦN 2: GOOGLE DRIVE API & XỬ LÝ FILE ZIP
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
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', 
    });
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
        console.error(err);
        document.getElementById('syncText').innerText = "Lỗi đồng bộ";
    }
}

// ==========================================
// TẢI FILE ZIP TỪ DRIVE & GIẢI NÉN (GIỮ NGUYÊN)
// ==========================================
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

        // 1. Dùng JSZip để đọc file
        const zip = await JSZip.loadAsync(arrayBuffer);

        // 2. Lấy file data.json
        if (zip.file("data.json")) {
            const jsonStr = await zip.file("data.json").async("string");
            window.globalNotesArray = JSON.parse(jsonStr);
        } else {
            window.globalNotesArray = [];
        }

        // 3. Giải nén ảnh
        // Xóa các đường dẫn cũ để tránh tràn bộ nhớ
        for (let path in window.imageBlobUrls) {
            URL.revokeObjectURL(window.imageBlobUrls[path]);
        }
        window.globalImagesMap = {};
        window.imageBlobUrls = {};
        
        const zipFiles = Object.keys(zip.files);
        for (let i = 0; i < zipFiles.length; i++) {
            const filePath = zipFiles[i];
            if (filePath.startsWith('images/') && !zip.files[filePath].dir) {
                const blob = await zip.files[filePath].async("blob");
                window.globalImagesMap[filePath] = blob;
                window.imageBlobUrls[filePath] = URL.createObjectURL(blob);
            }
        }

        document.getElementById('syncText').innerText = "Đã đồng bộ";
        window.renderSyncedNotesToWeb(window.globalNotesArray);

    } catch (err) {
        handleDriveApiError(err);
    }
}

// ==========================================
// NÉN ZIP & ĐẨY LÊN DRIVE (CẬP NHẬT ĐỂ ĐÓNG GÓI ẢNH MỚI)
// ==========================================
window.saveNotesToDrive = async function(notesArray) {
    const syncText = document.getElementById('syncText');
    
    const tokenObj = gapi.client.getToken();
    if (!tokenObj) {
        clearDriveSession();
        return false;
    }
    const token = tokenObj.access_token;

    try {
        const zip = new JSZip();
        zip.file('data.json', JSON.stringify(notesArray));
        
        // --- CHÈN TẤT CẢ ẢNH CÓ TRONG GLOAL MAP VÀO ZIP ---
        // Bao gồm cả ảnh app Android tạo và ảnh Web vừa tạo
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
            if (!response.ok) {
                if (response.status === 401) throw { status: 401 };
                throw new Error("Lỗi update file");
            }
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
// PHẦN 3: VẼ GIAO DIỆN TRANG CHỦ (PREVIEW CÓ ẢNH)
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
        let tagsString = '';
        let tagsArray = [];
        if (note.tags && Array.isArray(note.tags)) tagsArray = note.tags;
        else if (typeof note.tags === 'string') tagsArray = note.tags.split(',').map(t => t.trim());
        if (tagsArray.length > 0) {
            tagsString = tagsArray.join(',');
            tagsArray.forEach(tag => { if(tag) tagsHtml += `<span class="tag">${tag}</span>`; });
        }
        card.setAttribute('data-tags', tagsString);

        // --- BỔ SUNG: RENDER ẢNH PREVIEW RA TRANG CHỦ ---
        let imagesPreviewHtml = '';
        if (note.images && Array.isArray(note.images) && note.images.length > 0) {
            imagesPreviewHtml = '<div class="note-images-preview" style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap;">';
            // Chỉ hiện tối đa 4 ảnh đầu tiên ra trang chủ cho đẹp
            note.images.slice(0, 4).forEach(imagePath => {
                if (window.imageBlobUrls[imagePath]) {
                    imagesPreviewHtml += `<img src="${window.imageBlobUrls[imagePath]}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">`;
                }
            });
            imagesPreviewHtml += '</div>';
        }

        card.innerHTML = `
            ${imagesPreviewHtml}
            <div class="note-title">${note.title || note.memoTitle || 'Không có tiêu đề'}</div>
            <div class="note-body">${note.content || note.memoContent || note.text || ''}</div>
            <div class="note-tags">${tagsHtml}</div>
        `;

        card.addEventListener('click', () => {
            window.openNoteInEditor(note);
        });

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
