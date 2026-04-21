// === js/utils.js ===
import { db, appState } from './db.js';

export function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Bảng màu đồng bộ Android
export const colorIndexMap = {
    0: '#FFFFFF', // note_bg_default
    1: '#FFF9C4', // note_bg_yellow
    2: '#FFCDD2', // note_bg_red
    3: '#BBDEFB', // note_bg_blue
    4: '#C8E6C9', // note_bg_green
    5: '#E1BEE7'  // note_bg_purple
};

export function indexToHex(index) {
    return colorIndexMap[index] || '#FFFFFF';
}

export function hexToIndex(hexStr) {
    const hex = hexStr.toUpperCase();
    for (const [index, color] of Object.entries(colorIndexMap)) {
        if (color.toUpperCase() === hex) return parseInt(index);
    }
    return 0;
}

export function getThemeAwareColor(colorValue) {
    if (!colorValue) return 'var(--note-bg-default)';
    const hex = colorValue.toString().toUpperCase();
    const colorMap = {
        '#FFFFFF': 'var(--note-bg-default)',
        '#1E1E1E': 'var(--note-bg-default)',
        '#FFF9C4': 'var(--note-bg-yellow)',
        '#3E3B2E': 'var(--note-bg-yellow)',
        '#FFCDD2': 'var(--note-bg-red)',
        '#3E2723': 'var(--note-bg-red)',
        '#BBDEFB': 'var(--note-bg-blue)',
        '#1A2835': 'var(--note-bg-blue)',
        '#C8E6C9': 'var(--note-bg-green)',
        '#1B3320': 'var(--note-bg-green)',
        '#E1BEE7': 'var(--note-bg-purple)',
        '#2D2033': 'var(--note-bg-purple)'
    };
    return colorMap[hex] || colorValue;
}

// Trích xuất Tags và Images
export function extractTagsFromNote(note) {
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

export function extractImageNamesFromNote(note) {
    let imageNames = [];
    const rawPaths = note.imagePaths || note.images;
    if (rawPaths) {
        try {
            let parsed = JSON.parse(rawPaths);
            if (Array.isArray(parsed)) {
                imageNames = parsed.map(path => path.split('/').pop().split('\\').pop());
            }
        } catch(e) {}
    }
    return imageNames;
}

export async function getImageUrlSafe(fileName) {
    if (appState.imageBlobUrls[fileName]) {
        return appState.imageBlobUrls[fileName];
    }
    const imageRecord = await db.images.get(fileName);
    if (imageRecord && imageRecord.blob) {
        const url = URL.createObjectURL(imageRecord.blob);
        appState.imageBlobUrls[fileName] = url;
        return url;
    }
    return null;
}

export function previewImageInApp(imageUrl) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 99999; display: flex; align-items: center; justify-content: center; cursor: zoom-out;';
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = 'max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);';
    overlay.appendChild(img);
    overlay.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    document.body.appendChild(overlay);
}