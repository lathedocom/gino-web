// === js/main.js ===
import { db, appState } from './db.js';
import { checkAndFetchDriveData } from './gdrive.js';
import { initEditor, openNoteInEditor } from './editor.js';
import { initCalendar, renderCalendarView, renderTagsSidebar, selectedFilterDate, selectedFilterTag, setSelectedFilterDate, setSelectedFilterTag } from './calendar.js';
import { extractTagsFromNote, extractImageNamesFromNote, indexToHex, getThemeAwareColor, hexToIndex, getImageUrlSafe, previewImageInApp } from './utils.js';

let currentRenderLimit = 20;
let filteredNotesCache = [];
let observer = null;

export async function loadNotesFromDBAndRender() {
    try {
        const allNotes = await db.notes.filter(note => !note.isDeleted && note.is_deleted !== 1).toArray();
        allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
        appState.globalNotesArray = allNotes;
        renderSyncedNotesToWeb(true);
    } catch (err) {
        console.error("Lỗi Dexie:", err);
    }
}

export async function renderSyncedNotesToWeb(resetLimit = true) {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;

    if (resetLimit) {
        currentRenderLimit = 20;
        notesGrid.innerHTML = '';

        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        filteredNotesCache = appState.globalNotesArray.filter(note => {
            if (selectedFilterTag) {
                const tagsArray = extractTagsFromNote(note);
                if (!tagsArray.includes(selectedFilterTag)) return false;
            }
            if (selectedFilterDate) {
                const noteDate = new Date(note.updatedAt || note.createdAt);
                if (noteDate.getFullYear() !== selectedFilterDate.getFullYear() ||
                    noteDate.getMonth() !== selectedFilterDate.getMonth() ||
                    noteDate.getDate() !== selectedFilterDate.getDate()) return false;
            }
            if (searchTerm) {
                const title = (note.title || note.memoTitle || '').toLowerCase();
                const content = (note.content || note.memoContent || note.text || '').toLowerCase();
                if (!title.includes(searchTerm) && !content.includes(searchTerm)) {
                    return false;
                }
            }
            return true;
        });
    }

    const notesToRender = filteredNotesCache.slice(notesGrid.childElementCount, currentRenderLimit);
    
    for (const note of notesToRender) {
        const card = document.createElement('div');
        card.className = 'note-card';

        let displayIdx = note.colorIndex !== undefined ? note.colorIndex : hexToIndex(note.color || note.bgColor || '#FFFFFF');
        let cardHex = indexToHex(displayIdx);
        card.style.backgroundColor = getThemeAwareColor(cardHex);

        let tagsHtml = '';
        const tagsArray = extractTagsFromNote(note);
        if (tagsArray.length > 0) {
            card.setAttribute('data-tags', tagsArray.join(','));
            tagsArray.forEach(tag => { if(tag) tagsHtml += `<span class="tag">${tag}</span>`; });
        }

        let imagesPreviewHtml = '';
        const imageNames = extractImageNamesFromNote(note);
        let matchCount = imageNames.length;

        if (matchCount > 0) {
            // [FIX] Chuyển đổi thành cuộn ngang (overflow-x: auto), thêm flex-shrink: 0 cho các ảnh
            imagesPreviewHtml += '<div class="note-images-preview" style="display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; padding-bottom: 6px;">';
            
            // Render toàn bộ ảnh để có thể cuộn, không dùng hàm slice nữa
            imageNames.forEach(rawFileName => {
                const transparentGif = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                imagesPreviewHtml += `<img loading="lazy" decoding="async" src="${transparentGif}" data-filename="${rawFileName}" class="preview-img lazy-local-img" style="width: 64px; height: 64px; object-fit: cover; border-radius: 6px; border: 1px solid #eee; background: #e0e0e0; flex-shrink: 0; cursor: pointer;">`;
            });
            imagesPreviewHtml += '</div>';
        }

        let displayContent = note.content || note.memoContent || note.text || '';
        displayContent = displayContent.replace(/<img[^>]*>/gi, ' <span style="color: #888; font-size: 0.9em; font-style: italic;">[Đã đính kèm ảnh]</span> ');

        card.innerHTML = `
            ${matchCount > 0 ? imagesPreviewHtml : ''}
            <div class="note-title">${note.title || note.memoTitle || 'Không có tiêu đề'}</div>
            <div class="note-body">${displayContent}</div>
            <div class="note-tags">${tagsHtml}</div>
        `;

        card.addEventListener('click', () => { openNoteInEditor(note); });
        notesGrid.appendChild(card);
    }
    
    loadLazyImagesFromDexie();
    setupInfiniteScroll();
    
    if (resetLimit) {
        renderCalendarView();
        renderTagsSidebar();
    }
}

