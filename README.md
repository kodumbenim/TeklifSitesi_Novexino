# 📄 Teklif Sitesi

Profesyonel teklif yönetim sistemi. Node.js + Express + PostgreSQL ile geliştirilmiştir.

---

## 🚀 Özellikler

- **Güvenli Giriş:** JWT tabanlı kimlik doğrulama, bcrypt şifre hashleme
- **Teklif Yönetimi:** Otomatik TKL-YYYYAA-XXXX numaralı teklifler oluşturma, düzenleme, silme
- **Ürün Kalemleri:** Her teklife ürün ekle — sektör, ebat (En × Boy × Yükseklik), miktar, birim fiyat
- **İskonto Sistemi:** Yüzde bazlı iskonto — ara toplam, iskonto tutarı ve net toplam otomatik hesaplanır
- **Müşteri Bilgileri:** Ad/soyad, firma, e-posta, telefon, geçerlilik tarihi
- **Durum Takibi:** Taslak → Gönderildi → Onaylandı / Reddedildi
- **Demo Ürünler:** 8 hazır ürün (Alüminyum, PVC, Cam, Çelik, Kompozit, Demir Doğrama)

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js + Express.js |
| Veritabanı | PostgreSQL 18 |
| Auth | JWT + bcryptjs |
| Frontend | HTML + CSS + Vanilla JS |
| ORM | node-postgres (pg) |

---

## ⚙️ Kurulum

### Gereksinimler
- [Node.js](https://nodejs.org) v18+
- [PostgreSQL](https://www.postgresql.org/download/) 15+

### 1. Bağımlılıkları kur
```bash
npm install
```

### 2. `.env` dosyasını düzenle
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=teklif_db
DB_USER=postgres
DB_PASSWORD=SİFRENİZ
JWT_SECRET=teklif_super_secret_key_2024
JWT_EXPIRES_IN=7d
PORT=3000
```

### 3. Veritabanını kur (ilk seferinde)
```bash
node database/setup.js
```

Bu komut:
- `teklif_db` veritabanını oluşturur
- Tüm tabloları (users, urunler, teklifler, teklif_kalemleri) oluşturur
- `admin@teklif.com / Admin123` demo hesabını ekler
- 8 demo ürün yükler

### 4. Sunucuyu başlat
```bash
node server.js
```

### 5. Tarayıcıdan aç
```
http://localhost:3000
```

---

## 🗂️ Proje Yapısı

```
Teklif_Sitesi/
├── server.js                  # Express sunucusu Ana giriş noktası
├── .env                       # Ortam değişkenleri (DB, JWT)
├── package.json
├── config/
│   └── db.js                  # PostgreSQL bağlantı havuzu
├── middleware/
│   └── auth.js                # JWT doğrulama middleware
├── routes/
│   ├── auth.js                # POST /api/auth/login|register
│   ├── urunler.js             # GET|POST|PUT|DELETE /api/urunler
│   └── teklifler.js           # GET|POST|PUT|DELETE /api/teklifler
│                              # POST /api/teklifler/:id/kalemler
│                              # PUT  /api/teklifler/:id/iskonto
├── database/
│   ├── schema.sql             # SQL şema (referans)
│   └── setup.js               # Otomatik kurulum scripti
└── public/
    ├── index.html             # Login sayfası
    ├── dashboard.html         # Ana uygulama
    ├── css/
    │   ├── login.css
    │   └── dashboard.css
    └── js/
        ├── login.js
        └── app.js
```

---

## 🔌 API Endpoint'leri

### Auth
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/login` | Giriş yap, JWT token al |
| POST | `/api/auth/register` | Yeni kullanıcı kaydet |

### Ürünler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/urunler` | Tüm ürünleri listele |
| POST | `/api/urunler` | Yeni ürün ekle |
| PUT | `/api/urunler/:id` | Ürün güncelle |
| DELETE | `/api/urunler/:id` | Ürün sil (soft delete) |

### Teklifler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/teklifler` | Tüm teklifleri listele |
| GET | `/api/teklifler/:id` | Teklif detayı + kalemleri |
| POST | `/api/teklifler` | Yeni teklif oluştur |
| PUT | `/api/teklifler/:id` | Teklif güncelle |
| PUT | `/api/teklifler/:id/iskonto` | İskonto uygula |
| DELETE | `/api/teklifler/:id` | Teklif sil |
| POST | `/api/teklifler/:id/kalemler` | Kaleme ürün ekle |
| DELETE | `/api/teklifler/:id/kalemler/:kalemId` | Kalemi sil |

---

## 🔑 Demo Hesap

| Alan | Değer |
|------|-------|
| E-posta | `admin@teklif.com` |
| Şifre | `Admin123` |
| Rol | Admin |

---

## 🔁 Sunucuyu Yeniden Başlatma (Windows)

PostgreSQL her seferinde başlatılmalıdır:
```powershell
# Admin PowerShell ile:
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "C:\PostgreSQL\data" start

# Sonra normal terminal ile:
node server.js
```

---

## 📜 Lisans

MIT © 2026
