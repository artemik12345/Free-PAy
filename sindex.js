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

// Копіювання номера картки
function copyCardNumber(event) {
  event.stopPropagation();
  const text = event.target.textContent;
  navigator.clipboard.writeText(text)
    .then(() => showMessage("Card number copied: " + text, 'success'))
    .catch(() => showMessage("Failed to copy", 'error'));
}
window.copyCardNumber = copyCardNumber;

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
    showMessage('Logged in!', 'success');
    closeModal('loginModal');
  } catch (error) {
    showMessage('Login error: ' + error.message, 'error');
  }
}

// Вихід
async function logout() {
  try {
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

  document.getElementById("btn1").addEventListener("click", () => {
    document.getElementById("sendModal").style.display = "flex";
    updateExchangeRates();
  });


  // Копіювання номера
  document.body.addEventListener('click', e => {
    if (e.target.classList.contains('nam')) copyCardNumber(e);
  });

  // Відкриття модалок
  document.getElementById('btnlog')?.addEventListener('click', () => openModal('loginModal'));
  document.getElementById('btnsing')?.addEventListener('click', () => openModal('registerModal'));
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('userAvatar')?.addEventListener('click', () => openModal('profileModal'));
  document.querySelector('.open-settings')?.addEventListener('click', () => openModal('settingsModal'));
  document.getElementById('btn1')?.addEventListener('click', () => openModal('sendModal'));
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