function loadLazyImagesFromDexie() {
    const lazyImages = document.querySelectorAll('.lazy-local-img');
    lazyImages.forEach(async (img) => {
        const fileName = img.getAttribute('data-filename');
        if (fileName) {
            const localUrl = await getImageUrlSafe(fileName);
            if (localUrl) {
                img.src = localUrl;
                img.classList.remove('lazy-local-img'); 

                // [FIX] Lấy danh sách toàn bộ ảnh thuộc ghi chú hiện tại để truyền vào Slider
                img.title = "Nhấp để xem";
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const container = img.closest('.note-images-preview');
                    const allImgs = Array.from(container.querySelectorAll('img.preview-img'));
                    const imageUrls = allImgs.map(i => i.src);
                    const currentIndex = allImgs.indexOf(img);
                    
                    previewImageInApp(imageUrls, currentIndex);
                });
            }
        }
    });
}

function setupInfiniteScroll() {
    const oldTrigger = document.getElementById('loadMoreTrigger');
    if (oldTrigger) oldTrigger.remove();
    
    if (currentRenderLimit >= filteredNotesCache.length) return;
    
    const trigger = document.createElement('div');
    trigger.id = 'loadMoreTrigger';
    trigger.style.height = '20px';
    document.getElementById('notesGrid').appendChild(trigger);
    
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            currentRenderLimit += 20; 
            renderSyncedNotesToWeb(false); 
        }
    }, { rootMargin: "100px" });
    
    observer.observe(trigger);
}

document.addEventListener('DOMContentLoaded', () => {
    const styleFix = document.createElement('style');
    styleFix.innerHTML = `
        .editor-body { display: flex; flex-direction: column; height: calc(100vh - 70px) !important; overflow-y: auto !important; }
        .editor-textarea { flex-grow: 1; min-height: 50vh; overflow-y: auto !important; resize: none; padding-bottom: 50px; }
        .note-editor-overlay { overflow: hidden !important; }
        
        /* [FIX] CSS tùy chỉnh thanh cuộn ngang cho vùng ảnh */
        .note-images-preview::-webkit-scrollbar, #editorImageArea::-webkit-scrollbar { height: 6px; }
        .note-images-preview::-webkit-scrollbar-thumb, #editorImageArea::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
    `;
    document.head.appendChild(styleFix);

    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');
    
    if(menuBtn) menuBtn.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            if(sidebar) sidebar.classList.remove('mobile-open');
            
            const targetId = this.getAttribute('data-target');
            if(targetId === 'viewNotes') {
                setSelectedFilterDate(null);
                setSelectedFilterTag(null);
                
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.value = '';
                
                renderSyncedNotesToWeb(true);
            }
            views.forEach(view => view.style.display = view.id === targetId ? 'block' : 'none');
        });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderSyncedNotesToWeb(true);
        });
    }

    initEditor();
    initCalendar();

    const fabBtn = document.getElementById('fabBtn');
    if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            openNoteInEditor(null);
            document.getElementById('editNoteTitle').focus();
        });
    }

    loadNotesFromDBAndRender();
    checkAndFetchDriveData();
});
