// --- Ініціалізація Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyC-grJlXshD89_MdLFm5oosejZDGR-gtgc",
  authDomain: "freepay-app.firebaseapp.com",
  projectId: "freepay-app",
  storageBucket: "freepay-app.appspot.com",
  messagingSenderId: "812063343387",
  appId: "1:812063343387:web:83a5dd07d770cd1aca09be",
  measurementId: "G-BM44C1C2JR"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();

//-----------------------------------------------------------

auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Оновлюємо статус на "онлайн" при завантаженні консолі
    try {
      await setUserOnlineStatus(user.uid, true);
      
      // Додаємо обробник для оновлення статусу при закритті вкладки
      window.addEventListener('beforeunload', async () => {
        await setUserOnlineStatus(user.uid, false);
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }
});

// --- Cloudinary конфіг ---
const CLOUD_NAME = "dslmbyqys";
const UPLOAD_PRESET = "freepay";

// Елементи аватара
const avatarInput = document.getElementById("avatarInput");
const profileAvatar = document.getElementById("profileAvatar");
const profileAvatarContainer = document.getElementById("profileAvatarContainer");
const avatarOverlay = document.getElementById("avatarOverlay");

// Показати поточний аватар користувача
function loadCurrentAvatar() {
  const user = auth.currentUser;
  if (user && user.photoURL) {
    profileAvatar.src = user.photoURL;
  }
}

// Наведи курсор — покажи напис
profileAvatarContainer?.addEventListener("mouseenter", () => {
  avatarOverlay.style.opacity = 1;
});
profileAvatarContainer?.addEventListener("mouseleave", () => {
  avatarOverlay.style.opacity = 0;
});

// Обробник вибору файлу аватара (завантаження на Cloudinary)
avatarInput?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) { // 2MB обмеження
    showMessage('Avatar must be less than 2MB', 'error');
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    showMessage("Завантаження аватара...", "info");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Upload failed");

    const avatarUrl = data.secure_url;

    // Оновлення Firebase профілю
    if (auth.currentUser) {
      await auth.currentUser.updateProfile({
        photoURL: avatarUrl,
      });
      await auth.currentUser.reload();
    }

    // Оновлення аватара на сторінці
    profileAvatar.src = avatarUrl;

    // За бажанням: зберегти в Firestore
    // await db.collection("users").doc(auth.currentUser.uid).set({ avatar: avatarUrl }, { merge: true });

    showMessage("Аватар оновлено!", "success");
  } catch (err) {
    console.error("Avatar upload error:", err);
    showMessage("Не вдалося оновити аватар.", "error");
  }
});

// Функція показу повідомлень з анімацією (заміна alert)
function showMessage(text, type = 'info', timeout = 4000) {
  const container = document.getElementById('messageContainer');
  if (!container) return;

  container.style.display = 'block';

  const toast = document.createElement('div');
  toast.className = `toast-message ${type}`;
  toast.textContent = text;

  toast.addEventListener('click', () => {
    hideToast(toast);
  });

  container.appendChild(toast);

  setTimeout(() => {
    hideToast(toast);
  }, timeout);

  function hideToast(toastElem) {
    toastElem.style.animation = 'slideOutRight 0.3s forwards';
    toastElem.addEventListener('animationend', () => {
      toastElem.remove();
      if (container.children.length === 0) {
        container.style.display = 'none';
      }
    });
  }
}
// Відкриття модалки
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'flex';
  modal.classList.remove('hide');
  disableSettingsIfModalOpen(true);
}
window.openModal = openModal;

// Закриття модалки
function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('hide');
  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.remove('hide');
    disableSettingsIfModalOpen(false);
  }, 300);
}
window.closeModal = closeModal;

