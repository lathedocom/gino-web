// === js/editor.js ===
import { db, appState } from './db.js';
import { getThemeAwareColor, hexToIndex, indexToHex, extractTagsFromNote, extractImageNamesFromNote, getImageUrlSafe, generateUUID, previewImageInApp } from './utils.js';
import { saveNotesToDrive } from './gdrive.js';
import { loadNotesFromDBAndRender } from './main.js';

function setEditorMode(isEditing) {
    const editNoteModeBtn = document.getElementById('editNoteModeBtn');
    const editModeToolbar = document.getElementById('editModeToolbar');
    const editorBody = document.getElementById('editorBody');
    const newTagInput = document.getElementById('newTagInput');
    const editBody = document.getElementById('editNoteBody');
    
    if (isEditing) {
        editNoteModeBtn.style.display = 'none';
        editModeToolbar.style.display = 'flex';
        editorBody.classList.remove('readonly-mode');
        newTagInput.style.display = 'inline-block';
        editBody.removeAttribute('readonly');
        document.querySelectorAll('.image-remove-btn, .remove-tag-btn').forEach(b => b.style.display = 'flex');
    } else {
        editNoteModeBtn.style.display = 'flex';
        editModeToolbar.style.display = 'none';
        editorBody.classList.add('readonly-mode');
        newTagInput.style.display = 'none';
        editBody.setAttribute('readonly', 'true');
        document.querySelectorAll('.image-remove-btn, .remove-tag-btn').forEach(b => b.style.display = 'none');
    }
}

function renderEditorTagsUI() {
    const list = document.getElementById('editorTagList');
    const editModeToolbar = document.getElementById('editModeToolbar');
    if (!list) return;
    list.innerHTML = '';
    appState.currentEditingTags.forEach((tag, index) => {
        if (!tag.trim()) return;
        const span = document.createElement('span');
        span.className = 'tag editor-tag-item';
        span.innerHTML = `${tag} <i class="material-icons remove-tag-btn" style="font-size: 14px; display: ${editModeToolbar.style.display === 'flex' ? 'flex' : 'none'};">close</i>`;
        span.querySelector('.remove-tag-btn').addEventListener('click', () => {
            appState.currentEditingTags.splice(index, 1);
            renderEditorTagsUI();
        });
        list.appendChild(span);
    });
}

function renderEditorImages() {
    let imageArea = document.getElementById('editorImageArea');
    const editModeToolbar = document.getElementById('editModeToolbar');
    
    if (!imageArea) {
        imageArea = document.createElement('div');
        imageArea.id = 'editorImageArea';
        imageArea.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0; margin-bottom: 10px; border-bottom: 1px solid #eee; flex-shrink: 0;';
        const tagsArea = document.getElementById('editorTagsArea');
        tagsArea.parentNode.insertBefore(imageArea, tagsArea.nextSibling);
    }
    imageArea.innerHTML = '';
    
    if (appState.currentEditingImages.length === 0) {
        imageArea.style.display = 'none';
        return;
    }
    imageArea.style.display = 'flex';
    
    appState.currentEditingImages.forEach((imgObj, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position: relative; width: 80px; height: 80px; border-radius: 4px; overflow: hidden; border: 1px solid #ddd;';
        
        const img = document.createElement('img');
        img.src = imgObj.url;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        img.style.cursor = 'zoom-in';
        img.title = "Nhấp để xem phóng to";
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            previewImageInApp(img.src);
        });
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'image-remove-btn';
        removeBtn.innerHTML = '<i class="material-icons" style="font-size: 16px;">close</i>';
        removeBtn.style.cssText = 'position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; cursor: pointer; display: none; align-items: center; justify-content: center; padding: 0;';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            appState.currentEditingImages.splice(index, 1);
            renderEditorImages();
        });
        
        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        imageArea.appendChild(wrapper);
    });
    
    const isEditing = editModeToolbar && editModeToolbar.style.display === 'flex';
    document.querySelectorAll('.image-remove-btn').forEach(b => b.style.display = isEditing ? 'flex' : 'none');
}

