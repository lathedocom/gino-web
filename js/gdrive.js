// === js/gdrive.js ===
import { db, appState } from './db.js';
import { loadNotesFromDBAndRender } from './main.js';

const CLIENT_ID = '631532964907-hi703ubcopoqjmv0e5fn6ui3h2u2mi5b.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// 1. Gắn hàm vào window để HTML gọi được khi script tải xong
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

// 2. Logic kiểm tra và xác thực
export function checkAndFetchDriveData() {
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    if (!btnAuthGoogle) return;

    btnAuthGoogle.removeEventListener('click', handleAuthClick);
    btnAuthGoogle.addEventListener('click', handleAuthClick);

    if (!appState.gapiInited || !appState.gisInited) return;

    const savedToken = localStorage.getItem('gino_gdrive_token');
    const savedExpires = localStorage.getItem('gino_gdrive_expires');

    if (savedToken && savedExpires && Date.now() < parseInt(savedExpires)) {
        gapi.client.setToken({ access_token: savedToken });
        
        btnAuthGoogle.classList.add('active-auth');
        btnAuthGoogle.innerHTML = '<i class="material-icons is-syncing">sync</i>';
        btnAuthGoogle.title = 'Đang đồng bộ';

        fetchNotesFromHiddenDrive().then(() => { saveNotesToDrive(); });
    } else {
        clearDriveSession();
    }
}

function handleAuthClick(e) {
    e.preventDefault();
    if (!appState.gapiInited || !appState.gisInited) {
        alert("Dịch vụ Google đang tải, vui lòng thử lại sau 1-2 giây!");
        return;
    }

    const btnAuthGoogle = document.getElementById('btnAuthGoogle');

    if (gapi.client.getToken() !== null) {
        if (btnAuthGoogle) {
            btnAuthGoogle.innerHTML = '<i class="material-icons is-syncing">sync</i>';
            btnAuthGoogle.title = 'Đang đồng bộ';
        }
        fetchNotesFromHiddenDrive().then(() => { saveNotesToDrive(); });
        return;
    }

    appState.tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            if (btnAuthGoogle) {
                btnAuthGoogle.innerHTML = '<i class="material-icons">cloud_off</i>';
                btnAuthGoogle.title = 'Lỗi';
            }
            return;
        }
        
        const expiresAt = Date.now() + (resp.expires_in * 1000);
        localStorage.setItem('gino_gdrive_token', resp.access_token);
        localStorage.setItem('gino_gdrive_expires', expiresAt.toString());
        
        if (btnAuthGoogle) {
            btnAuthGoogle.classList.add('active-auth');
            btnAuthGoogle.innerHTML = '<i class="material-icons is-syncing">sync</i>';
            btnAuthGoogle.title = 'Đang đồng bộ';
        }

        await fetchNotesFromHiddenDrive();
        await saveNotesToDrive();
    };
    appState.tokenClient.requestAccessToken({ prompt: 'consent' });
}

function clearDriveSession() {
    localStorage.removeItem('gino_gdrive_token');
    localStorage.removeItem('gino_gdrive_expires');
    
    if (gapi && gapi.client) gapi.client.setToken(null);
    
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    if (btnAuthGoogle) {
        btnAuthGoogle.classList.remove('active-auth');
        btnAuthGoogle.innerHTML = '<i class="material-icons">account_circle</i>';
        btnAuthGoogle.title = 'Chưa đăng nhập';
    }
}

// 3. Logic Đồng bộ xuống (Pull)
async function fetchNotesFromHiddenDrive() {
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    
    if (btnAuthGoogle) {
        btnAuthGoogle.innerHTML = '<i class="material-icons is-syncing">sync</i>';
        btnAuthGoogle.title = 'Đang đồng bộ';
    }

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
            if (btnAuthGoogle) {
                btnAuthGoogle.innerHTML = '<i class="material-icons">cloud_done</i>';
                btnAuthGoogle.title = 'Đồng bộ thành công';
            }
            return;
        }

        let deltaFilesToDownload = [];
        let imagesToDownload = [];
        
        allFiles.forEach(f => {
            if (!f.name) return;
            const isDelta = f.name.startsWith('ginonote_delta_');
            const isSnapshot = f.name.startsWith('ginonote_snapshot_');
            
            if ((isDelta || isSnapshot) && f.name.endsWith('.json')) {
                let rawTimeStr = f.name.replace('ginonote_delta_', '')
                                       .replace('ginonote_snapshot_', '')
                                       .replace('.json', '');
                let extractedTs = parseInt(rawTimeStr.split('_')[0]);
                if (!isNaN(extractedTs) && extractedTs > (appState.lastSyncTime || 0)) {
                    deltaFilesToDownload.push({ file: f, ts: extractedTs });
                }
            } else if (f.name.endsWith('.jpg') || f.name.endsWith('.png') || f.name.endsWith('.webp') || f.mimeType === 'image/jpeg') {
                imagesToDownload.push(f);
            }
        });

        deltaFilesToDownload.sort((a, b) => a.ts - b.ts);
        const token = gapi.client.getToken().access_token;
        
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
        }

        if (btnAuthGoogle) {
            btnAuthGoogle.innerHTML = '<i class="material-icons">cloud_done</i>';
            btnAuthGoogle.title = 'Đồng bộ thành công';
        }
        await loadNotesFromDBAndRender();

    } catch (err) {
        console.error(err);
        if (err.status === 401) {
            clearDriveSession();
        } else if (btnAuthGoogle) {
            btnAuthGoogle.innerHTML = '<i class="material-icons">cloud_off</i>';
            btnAuthGoogle.title = 'Lỗi';
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

// 4. Logic Đồng bộ lên (Push)
export async function saveNotesToDrive() {
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    const tokenObj = gapi.client.getToken();
    
    if (!tokenObj) return false;
    const token = tokenObj.access_token;

    if (btnAuthGoogle) {
        btnAuthGoogle.innerHTML = '<i class="material-icons is-syncing">sync</i>';
        btnAuthGoogle.title = 'Đang đồng bộ';
    }

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

            if (!response.ok) throw new Error("Lỗi tải lên Delta");

            const ids = pendingNotes.map(n => n.id);
            await db.notes.where('id').anyOf(ids).modify({ syncStatus: 'synced' });
        }

        if (appState.pendingUploadImages && appState.pendingUploadImages.length > 0) {
            for (let imgObj of appState.pendingUploadImages) {
                const imgForm = new FormData();
                imgForm.append('metadata', new Blob([JSON.stringify({ name: imgObj.fileName, mimeType: 'image/jpeg', parents: ['appDataFolder'] })], { type: 'application/json' }));
                imgForm.append('file', imgObj.blob, imgObj.fileName);
                await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: imgForm
                });
            }
            appState.pendingUploadImages = [];
        }

        appState.lastSyncTime = syncStartTime;
        localStorage.setItem('gino_last_sync_time', syncStartTime.toString());
        
        if (btnAuthGoogle) {
            btnAuthGoogle.innerHTML = '<i class="material-icons">cloud_done</i>';
            btnAuthGoogle.title = 'Đồng bộ thành công';
        }
        return true;
        
    } catch (err) {
        console.error(err);
        if (btnAuthGoogle) {
            btnAuthGoogle.innerHTML = '<i class="material-icons">cloud_off</i>';
            btnAuthGoogle.title = 'Lỗi';
        }
        return false;
    }
}
