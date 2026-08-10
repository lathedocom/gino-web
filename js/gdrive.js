// === js/gdrive.js ===
import { db, appState } from './db.js';
import { loadNotesFromDBAndRender } from './main.js';
import { showToast } from './utils.js';
const CLIENT_ID = '631532964907-hi703ubcopoqjmv0e5fn6ui3h2u2mi5b.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenRefreshTimer = null;

// Hỗ trợ cập nhật giao diện Nút đồng bộ nhanh
function updateSyncUI(status) {
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    if (!btnAuthGoogle) return;
    if (status === 'syncing') {
        btnAuthGoogle.classList.add('active-auth');
        btnAuthGoogle.innerHTML = '<i class="material-icons is-syncing">sync</i>';
        btnAuthGoogle.title = 'Đang đồng bộ...';
    } else if (status === 'done') {
        btnAuthGoogle.classList.add('active-auth');
        btnAuthGoogle.innerHTML = '<i class="material-icons">cloud_done</i>';
        btnAuthGoogle.title = 'Đồng bộ thành công';
    } else if (status === 'error') {
        btnAuthGoogle.innerHTML = '<i class="material-icons">cloud_off</i>';
        btnAuthGoogle.title = 'Lỗi kết nối';
    } else if (status === 'logout') {
        btnAuthGoogle.classList.remove('active-auth');
        btnAuthGoogle.innerHTML = '<i class="material-icons">account_circle</i>';
        btnAuthGoogle.title = 'Chưa đăng nhập';
    }
}

window.gapiLoaded = function() {
    gapi.load('client', async () => {
        await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        appState.gapiInited = true;
        checkAndFetchDriveData();
    });
};

window.gisLoaded = function() {
    appState.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: ''
    });
    appState.gisInited = true;
    checkAndFetchDriveData();
};

export function checkAndFetchDriveData() {
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    if (!btnAuthGoogle) return;
    btnAuthGoogle.removeEventListener('click', handleAuthClick);
    btnAuthGoogle.addEventListener('click', handleAuthClick);

    if (!appState.gapiInited || !appState.gisInited) return;

    const savedToken = localStorage.getItem('gino_gdrive_token');
    const savedExpires = localStorage.getItem('gino_gdrive_expires');

    if (savedToken && savedExpires) {
        const timeRemaining = parseInt(savedExpires) - Date.now();
        if (timeRemaining > 60000) { 
            // Token vẫn còn hạn (còn hơn 1 phút)
            gapi.client.setToken({ access_token: savedToken });
            updateSyncUI('syncing');
            fetchNotesFromHiddenDrive().then(() => saveNotesToDrive());
            scheduleTokenRefresh(timeRemaining - 60000); // Lên lịch làm mới trước 1 phút
        } else {
            // Hết hạn hoặc sắp hết hạn -> Xin cấp lại ngay (ngầm)
            silentlyRefreshToken();
        }
    } else {
        clearDriveSession();
    }
}

function handleAuthClick(e) {
    e.preventDefault();
    if (!appState.gapiInited || !appState.gisInited) {
        alert("Dịch vụ Google đang tải, vui lòng thử lại sau giây lát!");
        return;
    }
    
    // Nếu đã có token và chưa hết hạn, người dùng bấm nút sẽ kích hoạt đồng bộ chủ động
    if (gapi.client.getToken() !== null) {
        updateSyncUI('syncing');
        fetchNotesFromHiddenDrive().then(() => saveNotesToDrive());
        return;
    }

    // Yêu cầu cấp quyền lần đầu (hiển thị popup)
    appState.tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            updateSyncUI('error');
            return;
        }
        handleTokenResponse(resp);
    };
    appState.tokenClient.requestAccessToken({ prompt: 'consent' });
}

// Hàm xin cấp lại token ngầm (không hiển thị popup)
export function silentlyRefreshToken() {
    if (!appState.tokenClient) return;
    appState.tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            clearDriveSession();
            return;
        }
        handleTokenResponse(resp);
    };
    appState.tokenClient.requestAccessToken({ prompt: '' });
}

function handleTokenResponse(resp) {
    const expiresAt = Date.now() + (resp.expires_in * 1000);
    localStorage.setItem('gino_gdrive_token', resp.access_token);
    localStorage.setItem('gino_gdrive_expires', expiresAt.toString());
    db.settings.put({ key: 'gdrive_token', value: resp.access_token });
    gapi.client.setToken({ access_token: resp.access_token });
    
    updateSyncUI('syncing');
    fetchNotesFromHiddenDrive().then(() => saveNotesToDrive());
    scheduleTokenRefresh((resp.expires_in * 1000) - 60000);
}

function scheduleTokenRefresh(timeoutMs) {
    if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = setTimeout(silentlyRefreshToken, timeoutMs);
}

function clearDriveSession() {
    localStorage.removeItem('gino_gdrive_token');
    localStorage.removeItem('gino_gdrive_expires');
    if (gapi && gapi.client) gapi.client.setToken(null);
    if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
    updateSyncUI('logout');
}

