// === js/main.js ===
import { db, appState } from './db.js';
import { checkAndFetchDriveData } from './gdrive.js';
import { initEditor, openNoteInEditor } from './editor.js';
import { initCalendar, renderCalendarView, renderTagsSidebar, selectedFilterDate, selectedFilterTag, setSelectedFilterDate, setSelectedFilterTag } from './calendar.js';
import { extractTagsFromNote, extractImageNamesFromNote, indexToHex, getThemeAwareColor, hexToIndex, getImageUrlSafe, previewImageInApp } from './utils.js';

let currentRenderLimit = 20;
let filteredNotesCache = [];
let observer = null;
let searchQuery = ""; // Trạng thái tìm kiếm

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
    const emptyState = document.getElementById('emptyState');
    if (!notesGrid || !emptyState) return;
    
    if (resetLimit) {
        currentRenderLimit = 20;
        notesGrid.innerHTML = '';
        
        filteredNotesCache = appState.globalNotesArray.filter(note => {
            // Lọc theo tag
            if (selectedFilterTag) {
                const tagsArray = extractTagsFromNote(note);
                if (!tagsArray.includes(selectedFilterTag)) return false;
            }
            // Lọc theo ngày
            if (selectedFilterDate) {
                const noteDate = new Date(note.updatedAt || note.createdAt);
                if (noteDate.getFullYear() !== selectedFilterDate.getFullYear() ||
                    noteDate.getMonth() !== selectedFilterDate.getMonth() ||
                    noteDate.getDate() !== selectedFilterDate.getDate()) return false;
            }
            // Lọc theo Search Query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const titleStr = (note.title || note.memoTitle || '').toLowerCase();
                const bodyStr = (note.content || note.memoContent || note.text || '').toLowerCase();
                if (!titleStr.includes(query) && !bodyStr.includes(query)) return false;
            }
            return true; 
        });
    }

    // Hiển thị Empty State nếu không có dữ liệu
    if (filteredNotesCache.length === 0) {
        emptyState.style.display = 'flex';
        notesGrid.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        notesGrid.style.display = 'grid';
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
            tagsArray.forEach(tag => { if(tag) tagsHtml += `<span class="tag">#${tag}</span>`; });
        }
        
        let imagesPreviewHtml = '';
        const imageNames = extractImageNamesFromNote(note);
        let matchCount = imageNames.length;
        
        if (matchCount > 0) {
            imagesPreviewHtml += '<div class="note-images-preview" style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap;">';
            const previewNames = imageNames.slice(0, 4);
            const transparentGif = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
            previewNames.forEach(rawFileName => {
                imagesPreviewHtml += `<img loading="lazy" decoding="async" src="${transparentGif}" data-filename="${rawFileName}" class="preview-img lazy-local-img" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.05);">`;
            });
            imagesPreviewHtml += '</div>';
        }
        
        let displayContent = note.content || note.memoContent || note.text || '';
        displayContent = displayContent.replace(/<img[^>]*>/gi, ' <span style="color: #888; font-size: 0.9em; font-style: italic;">[Đã đính kèm ảnh]</span> ');
        
        card.innerHTML = `
            ${matchCount > 0 ? imagesPreviewHtml : ''}
            <div class="note-title">${note.title || note.memoTitle || ''}</div>
            <div class="note-body">${displayContent}</div>
            <div class="note-tags">${tagsHtml}</div>
        `;

        // MENU 3 CHẤM BÊN TRONG CARD
        const moreBtn = document.createElement('button');
        moreBtn.className = 'icon-btn note-more-btn';
        moreBtn.innerHTML = '<i class="material-icons">more_vert</i>';
        
        const dropdown = document.createElement('div');
        dropdown.className = 'note-dropdown-menu';
        dropdown.innerHTML = `
            <div class="dropdown-item edit-item"><i class="material-icons">edit</i> Sửa</div>
            <div class="dropdown-item danger-item delete-item"><i class="material-icons">delete</i> Xóa</div>
        `;

        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Đóng tất cả dropdown khác
            document.querySelectorAll('.note-dropdown-menu').forEach(el => el.style.display = 'none');
            dropdown.style.display = 'flex';
        });

        // Đóng dropdown khi click ra ngoài
        document.addEventListener('click', (e) => {
            if(!moreBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        dropdown.querySelector('.edit-item').addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = 'none';
            openNoteInEditor(note);
        });

        dropdown.querySelector('.delete-item').addEventListener('click', async (e) => {
            e.stopPropagation();
            dropdown.style.display = 'none';
            if(confirm("Bạn có chắc chắn muốn xóa ghi chú này?")) {
                note.isDeleted = true;
                note.syncStatus = 'pending';
                note.updatedAt = new Date().getTime();
                await db.notes.put(note);
                await loadNotesFromDBAndRender();
                import('./gdrive.js').then(module => module.saveNotesToDrive());
            }
        });

        card.appendChild(moreBtn);
        card.appendChild(dropdown);
        
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
                img.style.cursor = 'zoom-in';
                img.title = "Nhấp để xem phóng to";
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    previewImageInApp(img.src);
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
    // Sự kiện Search Input
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            renderSyncedNotesToWeb(true);
        });
    }

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
                searchQuery = "";
                if(searchInput) searchInput.value = "";
                renderSyncedNotesToWeb(true);
            }
            views.forEach(view => view.style.display = view.id === targetId ? 'block' : 'none');
        });
    });
    
    initEditor();
    initCalendar();
    
    const fabBtn = document.getElementById('fabBtn');
    const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
    const openEditorNew = () => {
        openNoteInEditor(null);
        document.getElementById('editNoteTitle').focus();
    };
    if (fabBtn) fabBtn.addEventListener('click', openEditorNew);
    if (emptyStateAddBtn) emptyStateAddBtn.addEventListener('click', openEditorNew);
    
    loadNotesFromDBAndRender();
    checkAndFetchDriveData();
});