async function fetchWithRetry(url, retries = 3, delay = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e; // кинути помилку після останньої спроби
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function updateExchangeRates() {
  const usdEl = document.getElementById('usdRate');
  const eurEl = document.getElementById('eurRate');

  // Показати індикатори завантаження
  usdEl.textContent = eurEl.textContent = '...';

  try {
    const data = await fetchWithRetry('https://api.monobank.ua/bank/currency');

    const usd = data.find(d => d.currencyCodeA === 840 && d.currencyCodeB === 980);
    const eur = data.find(d => d.currencyCodeA === 978 && d.currencyCodeB === 980);

    if (!usd || !eur) throw new Error('Currency data not found');

    const usdRate = usd.rateSell.toFixed(2) + '₴';
    const eurRate = eur.rateSell.toFixed(2) + '₴';

    usdEl.textContent = usdRate;
    eurEl.textContent = eurRate;

    // Зберегти в кеш
    localStorage.setItem('usdRate', usdRate);
    localStorage.setItem('eurRate', eurRate);

  } catch (error) {
    // Якщо є кеш, показуємо його
    const cachedUsd = localStorage.getItem('usdRate');
    const cachedEur = localStorage.getItem('eurRate');

    if (cachedUsd && cachedEur) {
      usdEl.textContent = cachedUsd;
      eurEl.textContent = cachedEur;
      showMessage('Free/Pay API unavailable. Cache used.', 'info');
    } else {
      // Показати запасні значення, бо кешу немає
      usdEl.textContent = '~38.50₴';
      eurEl.textContent = '~41.20₴';
      showMessage('Free/Pay API unavailable. No data, fallback rates shown.', 'error');
    }
  }
}





// Функція для анімації оновлення
function animateRateUpdate(element) {
  element.classList.add('updated');
  setTimeout(() => element.classList.remove('updated'), 300);
}

// Блокування кнопки налаштувань при відкритті модалки
function disableSettingsIfModalOpen(isOpen) {
  const settingsBtn = document.querySelector('.open-settings');
  if (!settingsBtn) return;
  if (isOpen) {
    settingsBtn.classList.add('disabled');
  } else {
    const modals = document.querySelectorAll('.modal');
    const anyOpen = Array.from(modals).some(m => m.style.display === 'flex');
    if (!anyOpen) settingsBtn.classList.remove('disabled');
  }
}

// Показати аватар користувача
function showUserAvatar(user) {
  document.getElementById('authButtons').style.display = 'none';
  const userAvatarContainer = document.getElementById('userAvatarContainer');
  userAvatarContainer.style.display = 'flex';

  const avatarImg = document.getElementById('userAvatar');
  avatarImg.src = user.photoURL || '/images/proff.png';
  avatarImg.alt = user.displayName || user.email || '';
  avatarImg.title = user.displayName || user.email || '';

  // 🔥 Перевірка доступу до консолі
  db.collection("users").doc(user.uid).get().then(doc => {
    if (doc.exists && doc.data().access === true) {
      document.getElementById('goToConsoleBtn')?.classList.remove('hidden');
    } else {
      document.getElementById('goToConsoleBtn')?.classList.add('hidden');
    }
  });
}


// Реєстрація
async function register(email, password, name) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await db.collection('users').doc(user.uid).set({
      name,
      email,
      createdAt: new Date().toISOString(),
      avatar: '/images/proff.png'
    });

    await user.updateProfile({ displayName: name });
    await user.reload();

    showMessage('Registered successfully!', 'success');
    closeModal('registerModal');
  } catch (error) {
    showMessage('Registration error: ' + error.message, 'error');
  }
}

// Логін
async function login(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    const user = auth.currentUser;
    if (user) {
      await setUserOnlineStatus(user.uid, true);
    }
    showMessage('Logged in!', 'success');
    closeModal('loginModal');
  } catch (error) {
    showMessage('Login error: ' + error.message, 'error');
  }
}


function setUserOnlineStatus(uid, isOnline) {
  return db.collection('users').doc(uid).update({
    online: isOnline,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  });
}