export async function openNoteInEditor(noteData) {
    const deleteBtn = document.getElementById('deleteNoteBtn');
    const editTitle = document.getElementById('editNoteTitle');
    const editBody = document.getElementById('editNoteBody');
    const newTagInput = document.getElementById('newTagInput');
    const editorBody = document.getElementById('editorBody');
    const colorPalettePopup = document.getElementById('colorPalettePopup');
    const timeDisplay = document.getElementById('editNoteTime');
    const noteEditor = document.getElementById('noteEditor');
    
    editTitle.value = '';
    editBody.value = '';
    if (newTagInput) newTagInput.value = '';
    editorBody.style.backgroundColor = 'var(--note-default)';
    appState.currentNoteColorHex = '#FFFFFF';
    colorPalettePopup.classList.remove('open');
    
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
    document.querySelector('.color-option.default').classList.add('active');
    
    appState.currentEditingImages = [];
    appState.currentRawNoteData = null;
    
    if (noteData) {
        if (deleteBtn) deleteBtn.style.display = 'flex';
        appState.currentEditingNoteId = noteData.id;
        appState.currentRawNoteData = noteData;
        editTitle.value = noteData.title || noteData.memoTitle || '';

        let rawContent = noteData.content || noteData.memoContent || noteData.text || '';
        rawContent = rawContent.replace(/<img[^>]*src="[^"]*"[^>]*>/gi, '');
        editBody.value = rawContent.trim();

        const dateObj = new Date(noteData.updatedAt || noteData.createdAt || Date.now());
        if (timeDisplay) timeDisplay.innerText = "Cập nhật: " + dateObj.toLocaleString('vi-VN');

        let savedIndex = noteData.colorIndex !== undefined ? noteData.colorIndex : hexToIndex(noteData.color || noteData.bgColor || '#FFFFFF');
        appState.currentNoteColorHex = indexToHex(savedIndex);
        editorBody.style.backgroundColor = getThemeAwareColor(appState.currentNoteColorHex);

        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('active');
            if(opt.getAttribute('data-color').toUpperCase() === appState.currentNoteColorHex.toUpperCase()) {
                opt.classList.add('active');
            }
        });

        appState.currentEditingTags = extractTagsFromNote(noteData);
        renderEditorTagsUI();

        const imageNames = extractImageNamesFromNote(noteData);
        for (let rawFileName of imageNames) {
            let localUrl = await getImageUrlSafe(rawFileName);
            if (localUrl) {
                appState.currentEditingImages.push({ fileName: rawFileName, url: localUrl });
            }
        }
        renderEditorImages();
        setEditorMode(false);
    } else {
        if (deleteBtn) deleteBtn.style.display = 'none';
        appState.currentEditingNoteId = null;
        appState.currentEditingTags = [];
        if (timeDisplay) timeDisplay.innerText = "Đang tạo mới...";
        renderEditorTagsUI();
        renderEditorImages();
        setEditorMode(true);
    }
    noteEditor.classList.add('active');
}

