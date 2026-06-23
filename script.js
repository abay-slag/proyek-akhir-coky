// --- Initial Data ---
const defaultStudios = [
    { id: 1, name: 'Studio A', equip: 'Drum, Guitar Amp, Bass Amp, Keyboard', capacity: 5, price: 100000, status: 'Tersedia' },
    { id: 2, name: 'Studio B', equip: 'Drum Premium, Marshall Amp, Mixer Digital', capacity: 7, price: 150000, status: 'Tersedia' },
    { id: 3, name: 'Studio C', equip: 'Full Band Setup, Recording Tools', capacity: 10, price: 250000, status: 'Tersedia' }
];

// --- State Management ---
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let studios = JSON.parse(localStorage.getItem('studios')) || defaultStudios;
let bookings = JSON.parse(localStorage.getItem('bookings')) || [];

// --- DOM Elements ---
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const displayUsername = document.getElementById('display-username');
const navLinks = document.querySelectorAll('.nav-links a[data-target]');
const sections = document.querySelectorAll('.content-section');
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');

// --- Initialization ---
function init() {
    if (!localStorage.getItem('studios')) saveStudios();
    checkAuth();
    bindEvents();
}

// --- Authentication ---
function checkAuth() {
    if (currentUser) {
        loginView.classList.remove('active');
        appView.classList.add('active');
        displayUsername.textContent = currentUser.username;

        // Show/Hide Admin Menu
        const adminNav = document.getElementById('nav-admin');
        if (currentUser.role === 'admin') {
            adminNav.style.display = 'block';
        } else {
            adminNav.style.display = 'none';
        }

        updateDashboard();
        renderStudios();
        renderBookingOptions();
        renderHistory();
        if (currentUser.role === 'admin') renderAdminTable();
    } else {
        loginView.classList.add('active');
        appView.classList.remove('active');
    }
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if (!user || !pass) {
        showToast('Harap isi username dan password', 'error');
        return;
    }

    if (user === 'admin' && pass === 'admin123') {
        currentUser = { username: user, role: 'admin' };
    } else {
        currentUser = { username: user, role: 'user' };
    }

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showToast('Login berhasil', 'success');
    loginForm.reset();
    checkAuth();
});

logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    currentUser = null;
    localStorage.removeItem('currentUser');
    checkAuth();
    showToast('Berhasil logout', 'success');
});

// --- Navigation & UI ---
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');

        // Update active class on nav
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Update active section
        sections.forEach(sec => sec.classList.remove('active'));
        document.getElementById(target).classList.add('active');

        // Refresh specific data
        if (target === 'dashboard') updateDashboard();
        if (target === 'jadwal') renderStudios();
        if (target === 'riwayat') renderHistory();
        if (target === 'admin') renderAdminTable();

        // Close sidebar on mobile after click
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    });
});

openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

// --- Dashboard Logic ---
function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.date === today).length;
    const availableStudios = studios.filter(s => s.status === 'Tersedia').length;

    document.getElementById('stat-studios').textContent = studios.length;
    document.getElementById('stat-today').textContent = todayBookings;
    document.getElementById('stat-available').textContent = availableStudios;
    document.getElementById('stat-total-booking').textContent = bookings.length;
}

// --- Schedule & Studio Render ---
function renderStudios() {
    const container = document.getElementById('studio-list');
    container.innerHTML = '';

    studios.forEach(s => {
        const badgeClass = s.status.toLowerCase();
        const card = document.createElement('div');
        card.className = 'studio-card glass';
        card.innerHTML = `
            <h3>${s.name}</h3>
            <p><strong>Kapasitas:</strong> ${s.capacity} Orang</p>
            <p><strong>Harga:</strong> Rp ${s.price.toLocaleString('id-ID')}/jam</p>
            <div class="equip"><strong>Peralatan:</strong><br>${s.equip}</div>
            <span class="badge ${badgeClass}">${s.status}</span>
        `;
        container.appendChild(card);
    });
}

// --- Booking Logic ---
function renderBookingOptions() {
    const select = document.getElementById('book-studio');
    select.innerHTML = '<option value="">-- Pilih Studio --</option>';
    studios.filter(s => s.status === 'Tersedia').forEach(s => {
        select.innerHTML += `<option value="${s.name}">${s.name} (Rp ${s.price.toLocaleString('id-ID')}/jam)</option>`;
    });
}

document.getElementById('booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const studioName = document.getElementById('book-studio').value;
    const date = document.getElementById('book-date').value;
    const start = document.getElementById('book-start').value;
    const end = document.getElementById('book-end').value;

    if (start >= end) {
        showToast('Jam selesai harus lebih besar dari jam mulai', 'error');
        return;
    }

    // Check Conflict
    const isConflict = bookings.some(b => {
        return b.studio === studioName &&
            b.date === date &&
            ((start >= b.start && start < b.end) || (end > b.start && end <= b.end) || (start <= b.start && end >= b.end));
    });

    if (isConflict) {
        showToast('Jadwal sudah dibooking pada jam tersebut', 'error');
        return;
    }

    const newBooking = {
        id: Date.now(),
        user: currentUser.username,
        studio: studioName,
        date: date,
        start: start,
        end: end,
        status: 'Berhasil'
    };

    bookings.push(newBooking);
    saveBookings();
    updateDashboard();
    renderHistory();
    showToast('Booking berhasil dibuat', 'success');
    e.target.reset();
});

