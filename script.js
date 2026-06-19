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
        selectedServices: [],
        currentSelection: {},
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
            btn.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent('Olá! Gostaria de informações sobre os serviços.');
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
        btnOk.onclick = function() { modal.classList.add('hidden'); if (onConfirm) onConfirm(); };
        btnCancel.onclick = function() { modal.classList.add('hidden'); if (onCancel) onCancel(); };
    },

    closeModal(id) { document.getElementById(id).classList.add('hidden'); },

    // ── USER STATUS ───────────────────────────────────────────────────
    checkUserStatus() {
        const card    = document.getElementById('user-status-card');
        const details = document.getElementById('user-booking-details');
        if (this.state.userBookingId) {
            const b = this.state.bookings.find(x => String(x.id) === String(this.state.userBookingId));
            if (b) {
                card.classList.remove('hidden');
                details.innerText = b.service + ' — ' + b.date + ' às ' + b.time;
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
            this.state.bookings = this.state.bookings.filter(b => String(b.id) !== String(this.state.userBookingId));
            localStorage.setItem('pantera_bookings', JSON.stringify(this.state.bookings));
            localStorage.removeItem('pantera_user_booking_id');
            this.state.userBookingId = null;
            this.checkUserStatus();
            this.showDialog('Cancelado', 'Seu agendamento foi cancelado com sucesso.', 'info');
        });
    },

    // ── SERVIÇOS (seleção múltipla) ───────────────────────────────────
    renderServices() {
        const self = this;
        const grid = document.getElementById('services-grid');
        grid.innerHTML = '';

        this.state.services.forEach(function(s, idx) {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.dataset.idx = String(idx);

            // Cria elementos filhos manualmente para evitar qualquer problema de innerHTML + onclick
            const checkDiv = document.createElement('div');
            checkDiv.className = 'service-check';
            checkDiv.innerHTML = '<i class="fa-solid fa-check"></i>';

            const iconEl = document.createElement('i');
            iconEl.className = 'fa-solid ' + (s.icon || 'fa-cut') + ' service-icon';

            const nameEl = document.createElement('span');
            nameEl.className = 'service-name';
            nameEl.textContent = s.name;

            const priceEl = document.createElement('span');
            priceEl.className = 'service-price';
            priceEl.textContent = 'R$ ' + Number(s.price).toLocaleString('pt-BR') + ',00';

            card.appendChild(checkDiv);
            card.appendChild(iconEl);
            card.appendChild(nameEl);
            card.appendChild(priceEl);

            // Listener no card, filhos com pointer-events:none via CSS
            card.addEventListener('click', function(e) {
                self.toggleService(idx, card);
            });

            grid.appendChild(card);
        });

        this.renderSelectionBar();
    },

    toggleService(idx, card) {
        if (this.state.userBookingId) {
            this.showDialog('Atenção', 'Você já tem um horário marcado. Cancele o atual para agendar um novo.', 'info');
            return;
        }

        const service = this.state.services[idx];
        if (!service) return;

        // Busca pelo nome (robusto contra diferença de tipo de id)
        const alreadyIdx = this.state.selectedServices.findIndex(function(s) {
            return s.name === service.name;
        });

        if (alreadyIdx === -1) {
            // Copia o objeto para evitar referência mutável
            this.state.selectedServices.push({
                id:    service.id,
                name:  service.name,
                price: service.price,
                icon:  service.icon
            });
            card.classList.add('selected');
        } else {
            this.state.selectedServices.splice(alreadyIdx, 1);
            card.classList.remove('selected');
        }

        this.updateSelectionBar();
    },

    renderSelectionBar() {
        const old = document.getElementById('selection-bar');
        if (old) old.remove();

        const bar = document.createElement('div');
        bar.id = 'selection-bar';
        bar.className = 'selection-bar hidden';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'selection-bar-info';
        infoDiv.innerHTML = '<span id="sel-count">0 serviços</span><span id="sel-total" class="sel-total">R$ 0</span>';

        const actDiv = document.createElement('div');
        actDiv.className = 'selection-bar-actions';

        const btnClear = document.createElement('button');
        btnClear.className = 'btn-sel-clear';
        btnClear.textContent = 'Limpar';
        btnClear.addEventListener('click', function(e) {
            e.stopPropagation();
            app.clearSelection();
        });

        const btnBook = document.createElement('button');
        btnBook.className = 'btn-sel-book';
        btnBook.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Agendar';
        btnBook.addEventListener('click', function(e) {
            e.stopPropagation();
            app.openBookingFromSelection();
        });

        actDiv.appendChild(btnClear);
        actDiv.appendChild(btnBook);
        bar.appendChild(infoDiv);
        bar.appendChild(actDiv);
        document.body.appendChild(bar);
    },

    updateSelectionBar() {
        const bar   = document.getElementById('selection-bar');
        const count = this.state.selectedServices.length;
        const total = this.state.selectedServices.reduce(function(s, x) { return s + Number(x.price); }, 0);

        if (!bar) return;

        if (count === 0) {
            bar.classList.add('hidden');
        } else {
            bar.classList.remove('hidden');
            document.getElementById('sel-count').textContent =
                count + ' serviço' + (count > 1 ? 's' : '') + ' selecionado' + (count > 1 ? 's' : '');
            document.getElementById('sel-total').textContent =
                'R$ ' + total.toLocaleString('pt-BR') + ',00';
        }
    },

    clearSelection() {
        this.state.selectedServices = [];
        document.querySelectorAll('.service-card.selected').forEach(function(c) {
            c.classList.remove('selected');
        });
        this.updateSelectionBar();
    },

    // ── FLUXO DE AGENDAMENTO ──────────────────────────────────────────
    openBookingFromSelection() {
        if (this.state.selectedServices.length === 0) return;

        const count = this.state.selectedServices.length;
        document.getElementById('modal-title').innerText =
            count === 1 ? this.state.selectedServices[0].name : count + ' serviços selecionados';

        document.getElementById('step-date').classList.remove('hidden');
        document.getElementById('step-form').classList.add('hidden');
        document.getElementById('time-wrapper').classList.add('hidden');
        document.getElementById('modal-booking').classList.remove('hidden');
        this.renderCalendar();
    },

    renderCalendar() {
        const self    = this;
        const wrapper = document.getElementById('calendar-wrapper');
        wrapper.innerHTML = '';
        const today = new Date();
        for (var i = 0; i < 14; i++) {
            var d = new Date(today);
            d.setDate(today.getDate() + i);
            var btn = document.createElement('div');
            btn.className = 'date-chip';
            btn.innerHTML =
                '<span style="font-size:.75rem">' + d.toLocaleDateString('pt-BR', { weekday: 'short' }) + '</span>' +
                '<span style="font-weight:bold;font-size:1.1rem">' + d.getDate() + '</span>';
            var full = d.toLocaleDateString('pt-BR');
            (function(fullDate, el) {
                el.addEventListener('click', function() {
                    document.querySelectorAll('.date-chip').forEach(function(e) { e.classList.remove('selected'); });
                    el.classList.add('selected');
                    self.state.currentSelection.date = fullDate;
                    self.renderTimes();
                });
            })(full, btn);
            wrapper.appendChild(btn);
        }
    },

    renderTimes() {
        const self = this;
        document.getElementById('time-wrapper').classList.remove('hidden');
        const grid = document.getElementById('time-grid');
        grid.innerHTML = '';
        for (var h = 9; h <= 20; h++) {
            var time = h + ':00';
            var btn  = document.createElement('div');
            btn.className = 'time-chip';
            btn.innerText = time;
            var busy = this.state.bookings.some(function(b) {
                return b.date === self.state.currentSelection.date && b.time === time;
            });
            if (busy) {
                btn.classList.add('disabled');
            } else {
                (function(t) {
                    btn.addEventListener('click', function() {
                        self.state.currentSelection.time = t;
                        self.goToForm();
                    });
                })(time);
            }
            grid.appendChild(btn);
        }
    },

    goToForm() {
        document.getElementById('step-date').classList.add('hidden');
        document.getElementById('step-form').classList.remove('hidden');

        var svcNames = this.state.selectedServices.map(function(s) { return s.name; }).join(' + ');
        var total    = this.state.selectedServices.reduce(function(s, x) { return s + Number(x.price); }, 0);

        document.getElementById('summary-service').innerText  = svcNames;
        document.getElementById('summary-datetime').innerText = this.state.currentSelection.date + ' — ' + this.state.currentSelection.time;

        var totalEl = document.getElementById('summary-total');
        if (totalEl) {
            totalEl.innerText = 'Total: R$ ' + total.toLocaleString('pt-BR') + ',00';
            totalEl.classList.remove('hidden');
        }
    },

    backToDate() {
        document.getElementById('step-form').classList.add('hidden');
        document.getElementById('step-date').classList.remove('hidden');
    },

    // ── CONFIRMAR ─────────────────────────────────────────────────────
    confirmBooking() {
        const name  = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        if (!name || !phone) {
            this.showDialog('Erro', 'Preencha todos os campos.', 'info');
            return;
        }

        var svcNames = this.state.selectedServices.map(function(s) { return s.name; }).join(' + ');
        var total    = this.state.selectedServices.reduce(function(s, x) { return s + Number(x.price); }, 0);

        var id = Date.now();
        var booking = {
            id:          id,
            service:     svcNames,
            price:       total,
            services:    this.state.selectedServices.map(function(s) { return { name: s.name, price: s.price }; }),
            date:        this.state.currentSelection.date,
            time:        this.state.currentSelection.time,
            clientName:  name,
            clientPhone: phone,
            createdAt:   new Date().toISOString()
        };

        this.state.bookings.push(booking);
        localStorage.setItem('pantera_bookings', JSON.stringify(this.state.bookings));
        this.state.userBookingId = id;
        localStorage.setItem('pantera_user_booking_id', String(id));

        this.closeModal('modal-booking');
        this.promptWhatsApp(booking, name, phone);
    },

    // ── MODAL WHATSAPP ────────────────────────────────────────────────
    promptWhatsApp(booking, name, phone) {
        var wa = this.state.config.whatsapp;

        var svcList = booking.services
            ? booking.services.map(function(s) {
                return '• ' + s.name + ' — R$ ' + Number(s.price).toLocaleString('pt-BR') + ',00';
              }).join('\n')
            : '• ' + booking.service;

        var msgBarbearia = encodeURIComponent(
            '*Novo Agendamento ✂️*\n\n' +
            '*Cliente:* ' + name + '\n' +
            '*WhatsApp:* ' + phone + '\n' +
            '*Data:* ' + booking.date + ' às ' + booking.time + '\n\n' +
            '*Serviços:*\n' + svcList + '\n\n' +
            '*Total:* R$ ' + Number(booking.price).toLocaleString('pt-BR') + ',00'
        );

        var linkBarbearia = wa ? 'https://wa.me/' + wa + '?text=' + msgBarbearia : null;

        var waMod = document.getElementById('modal-whatsapp');
        var summary = document.getElementById('wa-booking-summary');
        summary.innerHTML =
            '<strong>' + booking.service + '</strong><br>' +
            booking.date + ' às ' + booking.time + '<br>' +
            '<span style="color:var(--accent);font-weight:700;">Total: R$ ' + Number(booking.price).toLocaleString('pt-BR') + ',00</span>';

        waMod.classList.remove('hidden');

        var btnBarbearia = document.getElementById('wa-btn-barbearia');
        btnBarbearia.classList.remove('hidden');
        btnBarbearia.onclick = function() {
            if (wa) {
                window.open(linkBarbearia, '_blank');
                app.closeModal('modal-whatsapp');
                location.reload();
            } else {
                app.closeModal('modal-whatsapp');
                app.showDialog('Aviso', 'O administrador da barbearia ainda não configurou um número de WhatsApp.', 'info', function() {
                    location.reload();
                });
            }
        };

        document.getElementById('wa-btn-skip').onclick = function() {
            app.closeModal('modal-whatsapp');
            location.reload();
        };
    },

    handleAdminClick() {
        window.location.href = 'admin.html';
    }
};

document.addEventListener('DOMContentLoaded', function() { app.init(); });
