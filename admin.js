// Admin Panel — AlfaMen BarberShop

const admin = {
    availableIcons: [
        'fa-scissors','fa-user-tie','fa-pump-soap','fa-spray-can','fa-wind',
        'fa-fire','fa-brush','fa-bottle-droplet','fa-mask','fa-wand-magic-sparkles',
        'fa-bolt','fa-crown','fa-droplet','fa-star','fa-check'
    ],
    defaultServices: [
        { id: 1, name: 'Corte de Cabelo', price: 30, icon: 'fa-scissors' },
        { id: 2, name: 'Barba Terapia',   price: 30, icon: 'fa-fire' },
        { id: 3, name: 'Cabelo + Barba',  price: 55, icon: 'fa-user-tie' },
        { id: 4, name: 'Sobrancelha',     price: 10, icon: 'fa-mask' },
        { id: 5, name: 'Pigmentação',     price: 45, icon: 'fa-spray-can' }
    ],
    state: {
        services: [], bookings: [], config: {}, credentials: {},
        theme: 'light', currentPeriod: 'week', editingServiceIndex: null
    },

    init() {
        this.state.services    = JSON.parse(localStorage.getItem('pantera_services'))    || this.defaultServices;
        this.state.bookings    = JSON.parse(localStorage.getItem('pantera_bookings'))    || [];
        this.state.config      = JSON.parse(localStorage.getItem('pantera_config'))      || { whatsapp: '' };
        this.state.credentials = JSON.parse(localStorage.getItem('pantera_credentials')) || { user: 'adm1', pass: '123' };

        const theme = localStorage.getItem('pantera_theme') || 'light';
        this.setTheme(theme);

        const isLogged = localStorage.getItem('pantera_admin_logged_in') === 'true';
        if (isLogged) this.showPanel();
    },

    login() {
        const u = document.getElementById('login-user').value.trim();
        const p = document.getElementById('login-pass').value.trim();
        const cred = this.state.credentials;
        if (u === cred.user && p === cred.pass) {
            localStorage.setItem('pantera_admin_logged_in', 'true');
            document.getElementById('login-error').classList.add('hidden');
            this.showPanel();
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    },

    showPanel() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        this.switchPage('dashboard');
        this.updateBadge();
    },

    logout() {
        localStorage.setItem('pantera_admin_logged_in', 'false');
        document.getElementById('admin-panel').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('login-user').value = '';
        document.getElementById('login-pass').value = '';
    },

    toggleTheme() { this.setTheme(this.state.theme === 'light' ? 'dark' : 'light'); },
    setTheme(n) {
        this.state.theme = n;
        document.documentElement.setAttribute('data-theme', n);
        localStorage.setItem('pantera_theme', n);
        const icon = document.getElementById('admin-theme-icon');
        if (icon) icon.className = n === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    },

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
    },

    switchPage(page) {
        // close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');

        document.querySelectorAll('.admin-page').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

        document.getElementById(`page-${page}`).classList.remove('hidden');
        const navBtn = document.getElementById(`nav-${page}`);
        if (navBtn) navBtn.classList.add('active');

        const titles = { dashboard:'Dashboard', bookings:'Agendamentos', history:'Histórico', services:'Serviços', config:'Configurações' };
        const mTitle = document.getElementById('mobile-page-title');
        if (mTitle) mTitle.textContent = titles[page] || '';

        if (page === 'dashboard') this.renderDashboard();
        if (page === 'bookings')  this.renderBookings();
        if (page === 'history')   this.renderHistory();
        if (page === 'services')  this.renderServices();
        if (page === 'config')    this.renderConfig();
    },

    updateBadge() {
        const badge = document.getElementById('badge-bookings');
        if (badge) badge.textContent = this.state.bookings.length;
    },

    // ── DASHBOARD ──────────────────────────────────────────────────────

    setPeriod(p) {
        this.state.currentPeriod = p;
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`period-${p}`).classList.add('active');
        this.renderDashboard();
    },

    getFilteredBookings(period) {
        const now = new Date();
        return this.state.bookings.filter(b => {
            const d = this.parseDate(b.date);
            if (!d) return false;
            const diff = (now - d) / 86400000;
            if (period === 'week')  return diff >= 0 && diff <= 7;
            if (period === 'month') return diff >= 0 && diff <= 30;
            return true;
        });
    },

    parseDate(str) {
        if (!str) return null;
        const [d, m, y] = str.split('/');
        if (!d || !m || !y) return null;
        return new Date(`${y}-${m}-${d}`);
    },

    renderDashboard() {
        const all = this.state.bookings;
        const filtered = this.getFilteredBookings(this.state.currentPeriod);

        // KPIs
        const totalRevenue = all.reduce((s, b) => s + Number(b.price || 0), 0);
        const todayStr = new Date().toLocaleDateString('pt-BR');
        const todayBookings = all.filter(b => b.date === todayStr);
        const svcCount = {};
        all.forEach(b => { svcCount[b.service] = (svcCount[b.service]||0) + 1; });
        const topSvc = Object.entries(svcCount).sort((a,b)=>b[1]-a[1])[0];

        document.getElementById('kpi-revenue').textContent  = `R$ ${totalRevenue.toLocaleString('pt-BR')}`;
        document.getElementById('kpi-bookings').textContent = all.length;
        document.getElementById('kpi-today').textContent    = todayBookings.length;
        document.getElementById('kpi-top-service').textContent = topSvc ? topSvc[0] : '—';

        const labels = { week:'Últimos 7 dias', month:'Últimos 30 dias', all:'Todo o período' };
        document.getElementById('dash-period-label').textContent = labels[this.state.currentPeriod];

        this.renderRevenueChart(filtered);
        this.renderServiceBreakdown(filtered);
        this.renderTodaySchedule(todayBookings);
    },

    renderRevenueChart(bookings) {
        const chart = document.getElementById('revenue-chart');
        const empty = document.getElementById('chart-empty');
        chart.innerHTML = '';
        if (!bookings.length) { chart.classList.add('hidden'); empty.classList.remove('hidden'); return; }
        chart.classList.remove('hidden'); empty.classList.add('hidden');

        // Group by date
        const byDate = {};
        bookings.forEach(b => {
            byDate[b.date] = (byDate[b.date]||0) + Number(b.price||0);
        });

        const entries = Object.entries(byDate).sort((a,b) => {
            return (this.parseDate(a[0])||0) - (this.parseDate(b[0])||0);
        });

        const maxVal = Math.max(...entries.map(e => e[1]), 1);

        entries.forEach(([date, val]) => {
            const pct = Math.max((val/maxVal)*100, 4);
            const parts = date.split('/');
            const label = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : date;
            const wrap = document.createElement('div');
            wrap.className = 'chart-bar-wrap';
            wrap.innerHTML = `
                <div class="chart-bar-value">R$${val}</div>
                <div class="chart-bar-bg">
                    <div class="chart-bar-fill" style="height:${pct}%"></div>
                </div>
                <div class="chart-bar-label">${label}</div>`;
            chart.appendChild(wrap);
        });
    },

    renderServiceBreakdown(bookings) {
        const container = document.getElementById('service-breakdown');
        container.innerHTML = '';
        if (!bookings.length) { container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Sem dados no período.</p>'; return; }

        const svcRev = {}, svcCount = {};
        bookings.forEach(b => {
            svcRev[b.service]   = (svcRev[b.service]||0) + Number(b.price||0);
            svcCount[b.service] = (svcCount[b.service]||0) + 1;
        });
        const maxRev = Math.max(...Object.values(svcRev), 1);

        Object.entries(svcRev).sort((a,b)=>b[1]-a[1]).forEach(([name, rev]) => {
            const pct = (rev/maxRev)*100;
            const item = document.createElement('div');
            item.className = 'breakdown-item';
            item.innerHTML = `
                <div class="breakdown-name">${name}</div>
                <div class="breakdown-bar-bg"><div class="breakdown-bar-fill" style="width:${pct}%"></div></div>
                <div class="breakdown-stats">
                    <span>${svcCount[name]} agend.</span>
                    <span class="breakdown-revenue">R$ ${rev.toLocaleString('pt-BR')}</span>
                </div>`;
            container.appendChild(item);
        });
    },

    renderTodaySchedule(todayBookings) {
        const list = document.getElementById('today-schedule');
        list.innerHTML = '';
        if (!todayBookings.length) {
            list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>Nenhum agendamento hoje.</p></div>';
            return;
        }
        const sorted = [...todayBookings].sort((a,b)=> a.time.localeCompare(b.time));
        sorted.forEach(b => {
            const item = document.createElement('div');
            item.className = 'today-item';
            item.innerHTML = `
                <div class="today-time">${b.time}</div>
                <div class="today-info">
                    <div class="today-service">${b.service}</div>
                    <div class="today-client">${b.clientName} · ${b.clientPhone}</div>
                </div>
                <div class="today-price">R$ ${Number(b.price||0).toLocaleString('pt-BR')}</div>`;
            list.appendChild(item);
        });
    },

    // ── BOOKINGS ───────────────────────────────────────────────────────

    filterBookings() {
        const dateVal = document.getElementById('filter-date').value;
        if (!dateVal) return this.renderBookings();
        const [y,m,d] = dateVal.split('-');
        const target = `${d}/${m}/${y}`;
        this.renderBookingsList(this.state.bookings.filter(b => b.date === target));
    },

    clearFilter() {
        document.getElementById('filter-date').value = '';
        this.renderBookings();
    },

    renderBookings() {
        const sorted = [...this.state.bookings].sort((a,b)=> b.id - a.id);
        this.renderBookingsList(sorted, true);
    },

    renderBookingsList(list, showDelete = true) {
        const container = document.getElementById('bookings-list');
        container.innerHTML = '';
        if (!list.length) {
            container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>Nenhum agendamento encontrado.</p></div>';
            return;
        }
        list.forEach(b => container.appendChild(this.buildBookingCard(b, showDelete)));
    },

    buildBookingCard(b, showDelete) {
        const card = document.createElement('div');
        card.className = 'booking-card';
        const parts = (b.date||'').split('/');
        const day   = parts[0] || '—';
        const mon   = parts[1] ? this.monthName(Number(parts[1])) : '';
        card.innerHTML = `
            <div class="booking-date-badge">
                <div class="day">${day}</div>
                <div class="month">${mon}</div>
            </div>
            <div class="booking-info">
                <div class="booking-time">${b.time || ''}</div>
                <div class="booking-service">${b.service}</div>
                <div class="booking-client">
                    <i class="fa-solid fa-user" style="font-size:.75rem;"></i>${b.clientName}
                    &nbsp;·&nbsp;<i class="fa-brands fa-whatsapp" style="font-size:.75rem;color:#25D366;"></i>${b.clientPhone}
                </div>
            </div>
            <div class="booking-price">R$ ${Number(b.price||0).toLocaleString('pt-BR')}</div>
            ${showDelete ? `<button class="btn-del-booking" onclick="admin.deleteBooking(${b.id})" title="Excluir">
                <i class="fa-solid fa-trash"></i></button>` : ''}`;
        return card;
    },

    monthName(n) {
        const m=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return m[n-1]||'';
    },

    deleteBooking(id) {
        this.showDialog('Excluir Agendamento','Tem certeza? O cliente perderá a reserva.','danger', () => {
            this.state.bookings = this.state.bookings.filter(b => b.id !== id);
            localStorage.setItem('pantera_bookings', JSON.stringify(this.state.bookings));
            this.updateBadge();
            this.renderBookings();
        });
    },

    // ── HISTORY ────────────────────────────────────────────────────────

    renderHistory() {
        const sorted = [...this.state.bookings].sort((a,b)=> b.id - a.id);
        this.renderHistoryList(sorted);
    },

    searchHistory() {
        const q = document.getElementById('history-search').value.toLowerCase();
        const filtered = this.state.bookings.filter(b =>
            b.clientName.toLowerCase().includes(q) ||
            b.clientPhone.includes(q) ||
            b.service.toLowerCase().includes(q)
        ).sort((a,b)=> b.id - a.id);
        this.renderHistoryList(filtered);
    },

    renderHistoryList(list) {
        const container = document.getElementById('history-list');
        container.innerHTML = '';
        if (!list.length) {
            container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>Nenhum registro encontrado.</p></div>';
            return;
        }
        list.forEach(b => container.appendChild(this.buildBookingCard(b, true)));
    },

    // ── SERVICES ───────────────────────────────────────────────────────

    renderServices() {
        const list = document.getElementById('services-admin-list');
        list.innerHTML = '';
        this.state.services.forEach((s, idx) => {
            const card = document.createElement('div');
            card.className = 'service-admin-card';
            card.innerHTML = `
                <button class="btn-icon-select" onclick="admin.openIconSelector(${idx})" title="Escolher ícone">
                    <i class="fa-solid ${s.icon||'fa-scissors'}"></i>
                </button>
                <div class="service-fields">
                    <input type="text"   id="svc-name-${idx}"  class="input-field" value="${s.name}" placeholder="Nome">
                    <input type="number" id="svc-price-${idx}" class="input-field" value="${s.price}" placeholder="Preço" style="max-width:120px;">
                </div>
                <div class="service-actions">
                    <button class="btn-mini btn-save" onclick="admin.saveService(${idx})">Salvar</button>
                    <button class="btn-mini btn-del"  onclick="admin.deleteService(${idx})">Excluir</button>
                </div>`;
            list.appendChild(card);
        });
    },

    openIconSelector(idx) {
        this.state.editingServiceIndex = idx;
        const grid = document.getElementById('icons-grid');
        grid.innerHTML = '';
        this.availableIcons.forEach(icon => {
            const div = document.createElement('div');
            div.className = 'icon-option';
            div.innerHTML = `<i class="fa-solid ${icon}"></i>`;
            div.onclick = () => this.selectIcon(icon);
            grid.appendChild(div);
        });
        document.getElementById('modal-icons').classList.remove('hidden');
    },

    selectIcon(icon) {
        const idx = this.state.editingServiceIndex;
        if (idx !== null && this.state.services[idx]) {
            this.state.services[idx].icon = icon;
            this.updateServicesStorage();
            this.closeModal('modal-icons');
            this.renderServices();
        }
    },

    saveService(idx) {
        const name  = document.getElementById(`svc-name-${idx}`).value.trim();
        const price = Number(document.getElementById(`svc-price-${idx}`).value);
        if (!name || isNaN(price)) return this.showDialog('Erro','Preencha nome e preço.','info');
        this.state.services[idx].name  = name;
        this.state.services[idx].price = price;
        this.updateServicesStorage();
        this.showDialog('Sucesso','Serviço atualizado.','info');
    },

    deleteService(idx) {
        this.showDialog('Excluir Serviço','Essa ação não pode ser desfeita.','danger', () => {
            this.state.services.splice(idx, 1);
            this.updateServicesStorage();
            this.renderServices();
        });
    },

    addService() {
        const name  = document.getElementById('new-name').value.trim();
        const price = Number(document.getElementById('new-price').value);
        if (!name || isNaN(price) || price <= 0) return this.showDialog('Erro','Preencha nome e preço válidos.','info');
        this.state.services.push({ id: Date.now(), name, price, icon: 'fa-scissors' });
        this.updateServicesStorage();
        document.getElementById('new-name').value  = '';
        document.getElementById('new-price').value = '';
        this.renderServices();
        this.showDialog('Adicionado','Novo serviço adicionado com sucesso.','info');
    },

    updateServicesStorage() {
        localStorage.setItem('pantera_services', JSON.stringify(this.state.services));
    },

    // ── CONFIG ─────────────────────────────────────────────────────────

    renderConfig() {
        const phone = this.state.config.whatsapp || '';
        document.getElementById('conf-phone').value = phone;
        this.updateWaPreview(phone);

        const cred = this.state.credentials;
        document.getElementById('conf-new-user').value  = cred.user || '';
        document.getElementById('conf-new-pass').value  = '';
        document.getElementById('conf-new-pass2').value = '';
    },

    updateWaPreview(num) {
        const prev    = document.getElementById('whatsapp-preview');
        const link    = document.getElementById('wa-preview-link');
        if (num) {
            prev.classList.remove('hidden');
            link.textContent = `wa.me/${num}`;
        } else {
            prev.classList.add('hidden');
        }
    },

    saveConfig() {
        const phone = document.getElementById('conf-phone').value.replace(/\D/g,'');
        this.state.config.whatsapp = phone;
        localStorage.setItem('pantera_config', JSON.stringify(this.state.config));
        this.updateWaPreview(phone);
        this.showDialog('Salvo','Número de WhatsApp atualizado com sucesso.','info');
    },

    changeCredentials() {
        const user  = document.getElementById('conf-new-user').value.trim();
        const pass  = document.getElementById('conf-new-pass').value.trim();
        const pass2 = document.getElementById('conf-new-pass2').value.trim();
        if (!user || !pass) return this.showDialog('Erro','Preencha usuário e nova senha.','info');
        if (pass !== pass2)  return this.showDialog('Erro','As senhas não coincidem.','info');
        this.state.credentials = { user, pass };
        localStorage.setItem('pantera_credentials', JSON.stringify(this.state.credentials));
        this.showDialog('Atualizado','Credenciais alteradas com sucesso.','info');
    },

    clearAllBookings() {
        this.showDialog('Limpar Agendamentos','Tem certeza? TODOS os agendamentos serão apagados permanentemente.','danger', () => {
            this.state.bookings = [];
            localStorage.setItem('pantera_bookings', JSON.stringify([]));
            localStorage.removeItem('pantera_user_booking_id');
            this.updateBadge();
            this.showDialog('Concluído','Todos os agendamentos foram removidos.','info');
        });
    },

    // ── DIALOG ─────────────────────────────────────────────────────────

    showDialog(title, message, type, onConfirm) {
        const modal = document.getElementById('modal-dialog');
        document.getElementById('dialog-title').innerText = title;
        document.getElementById('dialog-msg').innerText   = message;
        const icon      = document.getElementById('dialog-icon');
        const btnOk     = document.getElementById('btn-dialog-confirm');
        const btnCancel = document.getElementById('btn-dialog-cancel');
        btnCancel.style.display = 'inline-block';
        if (type === 'danger') {
            icon.className = 'fa-solid fa-triangle-exclamation';
            icon.style.color = 'var(--danger)';
            btnOk.style.background = 'var(--danger)';
            btnOk.innerText = 'Confirmar Exclusão';
        } else if (type === 'info') {
            icon.className = 'fa-solid fa-circle-info';
            icon.style.color = 'var(--accent)';
            btnOk.style.background = 'var(--text-main)';
            btnOk.innerText = 'OK';
            btnCancel.style.display = 'none';
        } else {
            icon.className = 'fa-solid fa-circle-question';
            icon.style.color = 'var(--accent)';
            btnOk.style.background = 'var(--text-main)';
            btnOk.innerText = 'Sim, continuar';
        }
        modal.classList.remove('hidden');
        btnOk.onclick = () => { modal.classList.add('hidden'); if (onConfirm) onConfirm(); };
        btnCancel.onclick = () => modal.classList.add('hidden');
    },

    closeModal(id) { document.getElementById(id).classList.add('hidden'); }
};

document.addEventListener('DOMContentLoaded', () => admin.init());
