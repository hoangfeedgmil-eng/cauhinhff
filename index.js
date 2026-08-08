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
  if (!fs.existsSync(KEYS_FILE)) return {};
  return JSON.parse(fs.readFileSync(KEYS_FILE));
}

function writeKeys(data) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(data, null, 2));
}

app.post('/generate-key', (req, res) => {
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

app.post('/verify-key', (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ valid: false, error: 'Thiếu key' });

  const keys = readKeys();
  const data = keys[key];
  if (!data) return res.json({ valid: false, error: 'Key không tồn tại' });
  if (Date.now() > data.expiry) {
    delete keys[key];
    writeKeys(keys);
    return res.json({ valid: false, error: 'Key hết hạn' });
  }
  res.json({ valid: true, expiry: new Date(data.expiry).toISOString() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🔥 DEVILS RISE on port ${PORT}`));