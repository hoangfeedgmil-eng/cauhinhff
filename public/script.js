let activeKey = null;

// ===== HÀM LƯU KEY VÀO LOCALSTORAGE =====
function saveKey(key) {
  if (key) {
    localStorage.setItem('ff_key', key);
  } else {
    localStorage.removeItem('ff_key');
  }
}

// ===== HÀM KIỂM TRA KEY TỪ LOCALSTORAGE KHI LOAD TRANG =====
async function checkSavedKey() {
  const savedKey = localStorage.getItem('ff_key');
  if (!savedKey) return;

  try {
    const res = await fetch('/verify-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: savedKey })
    });
    const data = await res.json();

    if (data.valid) {
      activeKey = savedKey;
      document.getElementById('keyInput').value = savedKey;
      document.getElementById('status').innerHTML = `✅ Key hợp lệ - hết hạn: ${new Date(data.expiry).toLocaleString()}`;
      document.getElementById('status').style.color = '#0f0';
      // Nếu key còn hạn, tự động kích hoạt các chức năng đã chọn? Có thể để người dùng tự bấm "Áp dụng"
    } else {
      // Key không hợp lệ hoặc hết hạn => xóa khỏi localStorage
      saveKey(null);
      document.getElementById('status').innerHTML = `❌ ${data.error || 'Key đã hết hạn, vui lòng nhập key mới'}`;
      document.getElementById('status').style.color = '#f00';
    }
  } catch (err) {
    console.error('Lỗi kiểm tra key:', err);
  }
}

// ===== XÁC THỰC KEY (KHI BẤM NÚT KÍCH HOẠT) =====
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
      saveKey(key); // 👈 LƯU KEY VÀO LOCALSTORAGE
      status.innerHTML = `✅ Key hợp lệ - hết hạn: ${new Date(data.expiry).toLocaleString()}`;
      status.style.color = '#0f0';
    } else {
      activeKey = null;
      saveKey(null);
      status.innerHTML = `❌ ${data.error}`;
      status.style.color = '#f00';
    }
  } catch (err) {
    document.getElementById('status').innerHTML = `⚠️ Lỗi: ${err.message}`;
    document.getElementById('status').style.color = '#f80';
  }
});

// ===== CHỌN TẤT CẢ =====
document.getElementById('selectAllBtn').addEventListener('click', () => {
  document.querySelectorAll('.feature').forEach(cb => cb.checked = true);
});

// ===== ÁP DỤNG =====
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

// ===== KIỂM TRA MẬT KHẨU (GET KEY) =====
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

// ===== TẠO KEY =====
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
    // Tự động điền key vào ô nhập và lưu
    document.getElementById('keyInput').value = data.key;
    // Gọi luôn verify để kích hoạt key vừa tạo
    document.getElementById('verifyBtn').click();
  } catch (err) {
    resultEl.innerHTML = `❌ Lỗi: ${err.message}`;
    resultEl.style.color = '#f00';
  }
});

// ===== KHI TRANG LOAD, KIỂM TRA KEY ĐÃ LƯU =====
window.addEventListener('DOMContentLoaded', checkSavedKey);