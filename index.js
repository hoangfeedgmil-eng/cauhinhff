const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const KEYS_FILE = path.join(__dirname, 'keys.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const ADMIN_TOKEN = 'hoangdzvcl'; // 👈 Token của mày
const usedKeys = {}; // Lưu IP đã kích hoạt key

function readKeys() {
  if (!fs.existsSync(KEYS_FILE)) return {};
  return JSON.parse(fs.readFileSync(KEYS_FILE));
}

function writeKeys(data) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(data, null, 2));
}

// ---------- GEN KEY (CHỈ ADMIN) ----------
app.post('/generate-key', (req, res) => {
  const token = req.headers['admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: '❌ Chỉ admin mới được gen key' });
  }

  const { duration } = req.body;
  if (!duration) return res.status(400).json({ error: 'Thiếu duration' });

  const now = Date.now();
  let expiry = now;
  if (duration === '1d') expiry += 86400000;
  else if (duration === '7d') expiry += 7 * 86400000;
  else if (duration === '30d') expiry += 30 * 86400000;
  else if (duration === '1y') expiry += 365 * 86400000;
  else return res.status(400).json({ error: 'Duration sai' });

  const key = 'KEY-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const keys = readKeys();
  keys[key] = { expiry };
  writeKeys(keys);

  res.json({ key, expiry: new Date(expiry).toISOString() });
});

// ---------- VERIFY KEY (CÓ IP LOCK) ----------
app.post('/verify-key', (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ valid: false, error: 'Thiếu key' });

  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const keys = readKeys();
  const data = keys[key];
  if (!data) return res.json({ valid: false, error: 'Key không tồn tại' });
  if (Date.now() > data.expiry) {
    delete keys[key];
    writeKeys(keys);
    return res.json({ valid: false, error: 'Key hết hạn' });
  }

  if (usedKeys[key] && usedKeys[key] !== clientIP) {
    return res.json({ valid: false, error: '⚠️ Key đang được dùng bởi thiết bị khác' });
  }

  if (!usedKeys[key]) {
    usedKeys[key] = clientIP;
  }

  res.json({ valid: true, expiry: new Date(data.expiry).toISOString() });
});

// ---------- XEM DANH SÁCH KEY (CHỈ ADMIN) ----------
app.get('/admin/keys', (req, res) => {
  const token = req.headers['admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: '❌ Chỉ admin mới được xem danh sách key' });
  }
  const keys = readKeys();
  const now = Date.now();
  const list = Object.entries(keys).map(([k, v]) => ({
    key: k,
    expiry: new Date(v.expiry).toISOString(),
    expired: now > v.expiry
  }));
  res.json(list);
});

// ---------- SERVE WEB ----------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`🔥 DEVILS RISE on port ${PORT}`));