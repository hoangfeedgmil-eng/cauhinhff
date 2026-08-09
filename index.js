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

function readKeys() {
  try {
    if (!fs.existsSync(KEYS_FILE)) return {};
    return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  } catch (e) {
    console.error('Lỗi đọc keys.json:', e.message);
    return {};
  }
}

function writeKeys(data) {
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('Lỗi ghi keys.json:', e.message);
    return false;
  }
}

// ---------- GEN KEY ----------
app.post('/generate-key', (req, res) => {
  try {
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
    keys[key] = { 
      expiry: expiry,
      used: false,      // 👈 Đánh dấu key chưa được sử dụng
      usedBy: null      // 👈 Lưu IP người dùng (nếu cần)
    };
    if (!writeKeys(keys)) {
      return res.status(500).json({ error: 'Không thể lưu key' });
    }

    res.json({ key, expiry: new Date(expiry).toISOString() });
  } catch (e) {
    console.error('Lỗi gen key:', e.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ---------- VERIFY KEY (CHỈ DÙNG 1 LẦN) ----------
app.post('/verify-key', (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ valid: false, error: 'Thiếu key' });

    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    const keys = readKeys();
    const data = keys[key];
    if (!data) return res.json({ valid: false, error: 'Key không tồn tại' });

    // Kiểm tra key đã được sử dụng chưa
    if (data.used) {
      return res.json({ valid: false, error: '❌ Key đã được sử dụng bởi thiết bị khác' });
    }

    // Kiểm tra hết hạn
    if (Date.now() > data.expiry) {
      delete keys[key];
      writeKeys(keys);
      return res.json({ valid: false, error: 'Key đã hết hạn' });
    }

    // Đánh dấu key đã được sử dụng
    data.used = true;
    data.usedBy = clientIP;
    writeKeys(keys);

    res.json({ valid: true, expiry: new Date(data.expiry).toISOString() });
  } catch (e) {
    console.error('Lỗi verify key:', e.message);
    res.status(500).json({ valid: false, error: 'Lỗi server' });
  }
});

// ---------- SERVE WEB ----------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`🔥 DEVILS RISE on port ${PORT}`));