const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// GET /api/urunler - Tüm ürünleri listele (kategori JOIN ile)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, k.ad as kategori_ad, k.renk as kategori_renk
       FROM urunler u
       LEFT JOIN kategoriler k ON u.kategori_id = k.id
       WHERE u.aktif = true
       ORDER BY k.ad, u.ad`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// GET /api/urunler/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, k.ad as kategori_ad, k.renk as kategori_renk
       FROM urunler u
       LEFT JOIN kategoriler k ON u.kategori_id = k.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ mesaj: 'Ürün bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// POST /api/urunler - Yeni ürün ekle
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { ad, kod, kategori_id, birim, birim_fiyat, para_birimi, aciklama } = req.body;

    if (!ad || !kategori_id || birim_fiyat === undefined) {
      return res.status(400).json({ mesaj: 'Ad, kategori ve birim fiyat zorunludur.' });
    }

    // Kategori adını al (sektor alanına da yaz — geriye dönük uyumluluk)
    const katRes = await pool.query('SELECT ad FROM kategoriler WHERE id=$1', [kategori_id]);
    const sektorAd = katRes.rows[0]?.ad || '';

    const result = await pool.query(
      `INSERT INTO urunler (ad, kod, kategori_id, sektor, birim, birim_fiyat, para_birimi, aciklama)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [ad, kod || null, kategori_id, sektorAd, birim || 'adet', birim_fiyat, para_birimi || 'TRY', aciklama || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ mesaj: 'Bu ürün kodu zaten mevcut.' });
    console.error(err);
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// PUT /api/urunler/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { ad, kod, kategori_id, birim, birim_fiyat, para_birimi, aciklama } = req.body;
    const katRes = await pool.query('SELECT ad FROM kategoriler WHERE id=$1', [kategori_id]);
    const sektorAd = katRes.rows[0]?.ad || '';

    const result = await pool.query(
      `UPDATE urunler SET ad=$1, kod=$2, kategori_id=$3, sektor=$4, birim=$5, birim_fiyat=$6,
       para_birimi=$7, aciklama=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [ad, kod, kategori_id, sektorAd, birim, birim_fiyat, para_birimi, aciklama, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ mesaj: 'Ürün bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// DELETE /api/urunler/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE urunler SET aktif=false WHERE id=$1', [req.params.id]);
    res.json({ mesaj: 'Ürün silindi.' });
  } catch (err) {
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

module.exports = router;
