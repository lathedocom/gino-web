// === js/calendar.js ===
import { appState } from './db.js';
import { extractTagsFromNote } from './utils.js';
import { renderSyncedNotesToWeb } from './main.js';

export let currentCalendarDate = new Date();
export let selectedFilterDate = null;
export let selectedFilterTag = null;

// Hàm setter để thay đổi trạng thái từ main.js
export function setSelectedFilterDate(val) {
    selectedFilterDate = val;
}

export function setSelectedFilterTag(val) {
    selectedFilterTag = val;
}

export function initCalendar() {
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendarView();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendarView();
    });

    document.getElementById('todayBtn').addEventListener('click', () => {
        currentCalendarDate = new Date();
        selectedFilterDate = null;
        renderCalendarView();
        renderSyncedNotesToWeb();
    });
}

export function renderCalendarView() {
    const grid = document.querySelector('.calendar-grid');
    const monthYearText = document.getElementById('calendarMonthYear');
    if (!grid) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Cập nhật text tiêu đề tháng/năm
    monthYearText.innerText = `Tháng ${month + 1}, ${year}`;

    const dayNames = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    dayNames.forEach(name => grid.appendChild(name));

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Tìm các ngày có ghi chú
    const daysWithNotes = new Set();
    appState.globalNotesArray.forEach(note => {
        if (note.isDeleted || note.is_deleted === 1) return;
        const noteDate = new Date(note.updatedAt || note.createdAt);
        if (noteDate.getFullYear() === year && noteDate.getMonth() === month) {
            daysWithNotes.add(noteDate.getDate());
        }
    });

    const today = new Date();
    // Tạo các ô trống đầu tháng
    for (let i = 0; i < startOffset; i++) {
        grid.appendChild(document.createElement('div'));
    }

    // Tạo các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';

        // Bọc số ngày vào thẻ span (Quan trọng để tạo vòng tròn Material)
        const dayNumberSpan = document.createElement('span');
        dayNumberSpan.className = 'day-number';
        dayNumberSpan.innerText = day;
        dayDiv.appendChild(dayNumberSpan);

        // Trạng thái ngày hiện tại (TodayDecorator)
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayDiv.classList.add('today');
        }

        // Trạng thái ngày đang chọn (SelectedDateDecorator)
        if (selectedFilterDate && selectedFilterDate.getFullYear() === year &&
            selectedFilterDate.getMonth() === month && selectedFilterDate.getDate() === day) {
            dayDiv.classList.add('selected');
        }

        // Trạng thái có ghi chú (EventDecorator - DotSpan)
        if (daysWithNotes.has(day)) {
            const dot = document.createElement('div');
            dot.className = 'note-dot';
            dayDiv.appendChild(dot);
        }

        dayDiv.addEventListener('click', () => {
            selectedFilterDate = new Date(year, month, day);
            selectedFilterTag = null;
            renderCalendarView();
            renderSyncedNotesToWeb();
        });

        grid.appendChild(dayDiv);
    }
}

export function renderTagsSidebar() {
    const tagCountMap = {};
    appState.globalNotesArray.forEach(note => {
        if (note.isDeleted || note.is_deleted === 1) return;
        let tagsArray = extractTagsFromNote(note);
        tagsArray.forEach(tag => {
            if (tag) tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
        });
    });
    
    const tagsContainer = document.getElementById('allTagsContainer');
    if(!tagsContainer) return;
    tagsContainer.innerHTML = '';

    let savedOrder = [];
    try {
        const orderStr = localStorage.getItem('gino_tag_order');
        if (orderStr) savedOrder = JSON.parse(orderStr);
    } catch(e) {}

    const sortedTags = Object.keys(tagCountMap).sort((a, b) => {
        const indexA = savedOrder.indexOf(a);
        const indexB = savedOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return tagCountMap[b] - tagCountMap[a];
        else if (indexA === -1) return 1;
        else if (indexB === -1) return -1;
        return indexA - indexB;
    });

    localStorage.setItem('gino_tag_order', JSON.stringify(sortedTags));
    
    sortedTags.forEach(tagText => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        
        // Thay đổi hiển thị dạng: #TagName ●Số_lượng
        tagSpan.innerText = `#${tagText} ●${tagCountMap[tagText]}`;
        
        tagSpan.addEventListener('click', () => {
            selectedFilterTag = tagText;
            selectedFilterDate = null;
            renderSyncedNotesToWeb();
        });
        
        tagsContainer.appendChild(tagSpan);
    });
}
