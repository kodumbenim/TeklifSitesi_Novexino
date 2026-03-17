const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Teklif numarası üret
function teklifNoUret() {
  const tarih = new Date();
  const yil = tarih.getFullYear();
  const ay = String(tarih.getMonth() + 1).padStart(2, '0');
  const rastgele = Math.floor(Math.random() * 9000) + 1000;
  return `TKL-${yil}${ay}-${rastgele}`;
}

// GET /api/teklifler - Tüm teklifleri listele
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.ad || ' ' || u.soyad as kullanici_adi
       FROM teklifler t 
       LEFT JOIN users u ON t.kullanici_id = u.id
       ORDER BY t.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// GET /api/teklifler/:id - Teklif detayı + kalemleri
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const teklif = await pool.query('SELECT * FROM teklifler WHERE id = $1', [req.params.id]);
    if (teklif.rows.length === 0) return res.status(404).json({ mesaj: 'Teklif bulunamadı.' });

    const kalemler = await pool.query(
      'SELECT * FROM teklif_kalemleri WHERE teklif_id = $1 ORDER BY sira, id',
      [req.params.id]
    );

    res.json({ ...teklif.rows[0], kalemler: kalemler.rows });
  } catch (err) {
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// POST /api/teklifler - Yeni teklif oluştur
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { baslik, musteri_ad, musteri_firma, musteri_email, musteri_telefon, notlar, gecerlilik_tarihi } = req.body;

    if (!baslik) return res.status(400).json({ mesaj: 'Başlık zorunludur.' });

    const teklif_no = teklifNoUret();
    const result = await pool.query(
      `INSERT INTO teklifler (teklif_no, baslik, musteri_ad, musteri_firma, musteri_email, musteri_telefon, notlar, gecerlilik_tarihi, kullanici_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [teklif_no, baslik, musteri_ad, musteri_firma, musteri_email, musteri_telefon, notlar, gecerlilik_tarihi || null, req.kullanici.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// PUT /api/teklifler/:id - Teklif güncelle
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { baslik, musteri_ad, musteri_firma, musteri_email, musteri_telefon, durum, notlar, gecerlilik_tarihi } = req.body;
    const result = await pool.query(
      `UPDATE teklifler SET baslik=$1, musteri_ad=$2, musteri_firma=$3, musteri_email=$4, musteri_telefon=$5,
       durum=$6, notlar=$7, gecerlilik_tarihi=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [baslik, musteri_ad, musteri_firma, musteri_email, musteri_telefon, durum, notlar, gecerlilik_tarihi, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ mesaj: 'Teklif bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// PUT /api/teklifler/:id/iskonto - İskonto uygula
router.put('/:id/iskonto', authMiddleware, async (req, res) => {
  try {
    const { iskonto_yuzdesi } = req.body;
    const tekId = req.params.id;

    const teklif = await pool.query('SELECT ara_toplam FROM teklifler WHERE id=$1', [tekId]);
    if (teklif.rows.length === 0) return res.status(404).json({ mesaj: 'Teklif bulunamadı.' });

    const ara_toplam = parseFloat(teklif.rows[0].ara_toplam);
    const iskonto_tutari = (ara_toplam * parseFloat(iskonto_yuzdesi)) / 100;
    const toplam_tutar = ara_toplam - iskonto_tutari;

    const result = await pool.query(
      `UPDATE teklifler SET iskonto_yuzdesi=$1, iskonto_tutari=$2, toplam_tutar=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [iskonto_yuzdesi, iskonto_tutari, toplam_tutar, tekId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// DELETE /api/teklifler/:id - Teklif sil
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM teklifler WHERE id=$1', [req.params.id]);
    res.json({ mesaj: 'Teklif silindi.' });
  } catch (err) {
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// POST /api/teklifler/:id/kalemler - Kalem ekle
router.post('/:id/kalemler', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { urun_id, urun_ad, sektor, en, boy, yukseklik, birim, miktar, birim_fiyat, aciklama, sira } = req.body;
    const tekId = req.params.id;

    const tutar = parseFloat(miktar) * parseFloat(birim_fiyat);

    const kalemResult = await client.query(
      `INSERT INTO teklif_kalemleri (teklif_id, urun_id, urun_ad, sektor, en, boy, yukseklik, birim, miktar, birim_fiyat, tutar, aciklama, sira)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [tekId, urun_id || null, urun_ad, sektor, en || null, boy || null, yukseklik || null, birim || 'adet', miktar, birim_fiyat, tutar, aciklama || '', sira || 0]
    );

    // Ara toplamı güncelle
    const toplamResult = await client.query(
      'SELECT COALESCE(SUM(tutar), 0) as toplam FROM teklif_kalemleri WHERE teklif_id=$1',
      [tekId]
    );
    const ara_toplam = parseFloat(toplamResult.rows[0].toplam);

    const teklifRow = await client.query('SELECT iskonto_yuzdesi FROM teklifler WHERE id=$1', [tekId]);
    const iskonto_yuzdesi = parseFloat(teklifRow.rows[0].iskonto_yuzdesi);
    const iskonto_tutari = (ara_toplam * iskonto_yuzdesi) / 100;
    const toplam_tutar = ara_toplam - iskonto_tutari;

    await client.query(
      'UPDATE teklifler SET ara_toplam=$1, iskonto_tutari=$2, toplam_tutar=$3, updated_at=NOW() WHERE id=$4',
      [ara_toplam, iskonto_tutari, toplam_tutar, tekId]
    );

    await client.query('COMMIT');
    res.status(201).json(kalemResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
});

// DELETE /api/teklifler/:id/kalemler/:kalemId - Kalem sil
router.delete('/:id/kalemler/:kalemId', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tekId = req.params.id;

    await client.query('DELETE FROM teklif_kalemleri WHERE id=$1 AND teklif_id=$2', [req.params.kalemId, tekId]);

    const toplamResult = await client.query(
      'SELECT COALESCE(SUM(tutar), 0) as toplam FROM teklif_kalemleri WHERE teklif_id=$1', [tekId]
    );
    const ara_toplam = parseFloat(toplamResult.rows[0].toplam);
    const teklifRow = await client.query('SELECT iskonto_yuzdesi FROM teklifler WHERE id=$1', [tekId]);
    const iskonto_yuzdesi = parseFloat(teklifRow.rows[0].iskonto_yuzdesi);
    const iskonto_tutari = (ara_toplam * iskonto_yuzdesi) / 100;
    const toplam_tutar = ara_toplam - iskonto_tutari;

    await client.query(
      'UPDATE teklifler SET ara_toplam=$1, iskonto_tutari=$2, toplam_tutar=$3, updated_at=NOW() WHERE id=$4',
      [ara_toplam, iskonto_tutari, toplam_tutar, tekId]
    );

    await client.query('COMMIT');
    res.json({ mesaj: 'Kalem silindi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
});

module.exports = router;
