// maked by rafael rocha — enhanced by Claude

const app = {
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
        services: [], bookings: [], config: {},
        selectedServices: [],   // array de serviços escolhidos
        currentSelection: {},   // { date, time }
        theme: 'light',
        userBookingId: null
    },

    init() {
        this.initProtection();
        this.state.services      = JSON.parse(localStorage.getItem('pantera_services'))  || this.defaultServices;
        this.state.bookings      = JSON.parse(localStorage.getItem('pantera_bookings'))  || [];
        this.state.config        = JSON.parse(localStorage.getItem('pantera_config'))    || { whatsapp: '' };
        this.state.userBookingId = localStorage.getItem('pantera_user_booking_id');

        const savedTheme = localStorage.getItem('pantera_theme') || 'light';
        this.setTheme(savedTheme);
        this.renderServices();
        this.checkUserStatus();
        this.renderWhatsAppFloat();
    },

    initProtection() {
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.onkeydown = function(e) {
            if (e.keyCode === 123) return false;
            if (e.ctrlKey && e.shiftKey && [73,74,67].includes(e.keyCode)) return false;
            if (e.ctrlKey && e.keyCode === 85) return false;
        };
    },

    toggleTheme() { this.setTheme(this.state.theme === 'light' ? 'dark' : 'light'); },
    setTheme(n) {
        this.state.theme = n;
        document.documentElement.setAttribute('data-theme', n);
        localStorage.setItem('pantera_theme', n);
        document.getElementById('theme-icon').className = n === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    },

    renderWhatsAppFloat() {
        const btn = document.getElementById('whatsapp-float');
        const num = this.state.config.whatsapp;
        if (num) {
            btn.href = `https://wa.me/${num}?text=${encodeURIComponent('Olá! Gostaria de informações sobre os serviços.')}`;
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    },

    // ── DIALOG ────────────────────────────────────────────────────────
    showDialog(title, message, type, onConfirm, onCancel) {
        const modal     = document.getElementById('modal-dialog');
        const icon      = document.getElementById('dialog-icon');
        const btnOk     = document.getElementById('btn-dialog-confirm');
        const btnCancel = document.getElementById('btn-dialog-cancel');

        document.getElementById('dialog-title').innerText = title;
        document.getElementById('dialog-msg').innerText   = message;
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
        btnCancel.onclick = () => { modal.classList.add('hidden'); if (onCancel) onCancel(); };
    },

    closeModal(id) { document.getElementById(id).classList.add('hidden'); },

    // ── USER STATUS ───────────────────────────────────────────────────
    checkUserStatus() {
        const card    = document.getElementById('user-status-card');
        const details = document.getElementById('user-booking-details');
        if (this.state.userBookingId) {
            const b = this.state.bookings.find(x => x.id == this.state.userBookingId);
            if (b) {
                card.classList.remove('hidden');
                details.innerText = `${b.service} — ${b.date} às ${b.time}`;
            } else {
                localStorage.removeItem('pantera_user_booking_id');
                this.state.userBookingId = null;
                card.classList.add('hidden');
            }
        } else {
            card.classList.add('hidden');
        }
    },

    promptCancelBooking() {
        this.showDialog('Cancelar Agendamento', 'Tem certeza? Isso liberará a vaga para outros.', 'danger', () => {
            this.state.bookings = this.state.bookings.filter(b => b.id != this.state.userBookingId);
            localStorage.setItem('pantera_bookings', JSON.stringify(this.state.bookings));
            localStorage.removeItem('pantera_user_booking_id');
            this.state.userBookingId = null;
            this.checkUserStatus();
            this.showDialog('Cancelado', 'Seu agendamento foi cancelado com sucesso.', 'info');
        });
    },

    // ── SERVIÇOS (seleção múltipla) ───────────────────────────────────
    renderServices() {
        const grid = document.getElementById('services-grid');
        grid.innerHTML = '';
        this.state.services.forEach(s => {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.dataset.id = s.id;
            card.onclick = () => this.toggleService(s, card);
            card.innerHTML = `
                <div class="service-check"><i class="fa-solid fa-check"></i></div>
                <i class="fa-solid ${s.icon || 'fa-cut'} service-icon"></i>
                <span class="service-name">${s.name}</span>
                <span class="service-price">R$ ${Number(s.price).toLocaleString('pt-BR')},00</span>`;
            grid.appendChild(card);
        });

        // Barra flutuante de seleção
        this.renderSelectionBar();
    },

    toggleService(service, card) {
        if (this.state.userBookingId) {
            this.showDialog('Atenção', 'Você já tem um horário marcado. Cancele o atual para agendar um novo.', 'info');
            return;
        }

        const idx = this.state.selectedServices.findIndex(s => s.id === service.id);
        if (idx === -1) {
            this.state.selectedServices.push(service);
            card.classList.add('selected');
        } else {
            this.state.selectedServices.splice(idx, 1);
            card.classList.remove('selected');
        }
        this.updateSelectionBar();
    },

    renderSelectionBar() {
        // Remove se já existir
        const old = document.getElementById('selection-bar');
        if (old) old.remove();

        const bar = document.createElement('div');
        bar.id = 'selection-bar';
        bar.className = 'selection-bar hidden';
        bar.innerHTML = `
            <div class="selection-bar-info">
                <span id="sel-count">0 serviços</span>
                <span id="sel-total" class="sel-total">R$ 0</span>
            </div>
            <div class="selection-bar-actions">
                <button class="btn-sel-clear" onclick="app.clearSelection()">Limpar</button>
                <button class="btn-sel-book"  onclick="app.openBookingFromSelection()">
                    <i class="fa-solid fa-calendar-plus"></i> Agendar
                </button>
            </div>`;
        document.body.appendChild(bar);
    },

    updateSelectionBar() {
        const bar   = document.getElementById('selection-bar');
        const count = this.state.selectedServices.length;
        const total = this.state.selectedServices.reduce((s, x) => s + Number(x.price), 0);

        if (count === 0) {
            bar.classList.add('hidden');
            return;
        }
        bar.classList.remove('hidden');
        document.getElementById('sel-count').textContent = `${count} serviço${count > 1 ? 's' : ''} selecionado${count > 1 ? 's' : ''}`;
        document.getElementById('sel-total').textContent = `R$ ${total.toLocaleString('pt-BR')},00`;
    },

    clearSelection() {
        this.state.selectedServices = [];
        document.querySelectorAll('.service-card.selected').forEach(c => c.classList.remove('selected'));
        this.updateSelectionBar();
    },

    // ── FLUXO DE AGENDAMENTO ──────────────────────────────────────────
    openBookingFromSelection() {
        if (this.state.selectedServices.length === 0) return;

        const names = this.state.selectedServices.map(s => s.name).join(', ');
        document.getElementById('modal-title').innerText = this.state.selectedServices.length === 1
            ? this.state.selectedServices[0].name
            : `${this.state.selectedServices.length} serviços`;

        document.getElementById('step-date').classList.remove('hidden');
        document.getElementById('step-form').classList.add('hidden');
        document.getElementById('time-wrapper').classList.add('hidden');
        document.getElementById('modal-booking').classList.remove('hidden');
        this.renderCalendar();
    },

    renderCalendar() {
        const wrapper = document.getElementById('calendar-wrapper');
        wrapper.innerHTML = '';
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const btn = document.createElement('div');
            btn.className = 'date-chip';
            btn.innerHTML = `
                <span style="font-size:.75rem">${d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                <span style="font-weight:bold;font-size:1.1rem">${d.getDate()}</span>`;
            const full = d.toLocaleDateString('pt-BR');
            btn.onclick = () => {
                document.querySelectorAll('.date-chip').forEach(e => e.classList.remove('selected'));
                btn.classList.add('selected');
                this.state.currentSelection.date = full;
                this.renderTimes();
            };
            wrapper.appendChild(btn);
        }
    },

    renderTimes() {
        document.getElementById('time-wrapper').classList.remove('hidden');
        const grid = document.getElementById('time-grid');
        grid.innerHTML = '';
        for (let h = 9; h <= 20; h++) {
            const time = `${h}:00`;
            const btn  = document.createElement('div');
            btn.className = 'time-chip';
            btn.innerText = time;
            const busy = this.state.bookings.some(b =>
                b.date === this.state.currentSelection.date && b.time === time
            );
            if (busy) btn.classList.add('disabled');
            else btn.onclick = () => {
                this.state.currentSelection.time = time;
                this.goToForm();
            };
            grid.appendChild(btn);
        }
    },

    goToForm() {
        document.getElementById('step-date').classList.add('hidden');
        document.getElementById('step-form').classList.remove('hidden');

        const svcNames = this.state.selectedServices.map(s => s.name).join(' + ');
        const total    = this.state.selectedServices.reduce((s, x) => s + Number(x.price), 0);

        document.getElementById('summary-service').innerText  = svcNames;
        document.getElementById('summary-datetime').innerText =
            `${this.state.currentSelection.date} — ${this.state.currentSelection.time}`;
        document.getElementById('summary-total').innerText    = `Total: R$ ${total.toLocaleString('pt-BR')},00`;
        document.getElementById('summary-total').classList.remove('hidden');
    },

    backToDate() {
        document.getElementById('step-form').classList.add('hidden');
        document.getElementById('step-date').classList.remove('hidden');
    },

    // ── CONFIRMAR AGENDAMENTO ──────────────────────────────────────────
    confirmBooking() {
        const name  = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        if (!name || !phone) return this.showDialog('Erro', 'Preencha todos os campos.', 'info');

        const svcNames = this.state.selectedServices.map(s => s.name).join(' + ');
        const total    = this.state.selectedServices.reduce((s, x) => s + Number(x.price), 0);

        const id      = Date.now();
        const booking = {
            id,
            service:     svcNames,
            price:       total,
            services:    this.state.selectedServices.map(s => ({ name: s.name, price: s.price })),
            date:        this.state.currentSelection.date,
            time:        this.state.currentSelection.time,
            clientName:  name,
            clientPhone: phone,
            createdAt:   new Date().toISOString()
        };

        // Salva
        this.state.bookings.push(booking);
        localStorage.setItem('pantera_bookings', JSON.stringify(this.state.bookings));
        this.state.userBookingId = id;
        localStorage.setItem('pantera_user_booking_id', id);

        // Fecha modal de agendamento
        this.closeModal('modal-booking');

        // Pergunta sobre WhatsApp
        this.promptWhatsApp(booking, name, phone);
    },

    // ── MODAL WHATSAPP ────────────────────────────────────────────────
    promptWhatsApp(booking, name, phone) {
        const wa = this.state.config.whatsapp;

        // Monta a mensagem do cliente (para a barbearia)
        const svcList = booking.services
            ? booking.services.map(s => `• ${s.name} — R$ ${Number(s.price).toLocaleString('pt-BR')},00`).join('\n')
            : `• ${booking.service}`;

        const msgBarbearia = encodeURIComponent(
            `*Novo Agendamento ✂️*\n\n` +
            `*Cliente:* ${name}\n` +
            `*WhatsApp:* ${phone}\n` +
            `*Data:* ${booking.date} às ${booking.time}\n\n` +
            `*Serviços:*\n${svcList}\n\n` +
            `*Total:* R$ ${Number(booking.price).toLocaleString('pt-BR')},00`
        );

        const linkBarbearia = wa ? `https://wa.me/${wa}?text=${msgBarbearia}` : null;

        // Exibe modal customizado de WhatsApp
        const waMod = document.getElementById('modal-whatsapp');
        document.getElementById('wa-booking-summary').innerHTML =
            `<strong>${booking.service}</strong><br>` +
            `${booking.date} às ${booking.time}<br>` +
            `<span style="color:var(--accent);font-weight:700;">Total: R$ ${Number(booking.price).toLocaleString('pt-BR')},00</span>`;

        waMod.classList.remove('hidden');

        // Botão: enviar para barbearia
        const btnBarbearia = document.getElementById('wa-btn-barbearia');
        if (linkBarbearia) {
            btnBarbearia.classList.remove('hidden');
            btnBarbearia.onclick = () => {
                window.open(linkBarbearia, '_blank');
                this.closeModal('modal-whatsapp');
                location.reload();
            };
        } else {
            btnBarbearia.classList.add('hidden');
        }

        // Botão: não enviar
        document.getElementById('wa-btn-skip').onclick = () => {
            this.closeModal('modal-whatsapp');
            location.reload();
        };
    },

    handleAdminClick() {
        window.location.href = 'admin.html';
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