// Вихід
async function logout() {
  try {
    const user = auth.currentUser;
    if (user) {
      await setUserOnlineStatus(user.uid, false);
    }
    await auth.signOut();
    showAuthButtons();
    closeModal('profileModal');
    showMessage('Logged out!', 'success');
  } catch (error) {
    showMessage('Logout error: ' + error.message, 'error');
  }
}
window.logout = logout;


// Google-вхід
async function googleSignIn() {
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      await db.collection('users').doc(user.uid).set({
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL || '/images/proff.png',
        createdAt: new Date().toISOString()
      });
    }

    showMessage(`Welcome, ${user.displayName}!`, 'success');
    closeModal('loginModal');
  } catch (error) {
    showMessage('Google sign-in error: ' + error.message, 'error');
  }
}
window.googleSignIn = googleSignIn;

// Оновлення профілю (ім'я, email)
async function updateUserProfile() {
  const user = auth.currentUser;
  if (!user) return showMessage('Not logged in!', 'error');

  const newName = document.getElementById('profileName')?.value.trim();
  const newEmail = document.getElementById('profileEmail')?.value.trim();

  if (!newName || !newEmail) return showMessage('Fill all fields!', 'error');

  try {
    if (newEmail !== user.email) {
      await user.updateEmail(newEmail);
    }
    if (newName !== user.displayName) {
      await user.updateProfile({ displayName: newName });
      await user.reload();
    }

    await db.collection('users').doc(user.uid).update({
      name: newName,
      email: newEmail
    });

    showMessage('Profile updated!', 'success');
    closeModal('profileModal');
    showUserAvatar(auth.currentUser);
  } catch (error) {
    showMessage('Profile update error: ' + error.message, 'error');
  }
}
window.updateUserProfile = updateUserProfile;

// Тема
function setTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.style.setProperty('--bg-color', '#f5f5f5');
    root.style.setProperty('--text-color', '#111');
    root.style.setProperty('--card-color', '#fff');
    root.style.setProperty('--btn-color', '#ddd');
    root.style.setProperty('--btn-hover-color', '#bbb');
    showMessage('In the process of development', 'info');
  } else {
    root.style.setProperty('--bg-color', '#2c283b');
    root.style.setProperty('--text-color', 'rgb(255,248,239)');
    root.style.setProperty('--card-color', '#1e1736');
    root.style.setProperty('--btn-color', '#3f3564');
    root.style.setProperty('--btn-hover-color', 'rgb(76,58,110)');
    showMessage('In the process of development', 'info');
  }
}
window.setTheme = setTheme;

// Мова (проста реалізація)
function setLanguage(lang) {
  //showMessage('Language set to: ' + lang, 'info');
  showMessage('In the process of development', 'info');
}
window.setLanguage = setLanguage;

