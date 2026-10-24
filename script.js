// ===== Todo Pro - script.js =====

const STORAGE_KEY = 'todoPro.tasks';
const THEME_KEY = 'todoPro.theme';

// ----- State (সব ডেটা এখানে) -----
let tasks = loadTasks();
let statusFilter = 'all';
let categoryFilter = 'all';
let searchText = '';
let sortBy = 'newest';
let editId = null; // এডিট করার সময় টাস্কের id থাকবে

// ----- DOM Elements -----
const form = document.getElementById('taskForm');
const titleInput = document.getElementById('taskTitle');
const categoryInput = document.getElementById('taskCategory');
const priorityInput = document.getElementById('taskPriority');
const dueInput = document.getElementById('taskDue');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEdit');
const listEl = document.getElementById('taskList');
const emptyEl = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const categoryFilterEl = document.getElementById('categoryFilter');
const sortSelect = document.getElementById('sortSelect');
const clearCompletedBtn = document.getElementById('clearCompleted');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

// ===== localStorage =====
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ===== Helpers =====
// আজকের তারিখ YYYY-MM-DD ফরম্যাটে (লোকাল টাইম অনুযায়ী)
function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// XSS থেকে বাঁচতে ইউজারের টেক্সট escape করা
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const priorityColor = {
  High: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};
const priorityOrder = { High: 0, Medium: 1, Low: 2 };

// ===== Add / Update =====
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  if (editId) {
    // এডিট মোড
    const t = tasks.find((x) => x.id === editId);
    t.title = title;
    t.category = categoryInput.value;
    t.priority = priorityInput.value;
    t.due = dueInput.value;
    stopEditing();
  } else {
    // নতুন টাস্ক
    tasks.push({
      id: Date.now().toString(),
      title,
      category: categoryInput.value,
      priority: priorityInput.value,
      due: dueInput.value,
      done: false,
      createdAt: Date.now(),
    });
  }

  form.reset();
  priorityInput.value = 'Medium';
  saveTasks();
  render();
});

function startEditing(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  editId = id;
  titleInput.value = t.title;
  categoryInput.value = t.category;
  priorityInput.value = t.priority;
  dueInput.value = t.due;
  submitBtn.textContent = '✓ আপডেট করুন';
  cancelEditBtn.classList.remove('hidden');
  titleInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function stopEditing() {
  editId = null;
  submitBtn.textContent = '+ টাস্ক যোগ করুন';
  cancelEditBtn.classList.add('hidden');
}

cancelEditBtn.addEventListener('click', () => {
  stopEditing();
  form.reset();
  priorityInput.value = 'Medium';
});

// ===== Toggle / Delete (Event Delegation) =====
listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'toggle') {
    const t = tasks.find((x) => x.id === id);
    t.done = !t.done;
  } else if (action === 'delete') {
    if (!confirm('টাস্কটি মুছে ফেলবেন?')) return;
    tasks = tasks.filter((x) => x.id !== id);
    if (editId === id) stopEditing();
  } else if (action === 'edit') {
    startEditing(id);
    return;
  }
  saveTasks();
  render();
});

clearCompletedBtn.addEventListener('click', () => {
  if (!tasks.some((t) => t.done)) return;
  if (!confirm('সব সম্পন্ন টাস্ক মুছে ফেলবেন?')) return;
  tasks = tasks.filter((t) => !t.done);
  saveTasks();
  render();
});

// ===== Filters / Search / Sort =====
document.getElementById('statusFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  statusFilter = btn.dataset.filter;
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  render();
});
categoryFilterEl.addEventListener('change', () => {
  categoryFilter = categoryFilterEl.value;
  render();
});
sortSelect.addEventListener('change', () => {
  sortBy = sortSelect.value;
  render();
});
searchInput.addEventListener('input', () => {
  searchText = searchInput.value.trim().toLowerCase();
  render();
});

// ফিল্টার + সার্চ + সর্ট প্রয়োগ করে দেখানোর লিস্ট বানানো
function getVisibleTasks() {
  let list = tasks.filter((t) => {
    if (statusFilter === 'active' && t.done) return false;
    if (statusFilter === 'completed' && !t.done) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchText && !t.title.toLowerCase().includes(searchText)) return false;
    return true;
  });

  list.sort((a, b) => {
    if (sortBy === 'deadline') {
      // ডেডলাইন না থাকলে সবার শেষে
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    }
    if (sortBy === 'priority') {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.createdAt - a.createdAt; // newest
  });
  return list;
}

// ===== Render =====
function render() {
  const visible = getVisibleTasks();
  const today = todayStr();

  listEl.innerHTML = visible
    .map((t) => {
      const overdue = t.due && !t.done && t.due < today;
      const dueText = t.due
        ? `<span class="${overdue ? 'text-rose-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}">
             📅 ${t.due}${overdue ? ' (সময় শেষ!)' : ''}
           </span>`
        : '';

      return `
      <li class="task-item card p-4 flex items-start gap-3 ${overdue ? 'border-l-4 border-rose-500' : ''}">
        <button data-action="toggle" data-id="${t.id}"
          class="mt-1 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center
                 ${t.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-400'}">
          ${t.done ? '✓' : ''}
        </button>

        <div class="flex-1 min-w-0">
          <p class="font-semibold break-words ${t.done ? 'task-done' : ''}">${escapeHTML(t.title)}</p>
          <div class="flex flex-wrap items-center gap-2 mt-1 text-xs">
            <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">${t.category}</span>
            <span class="px-2 py-0.5 rounded-full ${priorityColor[t.priority]}">${t.priority}</span>
            ${dueText}
          </div>
        </div>

        <div class="flex gap-1 shrink-0">
          <button data-action="edit" data-id="${t.id}" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="এডিট">✏️</button>
          <button data-action="delete" data-id="${t.id}" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="ডিলিট">🗑️</button>
        </div>
      </li>`;
    })
    .join('');

  emptyEl.classList.toggle('hidden', visible.length > 0);
  updateStats();
}

function updateStats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statActive').textContent = total - done;
  document.getElementById('progressText').textContent = percent + '%';
  document.getElementById('progressBar').style.width = percent + '%';
}

// ===== Dark Mode =====
function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
});

// ===== Init =====
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
render();