export function initEditor() {
    const editNoteModeBtn = document.getElementById('editNoteModeBtn');
    const editBody = document.getElementById('editNoteBody');
    const newTagInput = document.getElementById('newTagInput');
    const colorPalettePopup = document.getElementById('colorPalettePopup');
    const editorBody = document.getElementById('editorBody');
    
    editNoteModeBtn.addEventListener('click', () => { setEditorMode(true); editBody.focus(); });

    document.getElementById('closeEditorBtn').addEventListener('click', () => {
        document.getElementById('noteEditor').classList.remove('active');
        colorPalettePopup.classList.remove('open');
    });
    
    if (newTagInput) {
        newTagInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = this.value.trim();
                if (val && !appState.currentEditingTags.includes(val)) {
                    appState.currentEditingTags.push(val);
                    this.value = '';
                    renderEditorTagsUI();
                }
            }
        });
    }
    
    // Sự kiện Delete
    document.getElementById('deleteNoteBtn').addEventListener('click', async () => {
        if (!appState.currentEditingNoteId) return;
        const confirmDelete = confirm("Bạn có chắc chắn muốn xóa ghi chú này không?");
        if (!confirmDelete) return;

        let noteData = await db.notes.get(appState.currentEditingNoteId);
        if (noteData) {
            noteData.isDeleted = true;
            noteData.syncStatus = 'pending';
            noteData.updatedAt = new Date().getTime();
            await db.notes.put(noteData);
            document.getElementById('noteEditor').classList.remove('active');
            await loadNotesFromDBAndRender();
            const syncText = document.getElementById('syncText');
            if (syncText) syncText.innerText = "Đang đồng bộ xóa...";
            await saveNotesToDrive();
        }
    });
    
    // Chèn ảnh
    const insertImageBtn = document.getElementById('insertImageBtn');
    const hiddenImageInput = document.getElementById('hiddenImageInput');
    insertImageBtn.addEventListener('click', () => hiddenImageInput.click());
    hiddenImageInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = async function() {
                const MAX_WIDTH = 1200;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(async (blob) => {
                    const uniqueFileName = `${generateUUID()}.jpg`;
                    const blobUrl = URL.createObjectURL(blob);
                    await db.images.put({ fileName: uniqueFileName, blob: blob, syncStatus: 'pending' });
                    appState.currentEditingImages.push({
                        fileName: uniqueFileName, url: blobUrl, blob: blob, isNew: true
                    });
                    renderEditorImages();
                }, 'image/jpeg', 0.8);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
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
            appState.currentNoteColorHex = this.getAttribute('data-color');
            editorBody.style.backgroundColor = getThemeAwareColor(appState.currentNoteColorHex);
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Sự kiện Nút LƯU (Đã xử lý chống kẹt nút)
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    saveNoteBtn.addEventListener('click', async function() {
        // Kiểm tra xem nút có đang bị khóa không
        if (this.classList.contains('is-processing')) return;
        
        // Khóa nút, đổi icon sang trạng thái đang tải
        this.classList.add('is-processing');
        this.style.opacity = '0.5';
        this.style.pointerEvents = 'none'; // Chặn click triệt để
        this.innerHTML = '<i class="material-icons">sync</i>';

        try {
            const editTitle = document.getElementById('editNoteTitle');
            const title = editTitle.value.trim();
            const content = editBody.value.trim();
            
            // Xử lý Tag
            if (newTagInput && newTagInput.value.trim() !== '') {
                const val = newTagInput.value.trim();
                if (!appState.currentEditingTags.includes(val)) appState.currentEditingTags.push(val);
                newTagInput.value = '';
                renderEditorTagsUI();
            }
            
            const tags = appState.currentEditingTags;
            const androidPrefix = "/data/user/0/com.lathedo.ginonote/files/images/";
            const finalFileNames = appState.currentEditingImages.map(imgObj => androidPrefix + imgObj.fileName);
            
            let noteData = appState.currentRawNoteData ? { ...appState.currentRawNoteData } : {};
            noteData.id = appState.currentEditingNoteId || new Date().getTime();
            noteData.title = title;
            noteData.content = content;
            noteData.colorIndex = hexToIndex(appState.currentNoteColorHex);
            noteData.tags = JSON.stringify(tags);
            noteData.imagePaths = JSON.stringify(finalFileNames);
            noteData.updatedAt = new Date().getTime();
            noteData.isDeleted = false;
            noteData.syncStatus = 'pending';
            
            if (!appState.currentEditingNoteId) noteData.createdAt = noteData.updatedAt;
            
            await db.notes.put(noteData);
            
            appState.currentEditingImages.forEach(imgObj => {
                if (imgObj.isNew) {
                    if (!appState.pendingUploadImages) appState.pendingUploadImages = [];
                    appState.pendingUploadImages.push(imgObj);
                    imgObj.isNew = false;
                }
            });
            
            setEditorMode(false);
            await loadNotesFromDBAndRender();
            
            // Đồng bộ ngầm với Google Drive
            const isSuccess = await saveNotesToDrive();
            
            if (isSuccess) {
                noteData.syncStatus = 'synced';
                await db.notes.put(noteData);
                await loadNotesFromDBAndRender();
            }
        } catch (error) {
            console.error("Lỗi khi lưu:", error);
        } finally {
            // Mở khóa nút khi mọi thứ đã xong
            this.classList.remove('is-processing');
            this.style.opacity = '1';
            this.style.pointerEvents = 'auto';
            this.innerHTML = '<i class="material-icons">save</i>';
        }
    });
}