// DOM завантажено
document.addEventListener('DOMContentLoaded', () => {
  // Клік по карті (фліп)
  document.querySelector('.card')?.addEventListener('click', function (e) {
    if (e.target.classList.contains('nam')) return;
    this.classList.toggle('flipped');
  });



  // Відкриття модалок
  document.getElementById('btnlog')?.addEventListener('click', () => openModal('loginModal'));
  document.getElementById('btnsing')?.addEventListener('click', () => openModal('registerModal'));
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('userAvatar')?.addEventListener('click', () => openModal('profileModal'));
  document.querySelector('.open-settings')?.addEventListener('click', () => openModal('settingsModal'));
  document.getElementById('goToConsoleBtn')?.addEventListener('click', () => {
    window.location.href = 'console.html';
  });

document.getElementById('btnReturnFace')?.addEventListener('click', () => {
  // Повертаємося на головну сторінку, або іншу логіку
  window.location.href = 'index.html';  // або де у тебе "face"
});

  // Закриття модалок
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  // Клік по аватару в профілі — відкриття вибору файлу
  document.getElementById('profileAvatarContainer')?.addEventListener('click', () => {
    document.getElementById('avatarInput')?.click();
  });

  // Показ/приховування пароля
  const togglePwdBtn = document.getElementById('togglePasswordBtn');
  if (togglePwdBtn) {
    togglePwdBtn.addEventListener('click', () => {
      const pwdInput = document.getElementById('profilePassword');
      if (!pwdInput) return;
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        togglePwdBtn.textContent = 'Hide';
      } else {
        pwdInput.type = 'password';
        togglePwdBtn.textContent = 'Show';
      }
    });
  }

  // Стан аутентифікації
  auth.onAuthStateChanged(user => {
    if (user) {
      showUserAvatar(user);
      document.getElementById('profileName').value = user.displayName || '';
      document.getElementById('profileEmail').value = user.email || '';
      document.getElementById('profileAvatar').src = user.photoURL || '/images/proff.png';
      document.getElementById('userAvatar').src = user.photoURL || '/images/proff.png';
    } else {
      showAuthButtons();
    }
  });

  // Реєстрація
  const registerBtn = document.querySelector('#registerModal button.modal-btn:not([id])');
  registerBtn?.addEventListener('click', () => {
    const name = document.querySelector('#registerModal input[placeholder="Name"]')?.value.trim();
    const email = document.querySelector('#registerModal input[placeholder="Email"]')?.value.trim();
    const password = document.querySelector('#registerModal input[placeholder="Password"]')?.value;
    if (!name || !email || !password) return showMessage('Fill all fields!', 'error');
    register(email, password, name);
  });

  // Логін
  const loginBtn = document.querySelector('#loginModal button.modal-btn');
  loginBtn?.addEventListener('click', () => {
    const email = document.querySelector('#loginModal input[placeholder="Email"]')?.value.trim();
    const password = document.querySelector('#loginModal input[placeholder="Password"]')?.value;
    if (!email || !password) return showMessage('Fill all fields!', 'error');
    login(email, password);
  });

  // Збереження профілю
  document.getElementById('saveProfileBtn')?.addEventListener('click', updateUserProfile);

  // Кнопки Google входу
  document.querySelectorAll('.google-btn').forEach(btn => {
    btn.addEventListener('click', googleSignIn);
  });

  // Завантаження поточного аватара при старті
  loadCurrentAvatar();
}); 
const pokazDiv = document.querySelector('.pokaz');
const tabButtons = document.querySelectorAll('.menu .btn');

// Збережемо HTML контент для кожної вкладки в окремих функціях
// Збережемо HTML контент для кожної вкладки в окремих функціях
function renderConsoleTab() {
  return `
    <div class="console-area">
      <div id="commandLog" class="command-log"></div>
      <input type="text" id="commandInput" placeholder="Enter command..." autocomplete="off" />
      <button id="runCommandBtn">Run</button>
    </div>
  `;
}

function renderUsersTab() {
  return `
    <div class="users-list">
      <h3>All users:</h3>
      <ul id="usersList"></ul>
    </div>
    <div id="userDetails" style="display:none; margin-top: 20px;">
      <h4>User information:</h4>
      <p><b>Nickname:</b> <span id="detailName"></span></p>
      <p><b>Email:</b> <span id="detailEmail"></span></p>
      <p><b>Google Sign-In:</b> <span id="detailGoogle"></span></p>
      <p><b>Console access:</b> <span id="detailAccess"></span></p>
      <p><b>Verified:</b> <span id="detailVerified"></span></p>  <!-- Додано -->
      <p><b>Card Number:</b> <span id="detailCard"></span></p> <!-- Додано -->
      <button id="toggleAccessBtn"></button>
      <button id="showHistoryBtn">Show History</button>
      <div id="userHistory" style="display:none; margin-top: 10px;"></div>
    </div>
  `;
}



function renderMagazineTab() {
  return `<p>Magazine content will be here (empty for now)</p>`;
}

function renderCustomerAssistanceTab() {
  return `<p>Customer Assistance will be here (empty for now)</p>`;
}

