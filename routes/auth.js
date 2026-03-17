const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, sifre } = req.body;

    if (!email || !sifre) {
      return res.status(400).json({ mesaj: 'E-posta ve şifre gereklidir.' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND aktif = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mesaj: 'E-posta veya şifre hatalı.' });
    }

    const user = result.rows[0];
    const sifreEslesti = await bcrypt.compare(sifre, user.sifre);

    if (!sifreEslesti) {
      return res.status(401).json({ mesaj: 'E-posta veya şifre hatalı.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      kullanici: {
        id: user.id,
        ad: user.ad,
        soyad: user.soyad,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error('Login hatası:', err);
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

// POST /api/auth/register (sadece admin)
router.post('/register', async (req, res) => {
  try {
    const { ad, soyad, email, sifre, rol } = req.body;

    if (!ad || !soyad || !email || !sifre) {
      return res.status(400).json({ mesaj: 'Tüm alanlar zorunludur.' });
    }

    const mevcutKullanici = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (mevcutKullanici.rows.length > 0) {
      return res.status(409).json({ mesaj: 'Bu e-posta zaten kayıtlı.' });
    }

    const hashedSifre = await bcrypt.hash(sifre, 10);
    const result = await pool.query(
      'INSERT INTO users (ad, soyad, email, sifre, rol) VALUES ($1, $2, $3, $4, $5) RETURNING id, ad, soyad, email, rol',
      [ad, soyad, email.toLowerCase(), hashedSifre, rol || 'kullanici']
    );

    res.status(201).json({ kullanici: result.rows[0] });
  } catch (err) {
    console.error('Register hatası:', err);
    res.status(500).json({ mesaj: 'Sunucu hatası.' });
  }
});

module.exports = router;
