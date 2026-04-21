// === js/db.js ===

// 1. Khởi tạo Database
export const db = new Dexie('GinoNoteDB');
db.version(1).stores({
    notes: 'id, updatedAt, syncStatus',
    images: 'fileName, syncStatus',
    settings: 'key'
});

// 2. Quản lý State toàn cục (Thay thế toàn bộ window.xxx)
export const appState = {
    currentEditingNoteId: null,
    globalImagesMap: {},
    imageBlobUrls: {},
    currentEditingImages: [],
    currentEditingTags: [],
    lastSyncTime: parseInt(localStorage.getItem('gino_last_sync_time') || '0'),
    pendingUploadImages: [],
    currentNoteColorHex: '#FFFFFF',
    globalNotesArray: [],
    currentRawNoteData: null,
    // Google API State
    gapiInited: false,
    gisInited: false,
    tokenClient: null
};