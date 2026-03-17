// Login JS
const API_URL = 'http://localhost:3000/api';

// Eğer zaten giriş yapılmışsa direkt dashboard'a git
if (localStorage.getItem('token')) {
  window.location.href = '/dashboard';
}

document.getElementById('togglePw').addEventListener('click', function () {
  const input = document.getElementById('sifre');
  if (input.type === 'password') {
    input.type = 'text';
    this.querySelector('svg').innerHTML = `
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M10.94 6.08A6.93 6.93 0 0 1 12 6c3.18 0 6.17 2.29 7.76 6a15.23 15.23 0 0 1-1.13 2.2m-6.22 3.7A6.92 6.92 0 0 1 12 18c-3.18 0-6.17-2.29-7.76-6 .45-1.06 1-2.08 1.64-3.01"/>
      <path d="M1 12s4-8 11-8 11 8 11 8"/>`;
  } else {
    input.type = 'password';
    this.querySelector('svg').innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>`;
  }
});

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const sifre = document.getElementById('sifre').value;
  const errorMsg = document.getElementById('errorMsg');
  const loginBtn = document.getElementById('loginBtn');

  // UI: yükleniyor
  loginBtn.disabled = true;
  loginBtn.querySelector('.btn-text').style.display = 'none';
  loginBtn.querySelector('.btn-loader').style.display = 'flex';
  errorMsg.style.display = 'none';

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sifre }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.mesaj || 'Giriş başarısız.');
    }

    // Token ve kullanıcı bilgisini kaydet
    localStorage.setItem('token', data.token);
    localStorage.setItem('kullanici', JSON.stringify(data.kullanici));

    // Dashboard'a yönlendir
    window.location.href = '/dashboard';
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.style.display = 'block';

    loginBtn.disabled = false;
    loginBtn.querySelector('.btn-text').style.display = 'inline';
    loginBtn.querySelector('.btn-loader').style.display = 'none';
  }
});