// Головна функція для рендеру вкладки
function renderTab(tabName) {
  switch (tabName.toLowerCase()) {
    case 'console':
      pokazDiv.innerHTML = renderConsoleTab();
      initConsoleTab();
      break;
    case 'users':
      pokazDiv.innerHTML = renderUsersTab();
      initUsersTab();
      break;
    case 'magazine':
      pokazDiv.innerHTML = renderMagazineTab();
      break;
    case 'customer assistance':
      pokazDiv.innerHTML = renderCustomerAssistanceTab();
      break;
    default:
      pokazDiv.innerHTML = `<p>Please select a tab</p>`;
  }
}

// Ініціалізація логіки для вкладки Console
function initConsoleTab() {
  const commandLog = document.getElementById('commandLog');
  const commandInput = document.getElementById('commandInput');
  const runCommandBtn = document.getElementById('runCommandBtn');

  commandInput.classList.add('input-class');   // Назви клас як хочеш
  runCommandBtn.classList.add('btn-class');

  function addToLog(message, type = 'info') {
    const div = document.createElement('div');
    div.textContent = message;
    div.style.color = type === 'error' ? 'red' : 'lightgreen';
    commandLog.appendChild(div);
    commandLog.scrollTop = commandLog.scrollHeight;
  }

  async function executeCommand(command) {
    if (!command.trim()) return;
    addToLog(`> ${command}`, 'info');

    const [cmd, ...rest] = command.trim().split(' ');

    // Перевірка, чи користувач увійшов і чи має доступ
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      addToLog('Please log in first!', 'error');
      return;
    }

    try {
      const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
      const isAdmin = currentUserDoc.exists && currentUserDoc.data().access === true;

      switch (cmd.toLowerCase()) {
  case '/help': {
    addToLog('Команди: /help, /ban [email], /unban [email], /grant [email], /revoke [email], /balance [email], /setbalance [email] [сума], /addbalance [email] [сума], /transactions [email], /cleartransactions [email], /logins [email], /set2fa [email] true|false, /reload, /version');
    break;
  }

  case '/ban':
  case '/unban': {
    if (!isAdmin) {
      addToLog('Insufficient rights for this command.', 'error');
      break;
    }

    const emailBan = rest[0];
    if (!emailBan) {
      addToLog('Please specify an email', 'error');
      break;
    }

    const snapBan = await db.collection("users").where("email", "==", emailBan).get();
    if (snapBan.empty) {
      addToLog('User not found', 'error');
      break;
    }

    const userDocBan = snapBan.docs[0];
    await userDocBan.ref.update({ banned: cmd === '/ban' });
    addToLog(`User ${emailBan} has been ${cmd === '/ban' ? 'banned' : 'unbanned'}`);
    break;
  }

  case '/grant':
  case '/revoke': {
    if (!isAdmin) {
      addToLog('Insufficient rights for this command.', 'error');
      break;
    }

    const emailAccess = rest[0];
    if (!emailAccess) {
      addToLog('Please specify an email', 'error');
      break;
    }

    const snapAccess = await db.collection("users").where("email", "==", emailAccess).get();
    if (snapAccess.empty) {
      addToLog('User not found', 'error');
      break;
    }

    const userDocAccess = snapAccess.docs[0];
    await userDocAccess.ref.update({ access: cmd === '/grant' });
    addToLog(`User ${emailAccess} has been ${cmd === '/grant' ? 'granted' : 'revoked'} console access.`);
    break;
  }

  case '/balance': {
    if (!isAdmin) {
      addToLog('Insufficient rights.', 'error');
      break;
    }

    const email = rest[0];
    if (!email) {
      addToLog('Please specify an email', 'error');
      break;
    }

    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) {
      addToLog('User not found', 'error');
      break;
    }

    const userDoc = snap.docs[0];
    const data = userDoc.data();
    addToLog(`Balance of ${email}: $${data.balance ?? 0}`);
    break;
  }

  case '/setbalance':
  case '/addbalance': {
    if (!isAdmin) {
      addToLog('Insufficient rights.', 'error');
      break;
    }

    const email = rest[0];
    const amount = parseFloat(rest[1]);

    if (!email || isNaN(amount)) {
      addToLog('Usage: /setbalance [email] [amount]', 'error');
      break;
    }

    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) {
      addToLog('User not found', 'error');
      break;
    }

    const userDoc = snap.docs[0];
    const currentBalance = userDoc.data().balance ?? 0;

    if (cmd === '/setbalance') {
      await userDoc.ref.update({ balance: amount });
      addToLog(`Balance of ${email} set to $${amount}`);
    } else {
      const newBalance = currentBalance + amount;
      await userDoc.ref.update({ balance: newBalance });
      addToLog(`Added $${amount} to ${email}. New balance: $${newBalance}`);
    }

    break;
  }

  case '/transactions': {
    const email = rest[0];
    if (!isAdmin || !email) {
      addToLog('Usage: /transactions [email]', 'error');
      break;
    }

    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) {
      addToLog('User not found', 'error');
      break;
    }

    const userDoc = snap.docs[0];
    const data = userDoc.data();
    const txs = data.transactions ?? [];
    if (txs.length === 0) {
      addToLog('No transactions found.');
    } else {
      addToLog(`Transactions for ${email}:\n` + txs.map((t, i) => `${i + 1}. ${t}`).join('\n'));
    }

    break;
  }

  case '/cleartransactions': {
    const email = rest[0];
    if (!isAdmin || !email) {
      addToLog('Usage: /cleartransactions [email]', 'error');
      break;
    }

    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) {
      addToLog('User not found', 'error');
      break;
    }

    const userDoc = snap.docs[0];
    await userDoc.ref.update({ transactions: [] });
    addToLog(`Cleared all transactions for ${email}`);
    break;
  }

  case '/logins': {
    const email = rest[0];
    if (!isAdmin || !email) {
      addToLog('Usage: /logins [email]', 'error');
      break;
    }

    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) {
      addToLog('User not found', 'error');
      break;
    }

    const logins = snap.docs[0].data().logins ?? [];
    addToLog(`Login history for ${email}:\n` + logins.map((l, i) => `${i + 1}. ${l}`).join('\n'));
    break;
  }

  case '/set2fa': {
    if (!isAdmin) {
      addToLog('Insufficient rights.', 'error');
      break;
    }

    const email = rest[0];
    const value = rest[1] === 'true';

    if (!email || (rest[1] !== 'true' && rest[1] !== 'false')) {
      addToLog('Usage: /set2fa [email] true|false', 'error');
      break;
    }

    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) {
      addToLog('User not found', 'error');
      break;
    }

    await snap.docs[0].ref.update({ twoFA: value });
    addToLog(`2FA for ${email} has been ${value ? 'enabled' : 'disabled'}.`);
    break;
  }

  case '/reload': {
    location.reload();
    break;
  }

  case '/version': {
    addToLog('Free/Pay Console v1.0.0');
    break;
  }

  default:
    try {
      const result = eval(command);
      addToLog(String(result));
    } catch (error) {
      addToLog(error.message, 'error');
    }
}

    } catch (err) {
      addToLog('Error executing command: ' + err.message, 'error');
    }
  

  runCommandBtn.addEventListener('click', () => {
    executeCommand(commandInput.value);
    commandInput.value = '';
  });

  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCommandBtn.click();
    }
  });
}

