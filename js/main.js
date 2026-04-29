// === js/main.js ===
import { db, appState } from './db.js';
import { checkAndFetchDriveData } from './gdrive.js';
import { initEditor, openNoteInEditor } from './editor.js';
import { initCalendar, renderCalendarView, renderTagsSidebar, selectedFilterDate, selectedFilterTag, setSelectedFilterDate, setSelectedFilterTag } from './calendar.js';
import { extractTagsFromNote, extractImageNamesFromNote, indexToHex, getThemeAwareColor, hexToIndex, getImageUrlSafe, previewImageInApp } from './utils.js';

// Khai báo biến toàn cục cho Pagination
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
        
        // Chỉ lọc lại khi reset
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
            return true; 
        });
    }

    // Cắt mảng để render (Phân trang)
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
            imagesPreviewHtml += '<div class="note-images-preview" style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap;">';
            const previewNames = imageNames.slice(0, 4);
            
            previewNames.forEach(rawFileName => {
                // Sử dụng Placeholder base64 và loading="lazy" thay vì await trực tiếp
                const transparentGif = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                imagesPreviewHtml += `<img loading="lazy" decoding="async" src="${transparentGif}" data-filename="${rawFileName}" class="preview-img lazy-local-img" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; background: #e0e0e0;">`;
            });
            imagesPreviewHtml += '</div>';
        }
        
        let displayContent = note.content || note.memoContent || note.text || '';
        
        // [FIX]: Loại bỏ HOÀN TOÀN các thẻ <img> ra khỏi văn bản hiển thị. 
        // Thay thế bằng dòng chữ nhỏ để trình duyệt không gửi request ảo gây lỗi 404.
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

    // Kích hoạt tải ảnh bất đồng bộ không chặn luồng
    loadLazyImagesFromDexie();

    // Thiết lập IntersectionObserver cho cuộn vô hạn
    setupInfiniteScroll();

    if (resetLimit) {
        renderCalendarView();
        renderTagsSidebar();
    }
}

// Hàm chạy ngầm đổi thẻ img data-filename thành Blob URL từ Dexie
function loadLazyImagesFromDexie() {
    const lazyImages = document.querySelectorAll('.lazy-local-img');
    lazyImages.forEach(async (img) => {
        const fileName = img.getAttribute('data-filename');
        if (fileName) {
            const localUrl = await getImageUrlSafe(fileName);
            if (localUrl) {
                img.src = localUrl;
                img.classList.remove('lazy-local-img'); // Xóa class để không quét lại
                
                // Gắn sự kiện click phóng to sau khi có ảnh thật
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
    // Xóa trigger cũ nếu có
    const oldTrigger = document.getElementById('loadMoreTrigger');
    if (oldTrigger) oldTrigger.remove();

    // Nếu đã load hết thì không gắn thêm trigger
    if (currentRenderLimit >= filteredNotesCache.length) return;

    const trigger = document.createElement('div');
    trigger.id = 'loadMoreTrigger';
    trigger.style.height = '20px';
    document.getElementById('notesGrid').appendChild(trigger);

    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            currentRenderLimit += 20; // Tải thêm 20 note nữa
            renderSyncedNotesToWeb(false); // Gọi lại nhưng KHÔNG reset limit
        }
    }, { rootMargin: "100px" });

    observer.observe(trigger);
}

// BẮT ĐẦU CHẠY ỨNG DỤNG TẠI ĐÂY
document.addEventListener('DOMContentLoaded', () => {
    // CSS Fix (nếu chưa có bên HTML)
    const styleFix = document.createElement('style');
    styleFix.innerHTML = `
        .editor-body { display: flex; flex-direction: column; height: calc(100vh - 70px) !important; overflow-y: auto !important; }
        .editor-textarea { flex-grow: 1; min-height: 50vh; overflow-y: auto !important; resize: none; padding-bottom: 50px; }
        .note-editor-overlay { overflow: hidden !important; }
    `;
    document.head.appendChild(styleFix);
    
    // Xử lý điều hướng thanh bên (Sidebar)
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
                renderSyncedNotesToWeb(true);
            }
            views.forEach(view => view.style.display = view.id === targetId ? 'block' : 'none');
        });
    });
    
    // Khởi tạo UI Editor và Lịch
    initEditor();
    initCalendar();
    
    // Gắn sự kiện nút Add (FAB)
    const fabBtn = document.getElementById('fabBtn');
    if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            openNoteInEditor(null);
            document.getElementById('editNoteTitle').focus();
        });
    }
    
    // Tải dữ liệu từ Local
    loadNotesFromDBAndRender();
    
    // Nếu API Google đã tải xong trễ, gọi check ngay
    checkAndFetchDriveData();
});
