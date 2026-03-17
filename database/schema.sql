-- Teklif Sitesi Veritabanı Şeması
-- Bu dosyayı çalıştırmak için: psql -U postgres -f database/schema.sql

-- Veritabanı oluştur (eğer yoksa)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'teklif_db') THEN
    PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE teklif_db');
  END IF;
END $$;

-- Kullanıcılar tablosu
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
);

-- Ürünler tablosu
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
);

-- Teklifler tablosu
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
);

-- Teklif kalemleri tablosu
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
);

-- Demo admin kullanıcı (şifre: Admin123)
INSERT INTO users (ad, soyad, email, sifre, rol)
VALUES ('Admin', 'Kullanıcı', 'admin@teklif.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Demo ürünler
INSERT INTO urunler (ad, kod, sektor, birim, birim_fiyat, aciklama) VALUES
('Alüminyum Profil 40x40', 'ALU-4040', 'Alüminyum', 'metre', 125.00, '6063 T5 alüminyum profil'),
('PVC Pencere Profili', 'PVC-001', 'PVC', 'metre', 85.00, 'Beyond serisi PVC profil'),
('Temperli Cam 6mm', 'CAM-6MM', 'Cam', 'm²', 280.00, '6mm temperli düz cam'),
('Çelik Kutu Profil 50x50', 'CEL-5050', 'Çelik Konstrüksiyon', 'kg', 45.00, 'S235 çelik kutu profil'),
('Kompozit Panel 4mm', 'KOM-4MM', 'Kompozit', 'm²', 320.00, 'PVDF kaplı kompozit panel'),
('Demir Doğrama Profili', 'DEM-001', 'Demir Doğrama', 'kg', 38.00, 'Standart demir profil'),
('Alüminyum Profil 60x60', 'ALU-6060', 'Alüminyum', 'metre', 195.00, '6063 T5 alüminyum profil'),
('Çift Cam 4+12+4', 'CAM-DRT', 'Cam', 'm²', 450.00, 'Isıcam çift cam ünitesi')
ON CONFLICT (kod) DO NOTHING;
