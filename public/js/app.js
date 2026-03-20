const API = 'http://localhost:3000/api';
let aktifTeklifId = null;
let tumUrunler = [];
let tumTeklifler = [];
let tumKategoriler = [];

// ---- AUTH ----
function tokenAl() { return localStorage.getItem('token'); }

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenAl()}`,
  };
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(API + url, { ...opts, headers: authHeaders() });
  if (res.status === 401) { cikisYap(); return null; }
  return res;
}

function cikisYap() {
  localStorage.removeItem('token');
  localStorage.removeItem('kullanici');
  window.location.href = '/';
}

// ---- INIT ----
async function init() {
  if (!tokenAl()) { window.location.href = '/'; return; }

  const kullanici = JSON.parse(localStorage.getItem('kullanici') || '{}');
  document.getElementById('userName').textContent = `${kullanici.ad || ''} ${kullanici.soyad || ''}`.trim() || 'Kullanıcı';
  document.getElementById('userRole').textContent = kullanici.rol || 'kullanici';
  document.getElementById('userAvatar').textContent = (kullanici.ad || 'K')[0].toUpperCase();

  await Promise.all([teklifleriYukle(), urunleriYukle(), kategorileriYukle()]);
}

// ---- TEKLİFLER ----
async function teklifleriYukle() {
  const res = await apiFetch('/teklifler');
  if (!res) return;
  tumTeklifler = await res.json();
  teklifListesiRender(tumTeklifler);
}

function teklifListesiRender(teklifler) {
  const container = document.getElementById('teklifListesi');
  if (!teklifler.length) {
    container.innerHTML = '<div class="empty-state-sidebar"><p>Henüz teklif yok</p></div>';
    return;
  }
  container.innerHTML = teklifler.map(t => `
    <div class="teklif-list-item ${t.id === aktifTeklifId ? 'active' : ''}" onclick="teklifAc(${t.id})" id="tli-${t.id}">
      <div class="tli-no">${t.teklif_no}</div>
      <div class="tli-baslik">${escHtml(t.baslik)}</div>
      <div class="tli-musteri">${escHtml(t.musteri_firma || t.musteri_ad || '—')}</div>
    </div>
  `).join('');
}

async function teklifAc(id) {
  aktifTeklifId = id;
  document.querySelectorAll('.teklif-list-item').forEach(el => el.classList.remove('active'));
  const li = document.getElementById(`tli-${id}`);
  if (li) li.classList.add('active');

  const res = await apiFetch(`/teklifler/${id}`);
  if (!res || !res.ok) return;
  const teklif = await res.json();

  document.getElementById('welcomeScreen').style.display = 'none';
  document.getElementById('teklifView').style.display = 'flex';

  renderTeklif(teklif);
}

function renderTeklif(teklif) {
  document.getElementById('viewTeklifNo').textContent = teklif.teklif_no;
  document.getElementById('viewBaslik').textContent = teklif.baslik;
  document.getElementById('viewMusteri').textContent = [teklif.musteri_ad, teklif.musteri_firma].filter(Boolean).join(' — ') || '—';

  const durumEl = document.getElementById('viewDurum');
  durumEl.textContent = durumLabel(teklif.durum);
  durumEl.className = `durum-badge durum-${teklif.durum}`;

  // Müşteri özet
  const musteriOzet = document.getElementById('musteriOzet');
  const musteriBilgileri = [
    { label: 'Müşteri', value: teklif.musteri_ad || '—' },
    { label: 'Firma', value: teklif.musteri_firma || '—' },
    { label: 'E-posta', value: teklif.musteri_email || '—' },
    { label: 'Telefon', value: teklif.musteri_telefon || '—' },
    { label: 'Geçerlilik', value: teklif.gecerlilik_tarihi ? new Date(teklif.gecerlilik_tarihi).toLocaleDateString('tr-TR') : '—' },
  ];
  musteriOzet.innerHTML = musteriBilgileri.map(m => `
    <div class="musteri-ozet-item"><label>${m.label}</label><span>${escHtml(m.value)}</span></div>
  `).join('');

  // Kalemler
  renderKalemler(teklif.kalemler || []);

  // Finans
  document.getElementById('viewNotlar').textContent = teklif.notlar || '—';
  document.getElementById('araToplam').textContent = formatPara(teklif.ara_toplam);
  document.getElementById('iskontoInput').value = teklif.iskonto_yuzdesi || 0;
  document.getElementById('iskontoTutar').textContent = `-${formatPara(teklif.iskonto_tutari)}`;
  document.getElementById('genelToplam').textContent = formatPara(teklif.toplam_tutar);
}

function renderKalemler(kalemler) {
  const tbody = document.getElementById('kalemlerBody');
  if (!kalemler.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><div class="empty-table-msg"><p>Henüz ürün eklenmedi. "Ürün Ekle" butonuna tıklayın.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = kalemler.map((k, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div style="font-weight:500">${escHtml(k.urun_ad)}</div>
        ${k.aciklama ? `<div style="font-size:11px;color:#9ca3af">${escHtml(k.aciklama)}</div>` : ''}
      </td>
      <td><span class="sektor-chip">${escHtml(k.sektor || '—')}</span></td>
      <td style="font-size:12px;color:#6b7280">
        ${formatEbat(k.en, k.boy, k.yukseklik)}
      </td>
      <td>${escHtml(k.birim)}</td>
      <td>${formatSayi(k.miktar)}</td>
      <td>${formatPara(k.birim_fiyat)}</td>
      <td class="tutar-cell">${formatPara(k.tutar)}</td>
      <td>
        <button class="btn-delete-kalem" onclick="kalemSil(${k.id})" title="Sil">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9,6V4h6v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// ---- MODAL: YENİ TEKLİF ----
function yeniTeklifModal() {
  document.getElementById('formYeniTeklif').reset();
  modalAc('modalYeniTeklif');
}

document.getElementById('formYeniTeklif').addEventListener('submit', async function (e) {
  e.preventDefault();
  const gecerlilik = document.getElementById('nt_gecerlilik').value;
  const body = {
    baslik: document.getElementById('nt_baslik').value.trim(),
    musteri_ad: document.getElementById('nt_musteri_ad').value.trim(),
    musteri_firma: document.getElementById('nt_musteri_firma').value.trim(),
    musteri_email: document.getElementById('nt_musteri_email').value.trim(),
    musteri_telefon: document.getElementById('nt_musteri_tel').value.trim(),
    notlar: document.getElementById('nt_notlar').value.trim(),
    gecerlilik_tarihi: gecerlilik || null,
  };

  const res = await apiFetch('/teklifler', { method: 'POST', body: JSON.stringify(body) });
  if (!res || !res.ok) { alert('Teklif oluşturulamadı.'); return; }
  const teklif = await res.json();

  modalKapat('modalYeniTeklif');
  await teklifleriYukle();
  teklifAc(teklif.id);
});

// ---- MODAL: ÜRÜN EKLE ----
async function urunleriYukle() {
  const res = await apiFetch('/urunler');
  if (!res) return;
  tumUrunler = await res.json();
}

async function kategorileriYukle() {
  const res = await apiFetch('/kategoriler');
  if (!res) return;
  tumKategoriler = await res.json();
}

function urunEkleModal() {
  if (!aktifTeklifId) return;
  document.getElementById('formUrunEkle').reset();
  document.getElementById('previewTutar').textContent = '₺0,00';

  // Kategori dropdown'ını API'den gelen verilerle dinamik doldur
  const sektorSelect = document.getElementById('ue_sektor');
  sektorSelect.innerHTML = '<option value="">Kategori seçin</option>';
  tumKategoriler.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k.id;
    opt.textContent = k.ad;
    sektorSelect.appendChild(opt);
  });

  renderUrunChips(tumUrunler);
  modalAc('modalUrunEkle');
}

function renderUrunChips(urunler) {
  const container = document.getElementById('urunListesiModal');
  if (!urunler.length) {
    container.innerHTML = '<p style="font-size:12px;color:#9ca3af">Ürün bulunamadı.</p>';
    return;
  }
  container.innerHTML = urunler.map(u => `
    <div class="urun-chip" onclick="urunSec(${JSON.stringify(u).replace(/"/g, '&quot;')})">
      ${escHtml(u.ad)} <span style="opacity:0.6;font-size:10px">${escHtml(u.sektor)}</span>
    </div>
  `).join('');
}

function urunSec(urun) {
  document.getElementById('ue_ad').value = urun.ad;
  document.getElementById('ue_sektor').value = urun.kategori_id || '';
  document.getElementById('ue_birim').value = urun.birim;
  document.getElementById('ue_fiyat').value = urun.birim_fiyat;
  document.getElementById('ue_aciklama').value = urun.aciklama || '';
  hesaplaPreview();
}

function urunFiltrele(q) {
  const filtred = tumUrunler.filter(u =>
    u.ad.toLowerCase().includes(q.toLowerCase()) ||
    u.sektor.toLowerCase().includes(q.toLowerCase())
  );
  renderUrunChips(filtred);
}

function hesaplaPreview() {
  const miktar = parseFloat(document.getElementById('ue_miktar').value) || 0;
  const fiyat = parseFloat(document.getElementById('ue_fiyat').value) || 0;
  document.getElementById('previewTutar').textContent = formatPara(miktar * fiyat);
}

document.getElementById('formUrunEkle').addEventListener('submit', async function (e) {
  e.preventDefault();
  const kategoriId = parseInt(document.getElementById('ue_sektor').value);
  const kategori = tumKategoriler.find(k => k.id === kategoriId);
  const body = {
    urun_ad: document.getElementById('ue_ad').value.trim(),
    kategori_id: kategoriId || null,
    sektor: kategori?.ad || '',
    birim: document.getElementById('ue_birim').value,
    en: parseFloat(document.getElementById('ue_en').value) || null,
    boy: parseFloat(document.getElementById('ue_boy').value) || null,
    yukseklik: parseFloat(document.getElementById('ue_yukseklik').value) || null,
    miktar: parseFloat(document.getElementById('ue_miktar').value),
    birim_fiyat: parseFloat(document.getElementById('ue_fiyat').value),
    aciklama: document.getElementById('ue_aciklama').value.trim(),
  };

  const res = await apiFetch(`/teklifler/${aktifTeklifId}/kalemler`, { method: 'POST', body: JSON.stringify(body) });
  if (!res || !res.ok) { alert('Ürün eklenemedi.'); return; }

  modalKapat('modalUrunEkle');
  teklifAc(aktifTeklifId);
});

// ---- KALEM SİL ----
async function kalemSil(kalemId) {
  if (!confirm('Bu kalemi silmek istediğinize emin misiniz?')) return;
  const res = await apiFetch(`/teklifler/${aktifTeklifId}/kalemler/${kalemId}`, { method: 'DELETE' });
  if (!res || !res.ok) { alert('Kalem silinemedi.'); return; }
  teklifAc(aktifTeklifId);
}

// ---- İSKONTO ----
async function iskontoUygula() {
  const iskonto = parseFloat(document.getElementById('iskontoInput').value) || 0;
  if (iskonto < 0 || iskonto > 100) { alert('İskonto 0-100 arasında olmalıdır.'); return; }

  const res = await apiFetch(`/teklifler/${aktifTeklifId}/iskonto`, {
    method: 'PUT',
    body: JSON.stringify({ iskonto_yuzdesi: iskonto }),
  });
  if (!res || !res.ok) { alert('İskonto uygulanamadı.'); return; }
  const teklif = await res.json();

  // Finans güncelle
  document.getElementById('iskontoTutar').textContent = `-${formatPara(teklif.iskonto_tutari)}`;
  document.getElementById('genelToplam').textContent = formatPara(teklif.toplam_tutar);
  document.getElementById('araToplam').textContent = formatPara(teklif.ara_toplam);

  // Animasyon
  const genelEl = document.getElementById('genelToplam');
  genelEl.style.transform = 'scale(1.08)';
  genelEl.style.transition = 'transform 0.3s';
  setTimeout(() => { genelEl.style.transform = 'scale(1)'; }, 300);
}

// ---- MODAL: DÜZENLE ----
async function teklifDuzenleModal() {
  const res = await apiFetch(`/teklifler/${aktifTeklifId}`);
  if (!res) return;
  const t = await res.json();

  document.getElementById('du_baslik').value = t.baslik;
  document.getElementById('du_musteri_ad').value = t.musteri_ad || '';
  document.getElementById('du_musteri_firma').value = t.musteri_firma || '';
  document.getElementById('du_musteri_email').value = t.musteri_email || '';
  document.getElementById('du_musteri_tel').value = t.musteri_telefon || '';
  document.getElementById('du_durum').value = t.durum;
  document.getElementById('du_gecerlilik').value = t.gecerlilik_tarihi ? t.gecerlilik_tarihi.split('T')[0] : '';
  document.getElementById('du_notlar').value = t.notlar || '';

  modalAc('modalDuzenle');
}

document.getElementById('formDuzenle').addEventListener('submit', async function (e) {
  e.preventDefault();
  const body = {
    baslik: document.getElementById('du_baslik').value.trim(),
    musteri_ad: document.getElementById('du_musteri_ad').value.trim(),
    musteri_firma: document.getElementById('du_musteri_firma').value.trim(),
    musteri_email: document.getElementById('du_musteri_email').value.trim(),
    musteri_telefon: document.getElementById('du_musteri_tel').value.trim(),
    durum: document.getElementById('du_durum').value,
    gecerlilik_tarihi: document.getElementById('du_gecerlilik').value || null,
    notlar: document.getElementById('du_notlar').value.trim(),
  };

  const res = await apiFetch(`/teklifler/${aktifTeklifId}`, { method: 'PUT', body: JSON.stringify(body) });
  if (!res || !res.ok) { alert('Güncelleme başarısız.'); return; }

  modalKapat('modalDuzenle');
  await teklifleriYukle();
  teklifAc(aktifTeklifId);
});

// ---- TEKLİF SİL ----
async function teklifSil() {
  if (!confirm('Bu teklifi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
  const res = await apiFetch(`/teklifler/${aktifTeklifId}`, { method: 'DELETE' });
  if (!res || !res.ok) { alert('Teklif silinemedi.'); return; }

  aktifTeklifId = null;
  document.getElementById('welcomeScreen').style.display = 'flex';
  document.getElementById('teklifView').style.display = 'none';
  await teklifleriYukle();
}

// ---- HELPERS ----
function modalAc(id) { document.getElementById(id).classList.add('active'); }
function modalKapat(id) { document.getElementById(id).classList.remove('active'); }

function formatPara(sayi) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(sayi || 0);
}

function formatSayi(sayi) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(sayi || 0);
}

function formatEbat(en, boy, yukseklik) {
  const parts = [en, boy, yukseklik].filter(v => v !== null && v !== undefined && v > 0);
  if (!parts.length) return '—';
  return parts.map(v => parseFloat(v).toLocaleString('tr-TR')).join(' × ') + ' cm';
}

function escHtml(str) {
  if (!str) return '';
  return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function durumLabel(d) {
  const map = { taslak: 'Taslak', 'gönderildi': 'Gönderildi', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
  return map[d] || d;
}

// ESC tuşu modal kapatır
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

// Başlat
init();
