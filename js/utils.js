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

// [FIX] Cập nhật hàm xem ảnh: Hỗ trợ mảng ảnh, slider, và phím mũi tên
export function previewImageInApp(imageUrls, startIndex = 0) {
    // Tương thích ngược nếu chỉ truyền 1 URL dạng chuỗi
    if (typeof imageUrls === 'string') {
        imageUrls = [imageUrls];
        startIndex = 0;
    }
    
    let currentIndex = startIndex;
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; user-select: none;';
    
    const img = document.createElement('img');
    img.src = imageUrls[currentIndex];
    img.style.cssText = 'max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); transition: opacity 0.15s ease-in-out; cursor: pointer;';
    
    // Bộ đếm (VD: 1 / 4)
    const counter = document.createElement('div');
    counter.style.cssText = 'position: absolute; top: 20px; color: white; font-size: 16px; font-weight: bold; font-family: sans-serif; background: rgba(0,0,0,0.5); padding: 6px 16px; border-radius: 20px;';
    
    const updateUI = () => {
        if (imageUrls.length > 1) {
            counter.innerText = `${currentIndex + 1} / ${imageUrls.length}`;
            counter.style.display = 'block';
        } else {
            counter.style.display = 'none';
        }
    };
    updateUI();

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="material-icons">close</i>';
    closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; display: flex; align-items: center; justify-content: center;';
    closeBtn.addEventListener('click', closeOverlay);

    overlay.appendChild(counter);
    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    
    // Hàm chuyển ảnh mượt mà
    const showImage = (index) => {
        if (index < 0 || index >= imageUrls.length) return;
        currentIndex = index;
        img.style.opacity = '0.3';
        setTimeout(() => {
            img.src = imageUrls[currentIndex];
            img.style.opacity = '1';
            updateUI();
        }, 150);
    };

    // Xử lý phím mũi tên
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft') {
            showImage(currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
            showImage(currentIndex + 1);
        } else if (e.key === 'Escape') {
            closeOverlay();
        }
    };

    // Bấm hai bên rìa màn hình để chuyển ảnh, bấm ngoài để thoát
    overlay.addEventListener('click', (e) => {
        if (e.target === closeBtn || closeBtn.contains(e.target)) return;
        
        const clickX = e.clientX;
        const screenW = window.innerWidth;
        
        if (clickX < screenW / 3 && currentIndex > 0) {
            showImage(currentIndex - 1);
        } else if (clickX > screenW * 2 / 3 && currentIndex < imageUrls.length - 1) {
            showImage(currentIndex + 1);
        } else if (e.target === overlay) {
            closeOverlay();
        }
    });

    document.addEventListener('keydown', handleKeyDown);

    function closeOverlay() {
        document.removeEventListener('keydown', handleKeyDown);
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    }

    document.body.appendChild(overlay);
}