// Logic Đồng bộ xuống (Pull)
export async function fetchNotesFromHiddenDrive() {
    updateSyncUI('syncing');
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
            if (response.result.files) allFiles = allFiles.concat(response.result.files);
            pageToken = response.result.nextPageToken;
        } while (pageToken);

        if (allFiles.length === 0) {
            updateSyncUI('done');
            return;
        }

        let deltaFilesToDownload = [];
        let imagesToDownload = [];
        
        allFiles.forEach(f => {
            if (!f.name) return;
            const isDelta = f.name.startsWith('ginonote_delta_');
            const isSnapshot = f.name.startsWith('ginonote_snapshot_');
            
            if ((isDelta || isSnapshot) && f.name.endsWith('.json')) {
                let rawTimeStr = f.name.replace('ginonote_delta_', '').replace('ginonote_snapshot_', '').replace('.json', '');
                let extractedTs = parseInt(rawTimeStr.split('_')[0]);
                if (!isNaN(extractedTs) && extractedTs > (appState.lastSyncTime || 0)) {
                    deltaFilesToDownload.push({ file: f, ts: extractedTs });
                }
            } else if (f.name.endsWith('.jpg') || f.name.endsWith('.png') || f.name.endsWith('.webp') || f.mimeType === 'image/jpeg') {
                imagesToDownload.push(f);
            }
        });
        
        deltaFilesToDownload.sort((a, b) => a.ts - b.ts);
        const tokenObj = gapi.client.getToken();
        if(!tokenObj) throw { status: 401 };
        const token = tokenObj.access_token;
        let hasNewUpdates = false; // Biến cờ kiểm tra có dữ liệu mới không
        
        // Tải JSON
        if (deltaFilesToDownload.length > 0) {
            await Promise.all(deltaFilesToDownload.map(async (deltaObj) => {
                const res = await fetch(`https://www.googleapis.com/drive/v3/files/${deltaObj.file.id}?alt=media`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (res.ok) {
                    const deltaNotes = await res.json();
                    await mergeCloudToLocal(deltaNotes);
                }
            }));
            appState.lastSyncTime = deltaFilesToDownload[deltaFilesToDownload.length - 1].ts;
            localStorage.setItem('gino_last_sync_time', appState.lastSyncTime.toString());
            hasNewUpdates = true; // Có ghi chú mới
        }

        // Tải Ảnh
        const existingImageKeys = await db.images.toCollection().primaryKeys();
        const existingImagesSet = new Set(existingImageKeys);
        const missingImages = imagesToDownload.filter(f => !existingImagesSet.has(f.name));
        
        if (missingImages.length > 0) {
            const BATCH_SIZE = 5;
            for (let i = 0; i < missingImages.length; i += BATCH_SIZE) {
                const batch = missingImages.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (f) => {
                    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (res.ok) {
                        await db.images.put({ fileName: f.name, blob: await res.blob(), syncStatus: 'synced' });
                    }
                }));
            }
            hasNewUpdates = true; // Có ảnh mới
        }

        updateSyncUI('done');
        
        // Nếu thực sự có dữ liệu mới được kéo về, hiển thị thông báo và render lại UI
        if (hasNewUpdates) {
            showToast("Đã đồng bộ ghi chú mới từ các thiết bị khác!");
            await loadNotesFromDBAndRender();
        }

    } catch (err) {
        console.error("Lỗi Fetch Drive:", err);
        if (err.status === 401) {
            // Token hết hạn đột ngột, xin cấp lại ngay
            silentlyRefreshToken();
        } else {
            updateSyncUI('error');
        }
    }
}

async function mergeCloudToLocal(cloudNotes) {
    if (!Array.isArray(cloudNotes)) return;
    for (const cloudNote of cloudNotes) {
        const localNote = await db.notes.get(cloudNote.id);
        if (!localNote) {
            cloudNote.syncStatus = 'synced';
            await db.notes.put(cloudNote);
        } else {
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

// Logic Đồng bộ lên (Push)
export async function saveNotesToDrive() {
    const tokenObj = gapi.client.getToken();
    if (!tokenObj) return false;
    const token = tokenObj.access_token;
    
    updateSyncUI('syncing');
    
    try {
        const syncStartTime = Date.now();
        const pendingNotes = await db.notes.where('syncStatus').equals('pending').toArray();
        
        if (pendingNotes.length > 0) {
            const randomSuffix = Math.random().toString(36).substring(2, 10);
            const deltaFileName = `ginonote_delta_${syncStartTime}_${randomSuffix}.json`;
            const deltaBlob = new Blob([JSON.stringify(pendingNotes)], { type: 'application/json' });
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify({ name: deltaFileName, parents: ['appDataFolder'] })], { type: 'application/json' }));
            form.append('file', deltaBlob, deltaFileName);
            
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: form
            });
            if (response.status === 401) throw { status: 401 };
            if (!response.ok) throw new Error("Lỗi tải lên Delta");
            
            const ids = pendingNotes.map(n => n.id);
            await db.notes.where('id').anyOf(ids).modify({ syncStatus: 'synced' });
        }
        
        if (appState.pendingUploadImages && appState.pendingUploadImages.length > 0) {
            for (let imgObj of appState.pendingUploadImages) {
                const imgForm = new FormData();
                imgForm.append('metadata', new Blob([JSON.stringify({ name: imgObj.fileName, mimeType: 'image/jpeg', parents: ['appDataFolder'] })], { type: 'application/json' }));
                imgForm.append('file', imgObj.blob, imgObj.fileName);
                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: imgForm
                });
                if (response.status === 401) throw { status: 401 };
            }
            appState.pendingUploadImages = [];
        }
        
        appState.lastSyncTime = syncStartTime;
        localStorage.setItem('gino_last_sync_time', syncStartTime.toString());
        updateSyncUI('done');
        return true;
        
    } catch (err) {
        console.error("Lỗi Save Drive:", err);
        if (err.status === 401) {
            silentlyRefreshToken();
        } else {
            updateSyncUI('error');
        }
        return false;
    }
}
