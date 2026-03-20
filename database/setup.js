require('dotenv').config();
const { Client } = require('pg');

async function setup() {
  // Önce postgres veritabanına bağlan
  const adminClient = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  });

  try {
    await adminClient.connect();
    console.log('✅ PostgreSQL bağlantısı kuruldu');

    const dbCheck = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'teklif_db'"
    );
    if (dbCheck.rows.length === 0) {
      await adminClient.query('CREATE DATABASE teklif_db');
      console.log('✅ teklif_db veritabanı oluşturuldu');
    } else {
      console.log('ℹ️  teklif_db zaten mevcut');
    }
    await adminClient.end();
  } catch (err) {
    console.error('❌ Veritabanı oluşturma hatası:', err.message);
    await adminClient.end().catch(() => {});
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'teklif_db',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  });

  try {
    await client.connect();
    console.log('✅ teklif_db bağlantısı kuruldu');

    // Users tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        ad VARCHAR(100) NOT NULL,
        soyad VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        sifre VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'kullanici',
        aktif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ users tablosu hazır');

    // Kategoriler tablosu (YENİ)
    await client.query(`
      CREATE TABLE IF NOT EXISTS kategoriler (
        id SERIAL PRIMARY KEY,
        ad VARCHAR(100) UNIQUE NOT NULL,
        aciklama TEXT,
        renk VARCHAR(20) DEFAULT '#6366f1',
        aktif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ kategoriler tablosu hazır');

    // Urunler tablosu (kategori_id FK ile)
    await client.query(`
      CREATE TABLE IF NOT EXISTS urunler (
        id SERIAL PRIMARY KEY,
        ad VARCHAR(255) NOT NULL,
        kod VARCHAR(100) UNIQUE,
        kategori_id INTEGER REFERENCES kategoriler(id) ON DELETE SET NULL,
        sektor VARCHAR(100),
        birim VARCHAR(50) DEFAULT 'adet',
        birim_fiyat DECIMAL(12, 2) NOT NULL DEFAULT 0,
        para_birimi VARCHAR(10) DEFAULT 'TRY',
        aciklama TEXT,
        aktif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ urunler tablosu hazır');

    // Teklifler tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS teklifler (
        id SERIAL PRIMARY KEY,
        teklif_no VARCHAR(50) UNIQUE NOT NULL,
        baslik VARCHAR(255) NOT NULL,
        musteri_ad VARCHAR(255),
        musteri_firma VARCHAR(255),
        musteri_email VARCHAR(255),
        musteri_telefon VARCHAR(50),
        durum VARCHAR(50) DEFAULT 'taslak',
        notlar TEXT,
        gecerlilik_tarihi DATE,
        iskonto_yuzdesi DECIMAL(5, 2) DEFAULT 0,
        ara_toplam DECIMAL(14, 2) DEFAULT 0,
        iskonto_tutari DECIMAL(14, 2) DEFAULT 0,
        toplam_tutar DECIMAL(14, 2) DEFAULT 0,
        kullanici_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ teklifler tablosu hazır');

    // Teklif kalemleri tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS teklif_kalemleri (
        id SERIAL PRIMARY KEY,
        teklif_id INTEGER REFERENCES teklifler(id) ON DELETE CASCADE,
        urun_id INTEGER REFERENCES urunler(id),
        urun_ad VARCHAR(255) NOT NULL,
        kategori_id INTEGER REFERENCES kategoriler(id),
        sektor VARCHAR(100),
        en DECIMAL(10, 2),
        boy DECIMAL(10, 2),
        yukseklik DECIMAL(10, 2),
        birim VARCHAR(50) DEFAULT 'adet',
        miktar DECIMAL(10, 2) NOT NULL DEFAULT 1,
        birim_fiyat DECIMAL(12, 2) NOT NULL DEFAULT 0,
        tutar DECIMAL(14, 2) NOT NULL DEFAULT 0,
        aciklama TEXT,
        sira INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ teklif_kalemleri tablosu hazır');

    // ---- Demo Kategoriler (20 sektör) ----
    const kategoriler = [
      ['Alüminyum',            'Alüminyum profil, konstrüksiyon ve doğrama sistemleri', '#6366f1'],
      ['PVC',                  'PVC pencere, kapı ve cephe profilleri',                 '#8b5cf6'],
      ['Cam',                  'Düz cam, temperli cam, ısıcam ve aynalar',              '#06b6d4'],
      ['Çelik Konstrüksiyon',  'Çelik kutu profil, HEA, IPE ve konstrüksiyon çeliği',  '#64748b'],
      ['Demir Doğrama',        'Demir kapı, pencere ve çelik kapı sistemleri',         '#78716c'],
      ['Kompozit',             'ACM ve PVDF kaplı kompozit cephe panelleri',           '#f59e0b'],
      ['Paslanmaz Çelik',      '304 ve 316 kalite paslanmaz çelik profil ve levha',    '#94a3b8'],
      ['Galvanizli Çelik',     'Sıcak daldırma galvanizli çelik profil ve levha',     '#84cc16'],
      ['Ahşap',                'Doğal ahşap, laminant ve ahşap kompozit ürünler',      '#d97706'],
      ['Polikarbonat',         'Düz ve oluklu polikarbonat levha sistemleri',          '#0ea5e9'],
      ['EPDM & Silikon',       'Sızdırmazlık contaları, silikon mastik ve bantlar',    '#ec4899'],
      ['Isı Yalıtım',          'Taşyünü, EPS, XPS ve PIR yalıtım levhaları',          '#f97316'],
      ['Ses Yalıtım',          'Akustik panel, sünger ve ses yalıtım malzemeleri',    '#a855f7'],
      ['Boya & Kaplama',       'Endüstriyel boya, astar ve kaplama sistemleri',        '#ef4444'],
      ['Aksesuar & Bağlantı',  'Vida, dübel, köşebent ve profil aksesuarları',        '#10b981'],
      ['Kapı Sistemleri',      'Otomatik kapı, endüstriyel kapı ve panel kapı',        '#f43f5e'],
      ['Güneş Kontrolü',       'Solar cam filmi, güneşlik ve jalüzi sistemleri',      '#fbbf24'],
      ['Elektrik',             'Kablo, panel, aydınlatma ve elektrik malzemeleri',    '#3b82f6'],
      ['Mekanik Tesisat',      'Boru, vana, pompa ve klima sistemleri',               '#14b8a6'],
      ['Diğer',               'Yukarıdaki kategorilere girmeyen diğer ürünler',        '#9ca3af'],
    ];

    for (const [ad, aciklama, renk] of kategoriler) {
      await client.query(
        `INSERT INTO kategoriler (ad, aciklama, renk) VALUES ($1, $2, $3) ON CONFLICT (ad) DO NOTHING`,
        [ad, aciklama, renk]
      );
    }
    console.log(`✅ ${kategoriler.length} kategori yüklendi`);

    // ---- Demo Ürünler (kategori_id FK ile) ----
    const urunler = [
      ['Alüminyum Profil 40×40',    'ALU-4040', 'Alüminyum',          'metre', 125.00, '6063 T5 alüminyum profil'],
      ['Alüminyum Profil 60×60',    'ALU-6060', 'Alüminyum',          'metre', 195.00, '6063 T5 alüminyum profil'],
      ['Alüminyum Profil 80×80',    'ALU-8080', 'Alüminyum',          'metre', 285.00, '6063 T5 alüminyum profil'],
      ['PVC Pencere Profili T70',   'PVC-T70',  'PVC',                'metre',  85.00, 'Beyond T70 serisi'],
      ['PVC Kapı Profili T82',      'PVC-T82',  'PVC',                'metre', 110.00, 'Rehau T82 serisi'],
      ['Temperli Cam 6mm',          'CAM-6T',   'Cam',                'm²',    280.00, '6mm temperli düz cam'],
      ['Çift Cam 4+12+4',           'CAM-DRT',  'Cam',                'm²',    450.00, 'Isıcam çift cam ünitesi'],
      ['Çelik Kutu Profil 50×50',   'CEL-5050', 'Çelik Konstrüksiyon','kg',     45.00, 'S235 çelik kutu profil'],
      ['HEA 100 Profil',            'CEL-HEA1', 'Çelik Konstrüksiyon','kg',     52.00, 'HEA 100 çelik profil'],
      ['Kompozit Panel 4mm',        'KOM-4MM',  'Kompozit',           'm²',    320.00, 'PVDF kaplı kompozit panel'],
      ['Demir Doğrama Profili',     'DEM-001',  'Demir Doğrama',      'kg',     38.00, 'Standart demir profil'],
      ['Paslanmaz Boru 50×2mm',     'PAS-5002', 'Paslanmaz Çelik',   'metre', 220.00, '304 kalite paslanmaz'],
      ['Galvanizli Levha 2mm',      'GAL-2MM',  'Galvanizli Çelik',  'kg',     28.00, 'Sıcak daldırma galvaniz'],
      ['Polikarbonat Levha 6mm',    'POL-6MM',  'Polikarbonat',       'm²',    185.00, 'Şeffaf polikarbonat'],
      ['EPDM Conta 10×15mm',        'EPD-1015', 'EPDM & Silikon',    'metre',   8.50, 'Siyah EPDM sızdırmazlık'],
      ['Taşyünü Levha 5cm',         'ISI-TAS5', 'Isı Yalıtım',       'm²',     95.00, '50kg/m³ taşyünü'],
      ['Akustik Panel 30mm',        'SES-30MM', 'Ses Yalıtım',        'm²',    210.00, 'Yüksek absorbsiyon'],
      ['Endüstriyel Boya 15lt',     'BOY-15LT', 'Boya & Kaplama',    'adet',  485.00, 'Epoksi esaslı endüstriyel'],
      ['M10 Çelik Dübel',           'AKS-M10',  'Aksesuar & Bağlantı','kutu',   42.00, '100\'lük paket'],
      ['Güneş Filmi %50 Solar',     'GUN-S50',  'Güneş Kontrolü',    'm²',    125.00, '%50 güneş geçirgenliği'],
    ];

    for (const [ad, kod, kategoriAd, birim, fiyat, aciklama] of urunler) {
      const katRes = await client.query('SELECT id FROM kategoriler WHERE ad = $1', [kategoriAd]);
      const kategoriId = katRes.rows[0]?.id || null;
      await client.query(
        `INSERT INTO urunler (ad, kod, kategori_id, sektor, birim, birim_fiyat, aciklama)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (kod) DO UPDATE SET
         kategori_id = EXCLUDED.kategori_id, sektor = EXCLUDED.sektor`,
        [ad, kod, kategoriId, kategoriAd, birim, fiyat, aciklama]
      );
    }
    console.log(`✅ ${urunler.length} demo ürün yüklendi`);

    // Admin kullanıcı
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Admin123', 10);
    await client.query(
      `INSERT INTO users (ad, soyad, email, sifre, rol) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
      ['Admin', 'Kullanıcı', 'admin@teklif.com', hash, 'admin']
    );
    console.log('✅ Admin kullanıcı hazır (admin@teklif.com / Admin123)');

    console.log('\n🎉 Kurulum tamamlandı! Sunucuyu başlatmak için: node server.js');
    await client.end();
  } catch (err) {
    console.error('❌ Hata:', err.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

setup();
