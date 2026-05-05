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

window.onerror = function (message, source, lineno, colno, error) {
  firebase.firestore().collection("errors").add({
    message, source, lineno, colno,
    stack: error?.stack || null,
    timestamp: new Date().toISOString(),
    userId: firebase.auth().currentUser?.uid || "anonymous"
  });
};

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();

// ============================
// 🌐 СИСТЕМА ПЕРЕКЛАДІВ (i18n)
// ============================
const translations = {
  en: {
    login: "Log In",
    signup: "Sign Up",
    console: "Go to Console",
    send: "Send",
    history: "History",
    update: "Update",
    balance: "Balance:",
    settings: "Settings",
    theme: "Theme:",
    themeLight: "☀️ Light",
    themeDark: "🌙 Dark",
    language: "Language:",
    profile: "User profile",
    changeAvatar: "Click to change",
    namePlaceholder: "Name",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    verified: "Verified",
    logout: "Sign Out",
    verify: "Get verified",
    save: "Save changes",
    loginGoogle: "Log in with Google",
    signupGoogle: "Sign up with Google",
    sendMoney: "Send Money",
    cardPlaceholder: "Card number",
    amountPlaceholder: "Amount (€)",
    unavailable: "Currently unavailable",
    newCard: "New Card",
    chooseCountry: "Choose a country",
    costs: "It costs 0.50€",
    create: "Create",
    ukraine: "Ukraine",
    france: "France",
    italy: "Italy",
    usa: "USA",
    poland: "Poland",
    cyprus: "Cyprus",
    germany: "Germany",
    inDev: "In development",
    fillFields: "Fill all fields!",
    copied: "Card number copied",
    copyFail: "Failed to copy",
    loggedIn: "Logged in!",
    loggedOut: "Logged out!",
    registered: "Registered successfully!",
    profileUpdated: "Profile updated!",
    avatarUpdated: "Avatar updated!",
    avatarLoading: "Uploading avatar...",
    avatarError: "Failed to update avatar.",
    avatarSize: "Avatar must be less than 2MB",
    loginError: "Login error: ",
    logoutError: "Logout error: ",
    registerError: "Registration error: ",
    profileError: "Profile update error: ",
    googleError: "Google sign-in error: ",
    notLoggedIn: "Not logged in!",
    apiFallback: "Free/Pay API unavailable. Cache used.",
    apiFallbackNoCache: "Free/Pay API unavailable. Fallback rates shown.",
    verifyEmailSent: "Verification email sent! Check your inbox.",
    verifyEmailError: "Error sending verification: ",
    alreadyVerified: "Your email is already verified ✓",
    verifyNotLoggedIn: "Log in first to verify.",
  },
  ua: {
    login: "Увійти",
    signup: "Реєстрація",
    console: "Консоль",
    send: "Надіслати",
    history: "Історія",
    update: "Оновити",
    balance: "Баланс:",
    settings: "Налаштування",
    theme: "Тема:",
    themeLight: "☀️ Світла",
    themeDark: "🌙 Темна",
    language: "Мова:",
    profile: "Профіль користувача",
    changeAvatar: "Натисніть для зміни",
    namePlaceholder: "Ім'я",
    emailPlaceholder: "Пошта",
    passwordPlaceholder: "Пароль",
    verified: "Підтверджено",
    logout: "Вийти",
    verify: "Підтвердити пошту",
    save: "Зберегти зміни",
    loginGoogle: "Увійти через Google",
    signupGoogle: "Зареєструватись через Google",
    sendMoney: "Надіслати кошти",
    cardPlaceholder: "Номер картки",
    amountPlaceholder: "Сума (€)",
    unavailable: "Наразі недоступно",
    newCard: "Нова картка",
    chooseCountry: "Оберіть країну",
    costs: "Вартість 0.50€",
    create: "Створити",
    ukraine: "Україна",
    france: "Франція",
    italy: "Італія",
    usa: "США",
    poland: "Польща",
    cyprus: "Кіпр",
    germany: "Німеччина",
    inDev: "В процесі розробки",
    fillFields: "Заповніть всі поля!",
    copied: "Номер картки скопійовано",
    copyFail: "Не вдалося скопіювати",
    loggedIn: "Ви увійшли!",
    loggedOut: "Ви вийшли!",
    registered: "Реєстрація успішна!",
    profileUpdated: "Профіль оновлено!",
    avatarUpdated: "Аватар оновлено!",
    avatarLoading: "Завантаження аватара...",
    avatarError: "Не вдалося оновити аватар.",
    avatarSize: "Аватар має бути менше 2MB",
    loginError: "Помилка входу: ",
    logoutError: "Помилка виходу: ",
    registerError: "Помилка реєстрації: ",
    profileError: "Помилка оновлення профілю: ",
    googleError: "Помилка входу через Google: ",
    notLoggedIn: "Ви не увійшли!",
    apiFallback: "API недоступний. Використано кеш.",
    apiFallbackNoCache: "API недоступний. Показано приблизні курси.",
    verifyEmailSent: "Лист підтвердження надіслано! Перевірте пошту.",
    verifyEmailError: "Помилка надсилання: ",
    alreadyVerified: "Вашу пошту вже підтверджено ✓",
    verifyNotLoggedIn: "Спочатку увійдіть в аккаунт.",
  }
};

