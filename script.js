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
        currentSelection: {}, theme: 'light', userBookingId: null
    },

    init() {
        this.initProtection();
        this.state.services  = JSON.parse(localStorage.getItem('pantera_services'))  || this.defaultServices;
        this.state.bookings  = JSON.parse(localStorage.getItem('pantera_bookings'))  || [];
        this.state.config    = JSON.parse(localStorage.getItem('pantera_config'))    || { whatsapp: '' };
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
            btn.href = `https://wa.me/${num}?text=Olá! Gostaria de informações sobre os serviços.`;
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    },

    showDialog(title, message, type, onConfirm) {
        const modal = document.getElementById('modal-dialog');
        document.getElementById('dialog-title').innerText = title;
        document.getElementById('dialog-msg').innerText   = message;
        const icon     = document.getElementById('dialog-icon');
        const btnOk    = document.getElementById('btn-dialog-confirm');
        const btnCancel= document.getElementById('btn-dialog-cancel');
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
        } else { card.classList.add('hidden'); }
    },

    promptCancelBooking() {
        this.showDialog('Cancelar Agendamento','Tem certeza? Isso liberará a vaga para outros.','danger', () => {
            this.state.bookings = this.state.bookings.filter(b => b.id != this.state.userBookingId);
            localStorage.setItem('pantera_bookings', JSON.stringify(this.state.bookings));
            localStorage.removeItem('pantera_user_booking_id');
            this.state.userBookingId = null;
            this.checkUserStatus();
            this.showDialog('Cancelado','Seu agendamento foi cancelado com sucesso.','info');
        });
    },

    renderServices() {
        const grid = document.getElementById('services-grid');
        grid.innerHTML = '';
        this.state.services.forEach(s => {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.onclick = () => this.handleServiceClick(s);
            card.innerHTML = `
                <i class="fa-solid ${s.icon||'fa-cut'} service-icon"></i>
                <span class="service-name">${s.name}</span>
                <span class="service-price">R$ ${Number(s.price).toLocaleString('pt-BR')},00</span>`;
            grid.appendChild(card);
        });
    },

    handleServiceClick(service) {
        if (this.state.userBookingId) {
            this.showDialog('Atenção','Você já tem um horário marcado. Cancele o atual para agendar um novo.','info');
            return;
        }
        this.openBooking(service);
    },

    openBooking(service) {
        this.state.currentSelection.service = service;
        document.getElementById('modal-title').innerText = service.name;
        document.getElementById('step-date').classList.remove('hidden');
        document.getElementById('step-form').classList.add('hidden');
        document.getElementById('time-wrapper').classList.add('hidden');
        document.getElementById('modal-booking').classList.remove('hidden');
        this.renderCalendar();
    },

    closeModal(id) { document.getElementById(id).classList.add('hidden'); },

    renderCalendar() {
        const wrapper = document.getElementById('calendar-wrapper');
        wrapper.innerHTML = '';
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const btn = document.createElement('div');
            btn.className = 'date-chip';
            btn.innerHTML = `<span style="font-size:.75rem">${d.toLocaleDateString('pt-BR',{weekday:'short'})}</span>
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
            const busy = this.state.bookings.some(b => b.date === this.state.currentSelection.date && b.time === time);
            if (busy) btn.classList.add('disabled');
            else btn.onclick = () => { this.state.currentSelection.time = time; this.goToForm(); };
            grid.appendChild(btn);
        }
    },

    goToForm() {
        document.getElementById('step-date').classList.add('hidden');
        document.getElementById('step-form').classList.remove('hidden');
        document.getElementById('summary-service').innerText  = this.state.currentSelection.service.name;
        document.getElementById('summary-datetime').innerText = `${this.state.currentSelection.date} — ${this.state.currentSelection.time}`;
    },
    backToDate() {
        document.getElementById('step-form').classList.add('hidden');
        document.getElementById('step-date').classList.remove('hidden');
    },

    confirmBooking() {
        const name  = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        if (!name || !phone) return this.showDialog('Erro','Preencha todos os campos.','info');

        const id = Date.now();
        const booking = {
            id, service: this.state.currentSelection.service.name,
            price: this.state.currentSelection.service.price,
            date: this.state.currentSelection.date,
            time: this.state.currentSelection.time,
            clientName: name, clientPhone: phone,
            createdAt: new Date().toISOString()
        };
        this.state.bookings.push(booking);
        localStorage.setItem('pantera_bookings', JSON.stringify(this.state.bookings));
        this.state.userBookingId = id;
        localStorage.setItem('pantera_user_booking_id', id);

        const wa = this.state.config.whatsapp;
        if (wa) {
            const msg = encodeURIComponent(`*Novo Agendamento*\nServiço: ${booking.service}\nData: ${booking.date} às ${booking.time}\nCliente: ${name}\nWhatsApp: ${phone}`);
            window.open(`https://wa.me/${wa}?text=${msg}`, '_blank');
        }
        location.reload();
    },

    handleAdminClick() {
        window.location.href = 'admin.html';
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
