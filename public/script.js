let activeKey = null;
let expiryTime = null;
let countdownInterval = null;

// ===== HIỂN THỊ THỜI GIAN CÒN LẠI =====
function updateCountdown() {
  const statusEl = document.getElementById('status');
  if (!expiryTime) {
    if (statusEl.innerHTML.includes('✅')) {
      statusEl.innerHTML = '✅ Key đã kích hoạt (không rõ thời gian còn lại)';
    }
    return;
  }
  const now = Date.now();
  const diff = expiryTime - now;
  if (diff <= 0) {
    clearInterval(countdownInterval);
    statusEl.innerHTML = '⏰ Key đã hết hạn, vui lòng nhập key mới';
    statusEl.style.color = '#ff0';
    activeKey = null;
    localStorage.removeItem('ff_key');
    localStorage.removeItem('ff_expiry');
    return;
  }
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  statusEl.innerHTML = `✅ Key hợp lệ - còn ${hours}h ${minutes}m ${seconds}s`;
  statusEl.style.color = '#0f0';
}

// ===== LƯU KEY VÀO LOCALSTORAGE =====
function saveKey(key, expiry) {
  if (key) {
    localStorage.setItem('ff_key', key);
    localStorage.setItem('ff_expiry', expiry);
  } else {
    localStorage.removeItem('ff_key');
    localStorage.removeItem('ff_expiry');
  }
}

// ===== KIỂM TRA KEY TỪ LOCALSTORAGE KHI LOAD TRANG =====
async function checkSavedKey() {
  const savedKey = localStorage.getItem('ff_key');
  const savedExpiry = localStorage.getItem('ff_expiry');
  if (!savedKey) return;

  expiryTime = parseInt(savedExpiry);
  if (Date.now() > expiryTime) {
    saveKey(null, null);
    document.getElementById('status').innerHTML = '⏰ Key đã hết hạn, vui lòng nhập key mới';
    document.getElementById('status').style.color = '#ff0';
    return;
  }

  try {
    const res = await fetch('/verify-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: savedKey })
    });
    const data = await res.json();

    if (data.valid) {
      activeKey = savedKey;
      expiryTime = new Date(data.expiry).getTime();
      document.getElementById('keyInput').value = savedKey;
      updateCountdown();
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(updateCountdown, 1000);
    } else {
      saveKey(null, null);
      document.getElementById('status').innerHTML = `❌ ${data.error || 'Key không hợp lệ'}`;
      document.getElementById('status').style.color = '#f00';
    }
  } catch (err) {
    console.error('Lỗi kiểm tra key:', err);
  }
}

// ===== XÁC THỰC KEY =====
document.getElementById('verifyBtn').addEventListener('click', async () => {
  const key = document.getElementById('keyInput').value.trim();
  if (!key) {
    document.getElementById('status').innerHTML = '⚠️ Nhập key đi ku';
    document.getElementById('status').style.color = '#ff0';
    return;
  }

  try {
    const res = await fetch('/verify-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    const data = await res.json();
    const status = document.getElementById('status');

    if (data.valid) {
      activeKey = key;
      expiryTime = new Date(data.expiry).getTime();
      saveKey(key, expiryTime);
      status.innerHTML = `✅ Key hợp lệ - hết hạn: ${new Date(data.expiry).toLocaleString()}`;
      status.style.color = '#0f0';
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(updateCountdown, 1000);
      updateCountdown();
    } else {
      activeKey = null;
      saveKey(null, null);
      status.innerHTML = `❌ ${data.error}`;
      status.style.color = '#f00';
    }
  } catch (err) {
    document.getElementById('status').innerHTML = `⚠️ Lỗi: ${err.message}`;
    document.getElementById('status').style.color = '#f80';
  }
});

// ===== CÁC HÀM KHÁC GIỮ NGUYÊN =====
document.getElementById('selectAllBtn').addEventListener('click', () => {
  document.querySelectorAll('.feature').forEach(cb => cb.checked = true);
});

document.getElementById('applyBtn').addEventListener('click', () => {
  if (!activeKey) {
    document.getElementById('result').innerHTML = '<p style="color:#f00;">❌ Mày chưa kích hoạt key!</p>';
    return;
  }
  const selected = [];
  document.querySelectorAll('.feature:checked').forEach(cb => selected.push(cb.value));
  if (selected.length === 0) {
    document.getElementById('result').innerHTML = '<p style="color:#ff0;">⚠️ Chọn ít nhất 1 chức năng</p>';
    return;
  }
  document.getElementById('result').innerHTML = `
    <p style="color:#0ff;">🔥 Đang áp dụng cho key: <strong>${activeKey}</strong></p>
    <p style="color:#0ff;">⚡ Chức năng: <strong>${selected.join(', ')}</strong></p>
    <p style="color: #ff0; font-size:20px;">💀 DEVILS WILL RISE - Thành công!</p>
  `;
});

document.getElementById('checkPassBtn').addEventListener('click', () => {
  const pass = document.getElementById('passInput').value.trim();
  const resultEl = document.getElementById('passResult');
  const genSection = document.getElementById('genKeySection');

  if (pass === 'cauhinhbyhoangba') {
    genSection.style.display = 'block';
    resultEl.innerHTML = '✅ Mật khẩu đúng! Bạn có thể tạo key bên dưới.';
    resultEl.style.color = '#0f0';
    document.getElementById('passInput').value = '';
  } else {
    genSection.style.display = 'none';
    resultEl.innerHTML = '❌ sai r cu , mua key ib hoang';
    resultEl.style.color = '#f00';
  }
});

document.getElementById('genKeyBtn').addEventListener('click', async () => {
  const duration = document.getElementById('durationSelect').value;
  const resultEl = document.getElementById('newKeyDisplay');

  try {
    const res = await fetch('/generate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi tạo key');
    resultEl.innerHTML = `✅ Key mới: <strong style="color:#0ff;">${data.key}</strong> (hết hạn: ${new Date(data.expiry).toLocaleString()})`;
    resultEl.style.color = '#0f0';
    document.getElementById('keyInput').value = data.key;
    document.getElementById('verifyBtn').click();
  } catch (err) {
    resultEl.innerHTML = `❌ Lỗi: ${err.message}`;
    resultEl.style.color = '#f00';
  }
});

window.addEventListener('DOMContentLoaded', checkSavedKey);