// Поточна мова
let currentLang = localStorage.getItem('fp_lang') || 'en';

// Застосувати переклади
function applyTranslations(lang) {
  currentLang = lang;
  localStorage.setItem('fp_lang', lang);
  document.documentElement.lang = lang;

  const t = translations[lang];

  // Текстовий контент
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.textContent = t[key];
  });

  // Placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key] !== undefined) el.placeholder = t[key];
  });

  // Options у select
  document.querySelectorAll('[data-i18n-opt]').forEach(el => {
    const key = el.getAttribute('data-i18n-opt');
    if (t[key] !== undefined) el.textContent = t[key];
  });

  // Активна кнопка мови
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
  const activeLangBtn = document.getElementById(lang === 'ua' ? 'langUA' : 'langEN');
  activeLangBtn?.classList.add('active');
}

// Публічна функція зміни мови
function setLanguage(lang) {
  applyTranslations(lang);
}
window.setLanguage = setLanguage;

// ============================
// 🎨 СИСТЕМА ТЕМИ
// ============================
function setTheme(theme) {
  const root = document.documentElement;

  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
    localStorage.setItem('fp_theme', 'light');
  } else {
    root.setAttribute('data-theme', 'dark');
    localStorage.setItem('fp_theme', 'dark');
  }

  // Активна кнопка теми
  document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(theme === 'light' ? 'themeLight' : 'themeDark');
  activeBtn?.classList.add('active');
}
window.setTheme = setTheme;

function initTheme() {
  const saved = localStorage.getItem('fp_theme') || 'dark';
  setTheme(saved);
}

// ============================
// ☁️ CLOUDINARY
// ============================
const CLOUD_NAME = "dslmbyqys";
const UPLOAD_PRESET = "freepay";

const avatarInput = document.getElementById("avatarInput");
const profileAvatar = document.getElementById("profileAvatar");
const profileAvatarContainer = document.getElementById("profileAvatarContainer");
const avatarOverlay = document.getElementById("avatarOverlay");

function loadCurrentAvatar() {
  const user = auth.currentUser;
  if (user && user.photoURL) profileAvatar.src = user.photoURL;
}

profileAvatarContainer?.addEventListener("mouseenter", () => avatarOverlay.style.opacity = 1);
profileAvatarContainer?.addEventListener("mouseleave", () => avatarOverlay.style.opacity = 0);

