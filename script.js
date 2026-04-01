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
    
    document.getElementById('syncText').innerText = "Đăng nhập Google";
    document.getElementById('btnAuthGoogle').classList.remove('active-auth');
}

// Hàm xử lý lỗi 401 (Hết hạn Token khi đang thao tác)
function handleDriveApiError(err) {
    console.error("Lỗi Google Drive API:", err);
    if (err.status === 401) {
        alert("Phiên đăng nhập Google đã hết hạn. Vui lòng bấm 'Đăng nhập Google' lại.");
        clearDriveSession();
    } else {
        document.getElementById('syncText').innerText = "Lỗi đồng bộ";
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