// --- History Logic ---
function renderHistory(filterText = '', filterDate = '') {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    // Filter logic: Admin sees all, User sees own
    let userBookings = currentUser.role === 'admin' ? bookings : bookings.filter(b => b.user === currentUser.username);

    if (filterText) {
        userBookings = userBookings.filter(b => b.studio.toLowerCase().includes(filterText.toLowerCase()));
    }
    if (filterDate) {
        userBookings = userBookings.filter(b => b.date === filterDate);
    }

    if (userBookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Tidak ada data booking</td></tr>`;
        return;
    }

    userBookings.forEach(b => {
        const tr = document.createElement('tr');
        const formattedDate = b.date.split('-').reverse().join('/');
        tr.innerHTML = `
            <td>${b.studio}</td>
            <td>${formattedDate}</td>
            <td>${b.start} - ${b.end}</td>
            <td><span class="badge tersedia">${b.status}</span></td>
            <td><button class="btn-danger btn-sm" onclick="deleteBooking(${b.id})" style="padding: 5px 10px; font-size:0.8rem;">Hapus</button></td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('search-history').addEventListener('input', (e) => {
    renderHistory(e.target.value, document.getElementById('filter-date').value);
});

document.getElementById('filter-date').addEventListener('change', (e) => {
    renderHistory(document.getElementById('search-history').value, e.target.value);
});

document.getElementById('clear-history').addEventListener('click', () => {
    if (confirm('Yakin ingin menghapus semua riwayat Anda?')) {
        if (currentUser.role === 'admin') {
            bookings = [];
        } else {
            bookings = bookings.filter(b => b.user !== currentUser.username);
        }
        saveBookings();
        renderHistory();
        updateDashboard();
        showToast('Riwayat berhasil dihapus', 'success');
    }
});

window.deleteBooking = function(id) {
    bookings = bookings.filter(b => b.id !== id);
    saveBookings();
    renderHistory();
    updateDashboard();
    showToast('Booking dihapus', 'success');
}

// --- Admin Logic ---
const adminModal = document.getElementById('admin-modal');
const adminForm = document.getElementById('admin-form');

function renderAdminTable() {
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '';
    studios.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.name}</td>
            <td>${s.capacity}</td>
            <td>Rp ${s.price.toLocaleString('id-ID')}</td>
            <td><span class="badge ${s.status.toLowerCase()}">${s.status}</span></td>
            <td>
                <button onclick="editStudio(${s.id})" class="btn-primary" style="padding: 5px 10px; font-size:0.8rem; width:auto;">Edit</button>
                <button onclick="deleteStudio(${s.id})" class="btn-danger" style="padding: 5px 10px; font-size:0.8rem; width:auto;">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('btn-add-studio').addEventListener('click', () => {
    adminForm.reset();
    document.getElementById('admin-id').value = '';
    document.getElementById('modal-title').textContent = 'Tambah Studio';
    adminModal.classList.add('active');
});

document.getElementById('btn-cancel-modal').addEventListener('click', () => {
    adminModal.classList.remove('active');
});

adminForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('admin-id').value;
    const newStudio = {
        id: id ? parseInt(id) : Date.now(),
        name: document.getElementById('admin-name').value,
        equip: document.getElementById('admin-equip').value,
        capacity: parseInt(document.getElementById('admin-cap').value),
        price: parseInt(document.getElementById('admin-price').value),
        status: document.getElementById('admin-status').value
    };

    if (id) {
        const index = studios.findIndex(s => s.id === parseInt(id));
        studios[index] = newStudio;
        showToast('Studio berhasil diupdate', 'success');
    } else {
        studios.push(newStudio);
        showToast('Studio berhasil ditambahkan', 'success');
    }

    saveStudios();
    renderAdminTable();
    renderStudios();
    renderBookingOptions();
    adminModal.classList.remove('active');
});

window.editStudio = function(id) {
    const s = studios.find(st => st.id === id);
    if (s) {
        document.getElementById('admin-id').value = s.id;
        document.getElementById('admin-name').value = s.name;
        document.getElementById('admin-equip').value = s.equip;
        document.getElementById('admin-cap').value = s.capacity;
        document.getElementById('admin-price').value = s.price;
        document.getElementById('admin-status').value = s.status;

        document.getElementById('modal-title').textContent = 'Edit Studio';
        adminModal.classList.add('active');
    }
}

window.deleteStudio = function(id) {
    if (confirm('Yakin ingin menghapus studio ini?')) {
        studios = studios.filter(s => s.id !== id);
        saveStudios();
        renderAdminTable();
        renderStudios();
        renderBookingOptions();
        showToast('Studio dihapus', 'success');
    }
}

// --- Utils ---
function saveStudios() { localStorage.setItem('studios', JSON.stringify(studios)); }

function saveBookings() { localStorage.setItem('bookings', JSON.stringify(bookings)); }

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.4s ease reverse forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Run App
window.onload = init;