avatarInput?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showMessage(translations[currentLang].avatarSize, 'error');
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    showMessage(translations[currentLang].avatarLoading, "info");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST", body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Upload failed");

    const avatarUrl = data.secure_url;
    if (auth.currentUser) {
      await auth.currentUser.updateProfile({ photoURL: avatarUrl });
      await auth.currentUser.reload();
    }
    profileAvatar.src = avatarUrl;
    document.getElementById('userAvatar').src = avatarUrl;
    showMessage(translations[currentLang].avatarUpdated, "success");
  } catch (err) {
    console.error("Avatar upload error:", err);
    showMessage(translations[currentLang].avatarError, "error");
  }
});

// ============================
// 💬 TOAST ПОВІДОМЛЕННЯ
// ============================
function showMessage(text, type = 'info', timeout = 4000) {
  const container = document.getElementById('messageContainer');
  if (!container) return;
  container.style.display = 'block';

  const toast = document.createElement('div');
  toast.className = `toast-message ${type}`;
  toast.textContent = text;
  toast.addEventListener('click', () => hideToast(toast));
  container.appendChild(toast);

  setTimeout(() => hideToast(toast), timeout);

  function hideToast(el) {
    el.style.animation = 'slideOutRight 0.3s forwards';
    el.addEventListener('animationend', () => {
      el.remove();
      if (container.children.length === 0) container.style.display = 'none';
    }, { once: true });
  }
}

// ============================
// 📋 COPY КАРТКИ
// ============================
function copyCardNumber(event) {
  event.stopPropagation();
  const text = event.target.textContent;
  navigator.clipboard.writeText(text)
    .then(() => showMessage(translations[currentLang].copied + ': ' + text, 'success'))
    .catch(() => showMessage(translations[currentLang].copyFail, 'error'));
}
window.copyCardNumber = copyCardNumber;

// ============================
// 🔲 МОДАЛКИ
// ============================
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'flex';
  modal.classList.remove('hide');
  disableSettingsIfModalOpen(true);
}
window.openModal = openModal;

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

function disableSettingsIfModalOpen(isOpen) {
  const settingsBtn = document.querySelector('.open-settings');
  if (!settingsBtn) return;
  if (isOpen) {
    settingsBtn.classList.add('disabled');
  } else {
    const anyOpen = Array.from(document.querySelectorAll('.modal')).some(m => m.style.display === 'flex');
    if (!anyOpen) settingsBtn.classList.remove('disabled');
  }
}