// Ініціалізація логіки для вкладки Users
async function initUsersTab() {
  // Оновлюємо статус поточного користувача на "онлайн"
  const currentUser = auth.currentUser;
  if (currentUser) {
    await setUserOnlineStatus(currentUser.uid, true);
  }
  const usersList = document.getElementById('usersList');
  const userDetailsDiv = document.getElementById('userDetails');
  const detailName = document.getElementById('detailName');
  const detailEmail = document.getElementById('detailEmail');
  const detailGoogle = document.getElementById('detailGoogle');
  const detailAccess = document.getElementById('detailAccess');
  const detailVerified = document.getElementById('detailVerified');
  const detailCard = document.getElementById('detailCard');

  const toggleAccessBtn = document.getElementById('toggleAccessBtn');
  const showHistoryBtn = document.getElementById('showHistoryBtn');
  const userHistoryDiv = document.getElementById('userHistory');

  toggleAccessBtn.classList.add('btn', 'btn-primary');
  showHistoryBtn.classList.add('btn', 'btn-secondary');

  let selectedUser = null;
  let unsubscribeUsers = null;

  async function loadAllUsers() {
    try {
      const currentUser = auth.currentUser;
      usersList.innerHTML = '';
      
      if (unsubscribeUsers) unsubscribeUsers();
      
      unsubscribeUsers = db.collection('users').orderBy('name').onSnapshot(snapshot => {
        usersList.innerHTML = '';
        snapshot.forEach(doc => {
          const userData = doc.data();
          const li = document.createElement('li');
          li.textContent = userData.name || userData.email || 'No name';
          li.dataset.uid = doc.id;
          li.classList.add('user-list-item');

          if (currentUser && doc.id === currentUser.uid) {
            li.classList.add('current-user');
            li.title = 'This is you';
          }

          const statusSpan = document.createElement('span');
          statusSpan.style.marginLeft = '10px';
          statusSpan.style.display = 'inline-flex';
          statusSpan.style.alignItems = 'center';
          statusSpan.style.gap = '5px';
          
          const statusIcon = document.createElement('span');
          statusIcon.style.width = '10px';
          statusIcon.style.height = '10px';
          statusIcon.style.borderRadius = '50%';
          statusIcon.style.backgroundColor = userData.online ? 'limegreen' : 'gray';
          statusIcon.style.display = 'inline-block';
          
          const statusText = document.createElement('span');
          statusText.textContent = userData.online ? 'Online' : 'Offline';
          statusText.style.fontWeight = 'normal';
          
          statusSpan.appendChild(statusIcon);
          statusSpan.appendChild(statusText);
          li.appendChild(statusSpan);
          
          if (!userData.online && userData.lastSeen) {
            const lastSeenSpan = document.createElement('span');
            lastSeenSpan.style.marginLeft = '10px';
            lastSeenSpan.style.fontSize = '0.8em';
            lastSeenSpan.style.color = '#aaa';
            
            const lastSeenDate = userData.lastSeen.toDate();
            const now = new Date();
            const diffMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
            
            if (diffMinutes < 60) {
              lastSeenSpan.textContent = `${diffMinutes} min ago`;
            } else if (diffMinutes < 24 * 60) {
              const hours = Math.floor(diffMinutes / 60);
              lastSeenSpan.textContent = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            } else {
              lastSeenSpan.textContent = lastSeenDate.toLocaleDateString();
            }
            
            li.appendChild(lastSeenSpan);
          }
          
          usersList.appendChild(li);
        });
      });
    } catch (error) {
      console.error('Error loading users:', error);
      usersList.innerHTML = '<li>Failed to load users</li>';
    }
  }

  async function showUserDetails(uid) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      if (!doc.exists) return;

      const data = doc.data();
      selectedUser = { uid, ...data };

      detailName.textContent = data.name || '---';
      detailEmail.textContent = data.email || '---';
      detailGoogle.textContent = data.googleSignIn ? 'Yes' : 'No';
      detailAccess.textContent = data.access ? 'Access granted' : 'No access';
      detailVerified.textContent = data.verified !== undefined ? (data.verified ? 'Verified' : 'Not verified') : 'none';
      detailCard.textContent = data.cardNumber || 'none';

      const onlineStatus = document.createElement('span');
      onlineStatus.textContent = data.online ? '● Online' : '● Offline';
      onlineStatus.style.color = data.online ? 'limegreen' : 'gray';
      onlineStatus.style.marginLeft = '5px';
      
      if (!data.online && data.lastSeen) {
        const lastSeenDate = data.lastSeen.toDate();
        const lastSeenText = document.createElement('span');
        lastSeenText.textContent = ` (Last seen: ${lastSeenDate.toLocaleString()})`;
        lastSeenText.style.color = '#aaa';
        lastSeenText.style.fontSize = '0.9em';
        onlineStatus.appendChild(lastSeenText);
      }
      
      detailAccess.appendChild(onlineStatus);

      toggleAccessBtn.textContent = data.access ? 'Revoke Access' : 'Grant Access';
      userDetailsDiv.style.display = 'block';
      userHistoryDiv.style.display = 'none';
      userHistoryDiv.innerHTML = 'History is currently unavailable...';

    } catch (error) {
      console.error('Error showing user details:', error);
    }
  }

  usersList.addEventListener('click', e => {
    if (e.target.tagName === 'LI') {
      const uid = e.target.dataset.uid;
      if (uid) showUserDetails(uid);
    }
  });

  toggleAccessBtn.addEventListener('click', async () => {
    if (!selectedUser) return;

    const newAccess = !selectedUser.access;
    try {
      await db.collection('users').doc(selectedUser.uid).update({ access: newAccess });
      selectedUser.access = newAccess;
      detailAccess.textContent = newAccess ? 'Access granted' : 'No access';
      toggleAccessBtn.textContent = newAccess ? 'Revoke Access' : 'Grant Access';
    } catch (error) {
      console.error('Error updating access:', error);
    }
  });

  showHistoryBtn.addEventListener('click', async () => {
    if (!selectedUser) return;

    userHistoryDiv.style.display = userHistoryDiv.style.display === 'block' ? 'none' : 'block';

    const historySnapshot = await db.collection('users').doc(selectedUser.uid).collection('history').orderBy('date', 'desc').get();
    if (historySnapshot.empty) {
      userHistoryDiv.innerHTML = 'History is empty';
    } else {
      userHistoryDiv.innerHTML = '';
      historySnapshot.forEach(doc => {
        const h = doc.data();
        const p = document.createElement('p');
        p.textContent = `${h.date.toDate().toLocaleString()}: ${h.action}`;
        userHistoryDiv.appendChild(p);
      });
    }
  });

  await loadAllUsers();
  
  window.addEventListener('beforeunload', () => {
    if (unsubscribeUsers) unsubscribeUsers();
  });
}

