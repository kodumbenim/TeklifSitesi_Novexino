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

    // Veritabanını oluştur
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

  // Şimdi teklif_db'ye bağlan ve tabloları oluştur
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

    // Tablolar
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS urunler (
        id SERIAL PRIMARY KEY,
        ad VARCHAR(255) NOT NULL,
        kod VARCHAR(100) UNIQUE,
        sektor VARCHAR(100) NOT NULL,
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS teklif_kalemleri (
        id SERIAL PRIMARY KEY,
        teklif_id INTEGER REFERENCES teklifler(id) ON DELETE CASCADE,
        urun_id INTEGER REFERENCES urunler(id),
        urun_ad VARCHAR(255) NOT NULL,
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

    // Admin kullanıcı (şifre: Admin123)
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Admin123', 10);
    await client.query(
      `INSERT INTO users (ad, soyad, email, sifre, rol) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
      ['Admin', 'Kullanıcı', 'admin@teklif.com', hash, 'admin']
    );
    console.log('✅ Admin kullanıcı hazır (admin@teklif.com / Admin123)');

    // Demo ürünler
    const urunler = [
      ['Alüminyum Profil 40x40', 'ALU-4040', 'Alüminyum', 'metre', 125.00, '6063 T5 alüminyum profil'],
      ['PVC Pencere Profili', 'PVC-001', 'PVC', 'metre', 85.00, 'Beyond serisi PVC profil'],
      ['Temperli Cam 6mm', 'CAM-6MM', 'Cam', 'm²', 280.00, '6mm temperli düz cam'],
      ['Çelik Kutu Profil 50x50', 'CEL-5050', 'Çelik Konstrüksiyon', 'kg', 45.00, 'S235 çelik kutu profil'],
      ['Kompozit Panel 4mm', 'KOM-4MM', 'Kompozit', 'm²', 320.00, 'PVDF kaplı kompozit panel'],
      ['Demir Doğrama Profili', 'DEM-001', 'Demir Doğrama', 'kg', 38.00, 'Standart demir profil'],
      ['Alüminyum Profil 60x60', 'ALU-6060', 'Alüminyum', 'metre', 195.00, '6063 T5 alüminyum profil'],
      ['Çift Cam 4+12+4', 'CAM-DRT', 'Cam', 'm²', 450.00, 'Isıcam çift cam ünitesi'],
    ];

    for (const u of urunler) {
      await client.query(
        `INSERT INTO urunler (ad, kod, sektor, birim, birim_fiyat, aciklama) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (kod) DO NOTHING`,
        u
      );
    }
    console.log('✅ Demo ürünler yüklendi (8 ürün)');

    console.log('\n🎉 Kurulum tamamlandı! Sunucuyu başlatmak için: node server.js');
    await client.end();
  } catch (err) {
    console.error('❌ Tablo oluşturma hatası:', err.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

setup();