// ============================
// 💱 КУРСИ ВАЛЮТ
// ============================
async function fetchWithRetry(url, retries = 3, delay = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function updateExchangeRates() {
  const usdEl = document.getElementById('usdRate');
  const eurEl = document.getElementById('eurRate');
  usdEl.textContent = eurEl.textContent = '...';

  try {
    const data = await fetchWithRetry('https://api.monobank.ua/bank/currency');
    const usd = data.find(d => d.currencyCodeA === 840 && d.currencyCodeB === 980);
    const eur = data.find(d => d.currencyCodeA === 978 && d.currencyCodeB === 980);
    if (!usd || !eur) throw new Error('No data');

    const usdRate = usd.rateSell.toFixed(2) + '₴';
    const eurRate = eur.rateSell.toFixed(2) + '₴';
    usdEl.textContent = usdRate;
    eurEl.textContent = eurRate;
    localStorage.setItem('usdRate', usdRate);
    localStorage.setItem('eurRate', eurRate);
  } catch {
    const cachedUsd = localStorage.getItem('usdRate');
    const cachedEur = localStorage.getItem('eurRate');
    if (cachedUsd && cachedEur) {
      usdEl.textContent = cachedUsd;
      eurEl.textContent = cachedEur;
      showMessage(translations[currentLang].apiFallback, 'info');
    } else {
      usdEl.textContent = '~38.50₴';
      eurEl.textContent = '~41.20₴';
      showMessage(translations[currentLang].apiFallbackNoCache, 'error');
    }
  }
}

// ============================
// 👤 AUTH - AVATAR/BUTTONS
// ============================
function showAuthButtons() {
  document.getElementById('authButtons').style.display = 'flex';
  document.getElementById('userAvatarContainer').style.display = 'none';
}

function showUserAvatar(user) {
  document.getElementById('authButtons').style.display = 'none';
  const container = document.getElementById('userAvatarContainer');
  container.style.display = 'flex';
  container.style.alignItems = 'center';

  const avatarImg = document.getElementById('userAvatar');
  avatarImg.src = user.photoURL || '/images/proff.png';
  avatarImg.alt = user.displayName || user.email || '';
  avatarImg.title = user.displayName || user.email || '';

  // Перевірка доступу до консолі
  db.collection("users").doc(user.uid).get().then(doc => {
    const btn = document.getElementById('goToConsoleBtn');
    if (doc.exists && doc.data().access === true) {
      btn?.classList.remove('hidden');
    } else {
      btn?.classList.add('hidden');
    }
  });

  // Показати значок верифікації
  const badge = document.getElementById('verifiedBadge');
  if (badge) {
    if (user.emailVerified) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// ============================
// 🔐 AUTH FUNCTIONS
// ============================
async function register(email, password, name) {
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const user = cred.user;
    await db.collection('users').doc(user.uid).set({
      name, email, createdAt: new Date().toISOString(), avatar: '/images/proff.png'
    });
    await user.updateProfile({ displayName: name });
    await user.reload();
    showMessage(translations[currentLang].registered, 'success');
    closeModal('registerModal');
  } catch (error) {
    showMessage(translations[currentLang].registerError + error.message, 'error');
  }
}

async function login(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    const user = auth.currentUser;
    if (user) await setUserOnlineStatus(user.uid, true);
    showMessage(translations[currentLang].loggedIn, 'success');
    closeModal('loginModal');
  } catch (error) {
    showMessage(translations[currentLang].loginError + error.message, 'error');
  }
}

async function logout() {
  try {
    const user = auth.currentUser;
    if (user) await setUserOnlineStatus(user.uid, false);
    await auth.signOut();
    showAuthButtons();
    closeModal('profileModal');
    showMessage(translations[currentLang].loggedOut, 'success');
  } catch (error) {
    showMessage(translations[currentLang].logoutError + error.message, 'error');
  }
}

function setUserOnlineStatus(uid, isOnline) {
  return db.collection('users').doc(uid).update({
    online: isOnline,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function googleSignIn() {
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      await db.collection('users').doc(user.uid).set({
        name: user.displayName, email: user.email,
        avatar: user.photoURL || '/images/proff.png',
        createdAt: new Date().toISOString()
      });
    }
    showMessage(`Welcome, ${user.displayName}!`, 'success');
    closeModal('loginModal');
    closeModal('registerModal');
  } catch (error) {
    showMessage(translations[currentLang].googleError + error.message, 'error');
  }
}
window.googleSignIn = googleSignIn;

async function updateUserProfile() {
  const user = auth.currentUser;
  if (!user) return showMessage(translations[currentLang].notLoggedIn, 'error');

  const newName = document.getElementById('profileName')?.value.trim();
  const newEmail = document.getElementById('profileEmail')?.value.trim();
  if (!newName || !newEmail) return showMessage(translations[currentLang].fillFields, 'error');

  try {
    if (newEmail !== user.email) await user.updateEmail(newEmail);
    if (newName !== user.displayName) {
      await user.updateProfile({ displayName: newName });
      await user.reload();
    }
    await db.collection('users').doc(user.uid).update({ name: newName, email: newEmail });
    showMessage(translations[currentLang].profileUpdated, 'success');
    closeModal('profileModal');
    showUserAvatar(auth.currentUser);
  } catch (error) {
    showMessage(translations[currentLang].profileError + error.message, 'error');
  }
}
window.updateUserProfile = updateUserProfile;

// ============================
// ✅ ВЕРИФІКАЦІЯ EMAIL
// ============================
async function sendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) return showMessage(translations[currentLang].verifyNotLoggedIn, 'error');
  if (user.emailVerified) return showMessage(translations[currentLang].alreadyVerified, 'info');

  try {
    await user.sendEmailVerification();
    showMessage(translations[currentLang].verifyEmailSent, 'success');
  } catch (error) {
    showMessage(translations[currentLang].verifyEmailError + error.message, 'error');
  }
}