// Обробник кліку по кнопках меню
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    renderTab(btn.textContent);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  renderTab('Console');

  const tabButtons = document.querySelectorAll('.menu .btn');
  const pokazDiv = document.querySelector('.pokaz');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      renderTab(btn.textContent);
    });
  });
});

// Ініціалізація логіки для вкладки Console
function initConsoleTab() {
  const commandLog = document.getElementById('commandLog');
  const commandInput = document.getElementById('commandInput');
  const runCommandBtn = document.getElementById('runCommandBtn');

  commandInput.classList.add('input-class');
  runCommandBtn.classList.add('btn-class');

  function addToLog(message, type = 'info') {
    const div = document.createElement('div');
    div.textContent = message;
    div.style.color = type === 'error' ? 'red' : 'lightgreen';
    commandLog.appendChild(div);
    commandLog.scrollTop = commandLog.scrollHeight;
  }

  async function executeCommand(command) {
    if (!command.trim()) return;
    addToLog(`> ${command}`, 'info');

    const [cmd, ...rest] = command.trim().split(' ');

    const currentUser = auth.currentUser;
    if (!currentUser) {
      addToLog('Log in first!', 'error');
      return;
    }

    try {
      const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
      const isAdmin = currentUserDoc.exists && currentUserDoc.data().access === true;

    мtry {
            const result = eval(command);
            addToLog(String(result));
          } catch (error) {
            addToLog(error.message, 'error');
          }
      }
    } catch (err) {
      addToLog('Error executing command: ' + err.message, 'error');
    }
  }

  runCommandBtn.addEventListener('click', () => {
    executeCommand(commandInput.value);
    commandInput.value = '';
  });

  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCommandBtn.click();
    }
  });
}


