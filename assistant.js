(() => {
  const assistantState = {
    open: false,
    notifOpen: false,
    pendingAction: null,
    unread: 3,
    notifications: [
      { id: 1, role: 'user', type: 'payment', title: 'Pembayaran berhasil', body: 'QRIS untuk BK-260914-015 sudah terkonfirmasi. Booking kamu aktif.', time: 'Baru saja', view: 'user-transactions', read: false },
      { id: 2, role: 'user', type: 'reminder', title: 'Booking segera dimulai', body: 'Futsal A dimulai pukul 19:00. Check-in dibuka 15 menit sebelumnya.', time: '2 menit lalu', view: 'my-bookings', read: false },
      { id: 3, role: 'admin', type: 'warning', title: 'Pembayaran masih pending', body: 'BK-260914-021 belum dibayar dan akan kedaluwarsa pada 21:15.', time: '5 menit lalu', view: 'admin-transactions', read: false },
      { id: 4, role: 'admin', type: 'stock', title: 'Stok perlengkapan kritis', body: 'Raket Badminton dan Sepatu Futsal perlu perhatian.', time: '18 menit lalu', view: 'admin-equipment', read: true }
    ]
  };

  const esc = (value = '') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const normalize = text => String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const nowTime = () => new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
  const currentRole = () => (typeof state !== 'undefined' ? state.role : 'user');
  const activeUser = 'Rayhandi Tenri';

  function injectUI(){
    const root = document.createElement('div');
    root.id = 'arenaAssistantRoot';
    root.innerHTML = `
      <button class="assistant-fab" id="assistantFab" aria-label="Buka Arena Assistant">
        <span class="assistant-fab-icon">✦</span>
        <span class="assistant-fab-copy"><b>Arena Assistant</b><small>Otomasi aktif</small></span>
        <i class="assistant-live-dot"></i>
      </button>

      <section class="assistant-panel" id="assistantPanel" aria-label="Arena Assistant">
        <header class="assistant-header">
          <div class="assistant-identity">
            <div class="assistant-logo">✦</div>
            <div><b>Arena Assistant</b><span><i></i> Terhubung ke sistem booking</span></div>
          </div>
          <div class="assistant-header-actions">
            <button id="assistantMinimize" title="Tutup">—</button>
            <button id="assistantClose" title="Tutup">×</button>
          </div>
        </header>

        <div class="assistant-context">
          <div><span>Mode</span><b id="assistantRoleLabel">User</b></div>
          <div><span>Akses</span><b>Booking • Bayar • Jadwal</b></div>
          <span class="assistant-prototype">PROTOTYPE</span>
        </div>

        <div class="assistant-messages" id="assistantMessages"></div>
        <div class="assistant-suggestions" id="assistantSuggestions"></div>

        <form class="assistant-composer" id="assistantForm">
          <div class="assistant-input-wrap">
            <textarea id="assistantInput" rows="1" placeholder="Contoh: cek lapangan kosong jam 21"></textarea>
            <button class="assistant-send" type="submit" title="Kirim">➜</button>
          </div>
          <div class="assistant-composer-foot"><span>⌘ Chat bisa membaca & menggerakkan demo ArenaBook</span><b>Rule-based • tanpa token AI</b></div>
        </form>
      </section>

      <section class="notification-panel" id="notificationPanel" aria-label="Notifikasi otomatis">
        <header class="notification-head">
          <div><span>AUTOMATION CENTER</span><h3>Notifikasi</h3><p>Event dari booking, pembayaran, jadwal, dan inventaris.</p></div>
          <button id="notificationClose">×</button>
        </header>
        <div class="notification-toolbar">
          <span><i></i> Live event simulation</span>
          <button id="markAllRead">Tandai dibaca</button>
        </div>
        <div id="notificationList" class="notification-list"></div>
        <div class="notification-demo">
          <span>SIMULASI EVENT</span>
          <div><button data-demo-event="payment">Pembayaran masuk</button><button data-demo-event="reminder">Reminder jadwal</button><button data-demo-event="cancel">Pembatalan</button></div>
        </div>
      </section>
      <div class="assistant-screen" id="assistantScreen"></div>
    `;
    document.body.appendChild(root);

    const bell = document.querySelector('.top-actions .icon-btn');
    if(bell){
      bell.id = 'arenaNotificationButton';
      bell.setAttribute('title','Notifikasi otomatis');
      bell.addEventListener('click', openNotifications);
    }

    bindUI();
    welcome();
    renderNotifications();
    syncRole();
  }

  function bindUI(){
    document.querySelector('#assistantFab').addEventListener('click', toggleAssistant);
    document.querySelector('#assistantClose').addEventListener('click', closeAssistant);
    document.querySelector('#assistantMinimize').addEventListener('click', closeAssistant);
    document.querySelector('#notificationClose').addEventListener('click', closeNotifications);
    document.querySelector('#assistantScreen').addEventListener('click', () => { closeNotifications(); });
    document.querySelector('#markAllRead').addEventListener('click', () => {
      assistantState.notifications.forEach(n => n.read = true);
      renderNotifications();
    });
    document.querySelector('#assistantForm').addEventListener('submit', e => {
      e.preventDefault();
      const input = document.querySelector('#assistantInput');
      const value = input.value.trim();
      if(!value) return;
      input.value = '';
      input.style.height = 'auto';
      handleMessage(value);
    });
    document.querySelector('#assistantInput').addEventListener('input', e => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
    });
    document.querySelector('#assistantInput').addEventListener('keydown', e => {
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); document.querySelector('#assistantForm').requestSubmit(); }
    });
    document.querySelectorAll('[data-demo-event]').forEach(btn => btn.addEventListener('click', () => demoEvent(btn.dataset.demoEvent)));
    document.querySelectorAll('[data-role]').forEach(btn => btn.addEventListener('click', () => setTimeout(syncRole, 0)));

    const confirmBooking = document.querySelector('#confirmBooking');
    if(confirmBooking){
      confirmBooking.addEventListener('click', () => {
        const online = typeof state !== 'undefined' && state.payment !== 'Bayar di Lokasi';
        setTimeout(() => {
          pushNotification({
            role:'user',
            type: online ? 'payment' : 'booking',
            title: online ? 'Pembayaran otomatis terkonfirmasi' : 'Booking menunggu pembayaran',
            body: online ? 'Simulasi gateway mengirim callback. Status booking berubah menjadi Confirmed.' : 'Booking dibuat. Pembayaran akan dikonfirmasi admin saat dibayar di lokasi.',
            view:'my-bookings'
          });
        }, 900);
      });
    }
  }

  function syncRole(){
    const role = currentRole();
    const label = document.querySelector('#assistantRoleLabel');
    if(label) label.textContent = role === 'admin' ? 'Administrator' : 'User';
    renderSuggestions();
    renderNotifications();
  }

  function welcome(){
    addBot(`Halo, saya <b>Arena Assistant</b>. Saya bukan sekadar FAQ — saya bisa membaca data demo dan menggerakkan ArenaBook. Coba minta saya cek jadwal, buka transaksi, booking slot, cek pembayaran, atau batalkan booking.`);
    addSystem('Prototype ini masih memakai data lokal simulasi. Tidak ada uang asli atau perubahan database produksi.');
    renderSuggestions();
  }

  function toggleAssistant(){ assistantState.open ? closeAssistant() : openAssistant(); }
  function openAssistant(){
    assistantState.open = true;
    document.querySelector('#assistantPanel').classList.add('open');
    document.querySelector('#assistantFab').classList.add('hidden-fab');
    closeNotifications();
    setTimeout(() => document.querySelector('#assistantInput').focus(), 180);
  }
  function closeAssistant(){
    assistantState.open = false;
    document.querySelector('#assistantPanel').classList.remove('open');
    document.querySelector('#assistantFab').classList.remove('hidden-fab');
  }
  function openNotifications(){
    assistantState.notifOpen = true;
    document.querySelector('#notificationPanel').classList.add('open');
    document.querySelector('#assistantScreen').classList.add('open');
    assistantState.notifications.forEach(n => { if(n.role === currentRole() || n.role === 'all') n.read = true; });
    renderNotifications();
  }
  function closeNotifications(){
    assistantState.notifOpen = false;
    document.querySelector('#notificationPanel').classList.remove('open');
    document.querySelector('#assistantScreen').classList.remove('open');
  }

  function addMessage(kind, html, actions = []){
    const wrap = document.querySelector('#assistantMessages');
    const item = document.createElement('div');
    item.className = `assistant-message ${kind}`;
    const avatar = kind === 'user' ? '<span class="assistant-user-avatar">RT</span>' : '<span class="assistant-bot-avatar">✦</span>';
    item.innerHTML = `${avatar}<div class="assistant-bubble">${html}${actions.length ? `<div class="assistant-inline-actions">${actions.map(a => `<button data-assistant-action="${esc(a.value)}">${esc(a.label)}</button>`).join('')}</div>` : ''}<small>${nowTime()}</small></div>`;
    wrap.appendChild(item);
    item.querySelectorAll('[data-assistant-action]').forEach(btn => btn.addEventListener('click', () => handleMessage(btn.dataset.assistantAction, true)));
    wrap.scrollTop = wrap.scrollHeight;
  }
  function addBot(html, actions=[]){ addMessage('bot', html, actions); }
  function addUser(text){ addMessage('user', esc(text)); }
  function addSystem(text){
    const wrap = document.querySelector('#assistantMessages');
    const item = document.createElement('div');
    item.className='assistant-system-message';
    item.textContent=text;
    wrap.appendChild(item);
  }

  function renderSuggestions(){
    const box = document.querySelector('#assistantSuggestions');
    if(!box) return;
    const user = [
      ['Cek jadwal','cek jadwal jam 21'],['Booking saya','booking saya'],['Status bayar','status pembayaran'],['Cancel booking','cancel BK-260914-015']
    ];
    const admin = [
      ['Booking hari ini','booking hari ini'],['Pending bayar','pembayaran pending'],['Stok kritis','stok kritis'],['Denda ON/OFF','status denda']
    ];
    box.innerHTML=(currentRole()==='admin'?admin:user).map(x=>`<button data-suggest="${esc(x[1])}">${esc(x[0])}</button>`).join('');
    box.querySelectorAll('[data-suggest]').forEach(btn=>btn.addEventListener('click',()=>handleMessage(btn.dataset.suggest,true)));
  }

  function handleMessage(raw, silentUser=false){
    const text = normalize(raw);
    if(!silentUser) addUser(raw); else addUser(raw);
    showTyping(() => routeIntent(text, raw));
  }

  function showTyping(callback){
    const wrap=document.querySelector('#assistantMessages');
    const typing=document.createElement('div');
    typing.className='assistant-message bot typing-row';
    typing.innerHTML='<span class="assistant-bot-avatar">✦</span><div class="assistant-bubble typing"><i></i><i></i><i></i></div>';
    wrap.appendChild(typing); wrap.scrollTop=wrap.scrollHeight;
    setTimeout(()=>{ typing.remove(); callback(); }, 420);
  }

  function routeIntent(text, raw){
    if(/^(help|bantuan|menu|bisa apa)/.test(text) || text.includes('kamu bisa apa')) return showHelp();
    if(text.includes('buka booking') || text === 'booking') return navigate('booking','Saya buka halaman <b>Booking</b>. Kamu bisa pilih lapangan dan slot dari sini.');
    if(text.includes('buka transaksi')) return navigate(currentRole()==='admin'?'admin-transactions':'user-transactions','Halaman transaksi sudah saya buka.');
    if(text.includes('buka jadwal')) return navigate(currentRole()==='admin'?'admin-schedule':'booking','Jadwal sudah saya buka.');
    if(text.includes('buka denda')) return requireAdmin(()=>navigate('admin-penalty','Pengaturan denda sudah saya buka.'));
    if(text.includes('booking saya') || text.includes('pesanan saya')) return showMyBookings();
    if(text.includes('booking hari ini') || text.includes('semua booking')) return currentRole()==='admin' ? showAdminBookings() : showMyBookings();
    if(text.includes('status pembayaran') || text.includes('status bayar') || text.includes('transaksi saya')) return showPayments();
    if(text.includes('pembayaran pending') || text.includes('pending bayar')) return currentRole()==='admin' ? showPendingPayments() : showPayments();
    if(text.includes('stok')) return showStock();
    if(text.includes('status denda')) return showPenaltyStatus();
    if(/denda\s+(on|aktif|nyala)/.test(text)) return setPenalty(true);
    if(/denda\s+(off|mati|nonaktif)/.test(text)) return setPenalty(false);
    if(text.startsWith('cancel ') || text.startsWith('batal ') || text.includes('batalkan booking')) return requestCancel(text);
    if(text.includes('konfirmasi cancel') || text.includes('ya batalkan')) return confirmCancel(text);
    if(text.includes('jangan batalkan') || text === 'tidak') { assistantState.pendingAction=null; return addBot('Oke, pembatalan saya hentikan. Booking tetap aktif.'); }
    if(text.startsWith('bayar ') || text.includes('konfirmasi pembayaran')) return simulatePayment(text);
    if(text.includes('cek jadwal') || text.includes('lapangan kosong') || text.includes('slot kosong') || text.includes('tersedia')) return checkAvailability(text);
    if(text.includes('booking futsal') || text.includes('booking badminton') || text.includes('booking basket') || text.includes('pesan futsal') || text.includes('pesan badminton')) return prepareBooking(text);
    if(text.includes('tambah bola') || text.includes('tambah rompi') || text.includes('tambah sepatu') || text.includes('tambah cone')) return addEquipmentFromChat(text);
    if(text.includes('notifikasi')) { openNotifications(); return addBot('Automation Center saya buka. Di sana ada event pembayaran, reminder jadwal, pembatalan, dan stok.'); }
    if(text.includes('halo') || text.includes('hai') || text.includes('bro')) return addBot('Halo 👋 Mau ngapain di ArenaBook? Saya bisa cek jadwal, booking, status pembayaran, pembatalan, perlengkapan, sampai navigasi dashboard.');
    return addBot(`Saya belum yakin maksud <b>“${esc(raw)}”</b>. Untuk prototype ini, coba perintah seperti <b>“cek jadwal jam 21”</b>, <b>“booking saya”</b>, <b>“status pembayaran”</b>, atau <b>“cancel BK-260914-015”</b>.`, [{label:'Lihat kemampuan',value:'bantuan'}]);
  }

  function showHelp(){
    const role=currentRole();
    addBot(role==='admin'
      ? `<b>Mode Admin</b><br>Saya bisa: melihat booking hari ini, transaksi pending, stok kritis, membuka jadwal/transaksi/denda, menyalakan atau mematikan denda, dan menerima notifikasi event operasional.`
      : `<b>Mode User</b><br>Saya bisa: cek slot kosong, menyiapkan booking, membuka checkout, melihat booking kamu, cek status pembayaran, menambah perlengkapan saat checkout, membatalkan booking dengan konfirmasi, dan mengirim notifikasi otomatis.`);
  }

  function navigate(view, reply){
    if(typeof switchView==='function') switchView(view);
    addBot(reply);
  }

  function showMyBookings(){
    const mine=bookings.filter(b=>b.user===activeUser);
    const html=mine.map(b=>`<div class="assistant-data-row"><div><b>${esc(b.id)}</b><span>${esc(b.court)} • ${esc(b.time)}</span></div><span class="assistant-status ${normalize(b.status)}">${esc(b.status)}</span></div>`).join('');
    addBot(`<b>${mine.length} booking ditemukan</b><div class="assistant-data-list">${html}</div>`, [{label:'Buka Booking Saya',value:'buka booking saya'}]);
  }

  function showAdminBookings(){
    const html=bookings.slice(0,5).map(b=>`<div class="assistant-data-row"><div><b>${esc(b.id)}</b><span>${esc(b.user)} • ${esc(b.court)} • ${esc(b.time)}</span></div><span class="assistant-status ${normalize(b.status)}">${esc(b.status)}</span></div>`).join('');
    addBot(`<b>Ringkasan booking operasional</b><div class="assistant-data-list">${html}</div>`,[{label:'Buka semua booking',value:'buka booking admin'}]);
  }

  function showPayments(){
    const list=currentRole()==='admin'?transactions:transactions.filter(t=>t.user===activeUser);
    const html=list.map(t=>`<div class="assistant-data-row"><div><b>${esc(t.booking)}</b><span>${esc(t.method)} • ${rupiah(t.base+t.fine)}</span></div><span class="assistant-status ${normalize(t.status)}">${esc(t.status)}</span></div>`).join('');
    addBot(`<b>Status pembayaran</b><div class="assistant-data-list">${html||'<span>Tidak ada transaksi.</span>'}</div>`, [{label:'Buka transaksi',value:'buka transaksi'}]);
  }

  function showPendingPayments(){
    const list=transactions.filter(t=>t.status==='Pending');
    const html=list.map(t=>`<div class="assistant-data-row"><div><b>${esc(t.booking)}</b><span>${esc(t.user)} • ${rupiah(t.base+t.fine)}</span></div><span class="assistant-status pending">Pending</span></div>`).join('');
    addBot(list.length?`Ada <b>${list.length} pembayaran pending</b>.<div class="assistant-data-list">${html}</div>`:'Tidak ada pembayaran pending saat ini.');
  }

  function showStock(){
    const crit=adminEquipment.filter(e=>e.status==='Kritis');
    const html=crit.map(e=>{const available=e.total-e.rented-e.damaged;return `<div class="assistant-data-row"><div><b>${esc(e.name)}</b><span>${available} tersedia dari ${e.total}</span></div><span class="assistant-status pending">Kritis</span></div>`}).join('');
    addBot(`<b>${crit.length} item butuh perhatian</b><div class="assistant-data-list">${html}</div>`, currentRole()==='admin'?[{label:'Buka inventaris',value:'buka inventaris'}]:[]);
  }

  function showPenaltyStatus(){
    addBot(`Denda global saat ini <b>${state.penaltyOn?'AKTIF':'NONAKTIF'}</b> dengan mode <b>${esc(state.penaltyMode)}</b>. ${currentRole()==='admin'?'Kamu bisa bilang “denda off” atau “denda on”.':'Perubahan aturan hanya tersedia untuk Admin.'}`);
  }

  function requireAdmin(fn){ if(currentRole()!=='admin') return addBot('Aksi itu hanya boleh dilakukan oleh <b>Admin</b>. Saya tidak akan melewati otorisasi hanya karena diminta lewat chat.'); return fn(); }
  function setPenalty(on){
    return requireAdmin(()=>{
      if(Boolean(state.penaltyOn)!==on){ const toggle=document.querySelector('#globalPenaltyToggle'); if(toggle) toggle.click(); else state.penaltyOn=on; }
      addBot(`Denda global sekarang <b>${on?'AKTIF':'NONAKTIF'}</b>. Perubahan dijalankan lewat kontrol sistem, bukan langsung menulis database.`);
      pushNotification({role:'admin',type:'rule',title:`Denda global ${on?'diaktifkan':'dinonaktifkan'}`,body:'Perubahan dilakukan melalui Arena Assistant prototype.',view:'admin-penalty'});
    });
  }

  function parseBookingId(text){ const m=text.toUpperCase().match(/BK-?\d{6}-?\d{3}|BK-\d{6}-\d{3}/); return m?m[0].replace(/^BK(\d)/,'BK-$1').replace(/(\d{6})(\d{3})$/,'$1-$2'):null; }
  function requestCancel(text){
    const id=parseBookingId(text) || (assistantState.pendingAction && assistantState.pendingAction.id);
    if(!id) return addBot('Sebutkan kode booking-nya, misalnya <b>cancel BK-260914-015</b>.');
    const booking=bookings.find(b=>b.id===id);
    if(!booking) return addBot(`Booking <b>${esc(id)}</b> tidak ditemukan.`);
    if(currentRole()!=='admin' && booking.user!==activeUser) return addBot('Booking itu bukan milik akun aktif. Saya menolak pembatalan untuk mencegah aksi tanpa izin.');
    if(['Cancelled','Completed'].includes(booking.status)) return addBot(`Booking <b>${esc(id)}</b> berstatus ${esc(booking.status)} dan tidak bisa dibatalkan dari flow ini.`);
    const fine=state.penaltyOn?Math.min(booking.amount*.1,50000):0;
    assistantState.pendingAction={type:'cancel',id, fine};
    addBot(`<b>Konfirmasi pembatalan</b><div class="assistant-confirm-card"><span>${esc(booking.id)}</span><strong>${esc(booking.court)}</strong><p>${esc(booking.date)} • ${esc(booking.time)}</p><div><span>Estimasi denda</span><b>${rupiah(fine)}</b></div></div>Saya belum membatalkan apa pun sebelum kamu konfirmasi.`,[{label:'Ya, batalkan',value:`konfirmasi cancel ${id}`},{label:'Jangan batalkan',value:'jangan batalkan'}]);
  }

  function confirmCancel(text){
    const id=parseBookingId(text) || (assistantState.pendingAction&&assistantState.pendingAction.id);
    if(!id || !assistantState.pendingAction || assistantState.pendingAction.id!==id) return addBot('Tidak ada pembatalan yang sedang menunggu konfirmasi. Mulai dengan <b>cancel [kode booking]</b>.');
    const booking=bookings.find(b=>b.id===id);
    if(!booking) return addBot('Booking tidak ditemukan.');
    booking.status='Cancelled';
    const trx=transactions.find(t=>t.booking===id); if(trx && trx.status==='Pending') trx.status='Cancelled';
    assistantState.pendingAction=null;
    if(typeof renderUserBookings==='function') renderUserBookings();
    if(typeof renderAdminBookings==='function') renderAdminBookings();
    if(typeof renderTransactions==='function') renderTransactions();
    addBot(`Booking <b>${esc(id)}</b> berhasil dibatalkan pada prototype. Tampilan booking dan transaksi sudah saya sinkronkan.`);
    pushNotification({role:currentRole(),type:'cancel',title:'Booking dibatalkan',body:`${id} telah dibatalkan melalui Arena Assistant.`,view:currentRole()==='admin'?'admin-bookings':'my-bookings'});
  }

  function simulatePayment(text){
    const id=parseBookingId(text) || 'BK-260914-021';
    const trx=transactions.find(t=>t.booking===id);
    if(!trx) return addBot(`Transaksi untuk <b>${esc(id)}</b> tidak ditemukan.`);
    if(currentRole()!=='admin' && trx.user!==activeUser) return addBot('Saya tidak dapat mengubah pembayaran milik pengguna lain.');
    if(trx.status==='Paid') return addBot(`Pembayaran <b>${esc(id)}</b> sudah berstatus Paid.`);
    trx.status='Paid';
    const booking=bookings.find(b=>b.id===id); if(booking) booking.status='Confirmed';
    if(typeof renderTransactions==='function') renderTransactions();
    if(typeof renderAdminBookings==='function') renderAdminBookings();
    if(typeof renderUserBookings==='function') renderUserBookings();
    addBot(`<b>Simulasi webhook berhasil.</b><br>${esc(id)} → PAID → booking CONFIRMED. Di versi produksi, perubahan ini hanya boleh terjadi setelah signature/payment status diverifikasi backend.`);
    pushNotification({role:'all',type:'payment',title:'Pembayaran terkonfirmasi',body:`${id} berhasil dibayar dan booking otomatis dikonfirmasi.`,view:currentRole()==='admin'?'admin-transactions':'user-transactions'});
  }

  function extractHour(text){ const m=text.match(/(?:jam|pukul|pk\.?)[ .:]?(\d{1,2})(?:[:.]?(\d{2}))?/); if(!m) return null; return String(m[1]).padStart(2,'0')+':'+String(m[2]||'00').padStart(2,'0'); }
  function findCourtIndex(text){
    if(text.includes('badminton')) return 2;
    if(text.includes('basket')) return 3;
    if(text.includes('futsal b')) return 1;
    if(text.includes('futsal')) return 0;
    return state.court||0;
  }
  function checkAvailability(text){
    const hour=extractHour(text);
    const ci=findCourtIndex(text); const court=courts[ci];
    let candidates=slotTemplate.map((s,i)=>({...s,i})).filter(s=>s.s==='free');
    if(hour) candidates=candidates.filter(s=>s.t.startsWith(hour));
    if(!candidates.length) return addBot(`Untuk <b>${esc(court.name)}</b>${hour?` pukul <b>${hour}</b>`:''}, tidak ada slot bebas pada data demo.`,[{label:'Buka jadwal',value:'buka jadwal'}]);
    const rows=candidates.slice(0,5).map(s=>`<div class="assistant-slot-row"><b>${esc(s.t)}</b><span>${rupiah(Math.round(s.p*(ci===2?.6:ci===3?.8:ci===1?.9:1)/5000)*5000)}</span></div>`).join('');
    addBot(`<b>${esc(court.name)}</b>${hour?` • sekitar ${hour}`:''}<div class="assistant-data-list">${rows}</div>`,[{label:'Buka jadwal',value:'buka jadwal'},{label:'Siapkan booking',value:`booking ${court.type.toLowerCase()} ${hour?'jam '+hour.split(':')[0]:'jam 21'}`}]);
  }

  function prepareBooking(text){
    const hour=extractHour(text) || '21:00';
    const ci=findCourtIndex(text); const court=courts[ci];
    const idx=slotTemplate.findIndex(s=>s.s==='free' && s.t.startsWith(hour));
    if(idx<0) return addBot(`Slot ${esc(hour)} untuk <b>${esc(court.name)}</b> tidak tersedia. Saya tidak akan memaksa melewati aturan anti double-booking.`,[{label:'Cari slot lain',value:`cek jadwal ${court.type.toLowerCase()}`}]);
    state.court=ci; state.day=0;
    if(typeof renderCourts==='function') renderCourts();
    if(typeof renderSchedule==='function') renderSchedule();
    if(typeof switchView==='function') switchView('booking');
    const factor=ci===2?.6:ci===3?.8:ci===1?.9:1;
    const price=Math.round(slotTemplate[idx].p*factor/5000)*5000;
    setTimeout(()=>{ if(typeof openCheckout==='function') openCheckout(idx,price); },220);
    addBot(`Siap. Saya pilih <b>${esc(court.name)}</b> pukul <b>${esc(slotTemplate[idx].t)}</b> dan membuka checkout. Kamu tetap yang menekan konfirmasi terakhir.`);
  }

  function addEquipmentFromChat(text){
    if(!state.slot || !document.querySelector('#checkoutDrawer').classList.contains('open')) return addBot('Buka atau siapkan booking dulu. Perlengkapan baru bisa ditambahkan ketika checkout aktif.');
    const map={bola:'ball',rompi:'vest',sepatu:'shoes',cone:'cones'};
    const key=Object.keys(map).find(k=>text.includes(k)); if(!key) return;
    const qtyMatch=text.match(/\b(\d+)\b/); const qty=Math.max(1,+(qtyMatch?qtyMatch[1]:1));
    const id=map[key], item=equipment.find(e=>e.id===id);
    state.equipment[id]=Math.min(item.stock,state.equipment[id]+qty);
    if(typeof renderCheckout==='function') renderCheckout();
    addBot(`<b>${qty} ${esc(item.name)}</b> saya tambahkan ke checkout. Total di drawer sudah diperbarui.`);
  }

  function demoEvent(type){
    const role=currentRole();
    const map={
      payment:{role:'all',type:'payment',title:'Pembayaran masuk',body:'TRX-260914-142 • QRIS Rp170.000 berhasil. Booking otomatis Confirmed.',view:role==='admin'?'admin-transactions':'user-transactions'},
      reminder:{role:'all',type:'reminder',title:'Jadwal sebentar lagi',body:'Futsal A dimulai dalam 30 menit. Sistem mengirim reminder otomatis.',view:role==='admin'?'admin-schedule':'my-bookings'},
      cancel:{role:'all',type:'cancel',title:'Perubahan booking',body:'Satu booking dibatalkan. Slot 21:00 kembali tersedia secara otomatis.',view:role==='admin'?'admin-bookings':'booking'}
    };
    pushNotification(map[type]);
  }

  function pushNotification(data){
    const item={id:Date.now(),role:data.role||'all',type:data.type||'system',title:data.title,body:data.body,time:'Baru saja',view:data.view||null,read:false};
    assistantState.notifications.unshift(item);
    renderNotifications();
    flashNotification(item);
  }

  function flashNotification(item){
    const el=document.createElement('div');
    el.className='assistant-event-toast';
    el.innerHTML=`<span>${notificationIcon(item.type)}</span><div><b>${esc(item.title)}</b><p>${esc(item.body)}</p></div><button>×</button>`;
    document.body.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('show'));
    el.querySelector('button').onclick=()=>removeEventToast(el);
    el.onclick=e=>{ if(e.target.tagName!=='BUTTON'){ removeEventToast(el); if(item.view&&typeof switchView==='function') switchView(item.view); } };
    setTimeout(()=>removeEventToast(el),5200);
  }
  function removeEventToast(el){ if(!el||!el.parentNode)return; el.classList.remove('show'); setTimeout(()=>el.remove(),220); }
  function notificationIcon(type){ return ({payment:'Rp',reminder:'◷',warning:'!',stock:'▣',cancel:'×',booking:'✓',rule:'⚙'})[type]||'✦'; }

  function renderNotifications(){
    const list=document.querySelector('#notificationList'); if(!list)return;
    const role=currentRole();
    const visible=assistantState.notifications.filter(n=>n.role==='all'||n.role===role);
    list.innerHTML=visible.length?visible.map(n=>`<button class="notification-item ${n.read?'':'unread'}" data-notif-id="${n.id}"><span class="notification-icon ${esc(n.type)}">${notificationIcon(n.type)}</span><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${esc(n.time)}</small></div>${n.read?'':'<i></i>'}</button>`).join(''):'<div class="notification-empty">Belum ada notifikasi.</div>';
    list.querySelectorAll('[data-notif-id]').forEach(btn=>btn.addEventListener('click',()=>{
      const n=assistantState.notifications.find(x=>String(x.id)===btn.dataset.notifId); if(!n)return;
      n.read=true; renderNotifications(); closeNotifications(); if(n.view&&typeof switchView==='function') switchView(n.view);
    }));
    const unread=visible.filter(n=>!n.read).length; assistantState.unread=unread;
    const dot=document.querySelector('.notif-dot'); if(dot){ dot.style.display=unread?'block':'none'; dot.dataset.count=String(unread); }
  }

  // Handle helper commands that navigate to admin-only views after the main router.
  const originalRouteIntent = routeIntent;
  routeIntent = function(text, raw){
    if(text==='buka booking saya') return navigate('my-bookings','Booking Saya sudah saya buka.');
    if(text==='buka booking admin') return requireAdmin(()=>navigate('admin-bookings','Semua booking admin sudah saya buka.'));
    if(text==='buka inventaris') return requireAdmin(()=>navigate('admin-equipment','Inventaris sudah saya buka.'));
    return originalRouteIntent(text, raw);
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',injectUI); else injectUI();
})();