// ============================
// 🚀 DOM READY
// ============================
document.addEventListener('DOMContentLoaded', () => {
  // Ініціалізація теми та мови
  initTheme();
  applyTranslations(currentLang);

  // Фліп картки
  document.querySelector('.card')?.addEventListener('click', function (e) {
    if (e.target.classList.contains('nam')) return;
    this.classList.toggle('flipped');
  });

  // Копіювання номера
  document.body.addEventListener('click', e => {
    if (e.target.classList.contains('nam')) copyCardNumber(e);
  });

  // Кнопки заголовка
  document.getElementById('btnlog')?.addEventListener('click', () => openModal('loginModal'));
  document.getElementById('btnsing')?.addEventListener('click', () => openModal('registerModal'));
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('userAvatar')?.addEventListener('click', () => {
    loadCurrentAvatar();
    openModal('profileModal');
  });
  document.querySelector('.open-settings')?.addEventListener('click', () => openModal('settingsModal'));
  document.getElementById('btn1')?.addEventListener('click', () => {
    openModal('sendModal');
    updateExchangeRates();
  });
  document.getElementById('btn2')?.addEventListener('click', () => openModal('historyModal'));
  document.getElementById('btn3')?.addEventListener('click', () => location.reload());
  document.querySelector('.btnnn')?.addEventListener('click', () => openModal('newCardModal'));
  document.getElementById('goToConsoleBtn')?.addEventListener('click', () => {
    window.location.href = 'console.html';
  });

  // Закриття модалок
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  // Аватар
  document.getElementById('profileAvatarContainer')?.addEventListener('click', () => {
    document.getElementById('avatarInput')?.click();
  });

  // Верифікація
  document.getElementById('verifyBtn')?.addEventListener('click', sendVerificationEmail);

  // Збереження профілю
  document.getElementById('saveProfileBtn')?.addEventListener('click', updateUserProfile);

  // Кнопки Google
  document.querySelectorAll('.google-btn').forEach(btn => {
    btn.addEventListener('click', googleSignIn);
  });

  // Реєстрація
  const registerBtn = document.querySelector('#registerModal button.modal-btn:not([id])');
  registerBtn?.addEventListener('click', () => {
    const name = document.querySelector('#registerModal input[placeholder]')?.value.trim();
    const inputs = document.querySelectorAll('#registerModal input.modal-input');
    const nameVal = inputs[0]?.value.trim();
    const emailVal = inputs[1]?.value.trim();
    const passVal = inputs[2]?.value;
    if (!nameVal || !emailVal || !passVal) return showMessage(translations[currentLang].fillFields, 'error');
    register(emailVal, passVal, nameVal);
  });

  // Логін
  const loginBtn = document.querySelector('#loginModal button.modal-btn');
  loginBtn?.addEventListener('click', () => {
    const inputs = document.querySelectorAll('#loginModal input.modal-input');
    const email = inputs[0]?.value.trim();
    const password = inputs[1]?.value;
    if (!email || !password) return showMessage(translations[currentLang].fillFields, 'error');
    login(email, password);
  });

  // Стан авторизації
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

  loadCurrentAvatar();
});

// Офлайн статус при закритті
window.addEventListener('beforeunload', async () => {
  const user = auth.currentUser;
  if (user) {
    try { await setUserOnlineStatus(user.uid, false); }
    catch (e) { console.error(e); }
  }
});
