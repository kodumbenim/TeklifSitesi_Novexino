const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// GET /api/kategoriler - Tüm kategorileri listele
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM kategoriler WHERE aktif = true ORDER BY ad'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// POST /api/kategoriler - Yeni kategori ekle
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { ad, aciklama, renk } = req.body;
    if (!ad) return res.status(400).json({ mesaj: 'Kategori adı zorunludur.' });

    const result = await pool.query(
      `INSERT INTO kategoriler (ad, aciklama, renk) VALUES ($1, $2, $3) RETURNING *`,
      [ad, aciklama || '', renk || '#6366f1']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ mesaj: 'Bu kategori zaten mevcut.' });
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// DELETE /api/kategoriler/:id - Kategori sil (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE kategoriler SET aktif=false WHERE id=$1', [req.params.id]);
    res.json({ mesaj: 'Kategori silindi.' });
  } catch (err) {
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

module.exports = router;
