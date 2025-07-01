// Ініціалізація Firebase (твої налаштування)
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
const provider = new firebase.auth.GoogleAuthProvider();

// Переворот картки (фліп) - правильна логіка
document.querySelector('.card').addEventListener('click', function (e) {
  if (e.target.classList.contains('nam')) {
    // не перевертати карту при кліці на номер картки
    return;
  }
  this.classList.toggle('flipped'); // додаємо клас flipped на .card
});

// Копіювання номера картки
function copyCardNumber(event) {
  event.stopPropagation();
  const text = event.target.textContent;
  navigator.clipboard.writeText(text)
    .then(() => alert("Card number copied: " + text))
    .catch(() => alert("Failed to copy"));
}
window.copyCardNumber = copyCardNumber;

// Відкриття модального вікна
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'flex';
  modal.classList.remove('hide');
  disableSettingsIfModalOpen(true);
}
window.openModal = openModal;

// Закриття модального вікна
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

// Вмикання/вимикання кнопки налаштувань
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

// Показати аватар і ховати кнопки логіну/реєстрації
function showUserAvatar(user) {
  const authButtons = document.getElementById('authButtons');
  if (authButtons) authButtons.style.display = 'none';
  const userAvatarContainer = document.getElementById('userAvatarContainer');
  if (userAvatarContainer) userAvatarContainer.style.display = 'block';

  const avatarImg = document.getElementById('userAvatar');
  if (avatarImg) {
    avatarImg.src = user.photoURL || '/images/proff.png';
    avatarImg.alt = user.displayName || user.email || '';
    avatarImg.title = user.displayName || user.email || '';
  }
}

// Показати кнопки логіну/реєстрації і сховати аватар
function showAuthButtons() {
  const authButtons = document.getElementById('authButtons');
  if (authButtons) authButtons.style.display = 'flex';
  const userAvatarContainer = document.getElementById('userAvatarContainer');
  if (userAvatarContainer) userAvatarContainer.style.display = 'none';
}

// Реєстрація через Email/Password
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

    alert('Registered successfully!');
    closeModal('registerModal');
  } catch (error) {
    alert('Registration error: ' + error.message);
  }
}

// Логін через Email/Password
async function login(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    alert('Logged in!');
    closeModal('loginModal');
  } catch (error) {
    alert('Login error: ' + error.message);
  }
}

// Вихід із акаунту
async function logout() {
  try {
    await auth.signOut();
    showAuthButtons();
    closeModal('profileModal');
  } catch (error) {
    alert('Logout error: ' + error.message);
  }
}
window.logout = logout;

// Вхід через Google
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
    alert(`Welcome, ${user.displayName}!`);
  } catch (error) {
    alert('Google sign-in error: ' + error.message);
  }
}
window.googleSignIn = googleSignIn;

// Оновлення профілю
async function updateUserProfile() {
  const user = auth.currentUser;
  if (!user) return alert('Not logged in!');

  const newName = document.getElementById('profileName')?.value.trim();
  const newEmail = document.getElementById('profileEmail')?.value.trim();

  if (!newName || !newEmail) return alert('Fill all fields!');

  try {
    if (newEmail !== user.email) {
      await user.updateEmail(newEmail);
    }
    if (newName !== user.displayName) {
      await user.updateProfile({ displayName: newName });
    }

    await db.collection('users').doc(user.uid).update({
      name: newName,
      email: newEmail
    });

    alert('Profile updated!');
    closeModal('profileModal');
    showUserAvatar(auth.currentUser);
  } catch (error) {
    alert('Profile update error: ' + error.message);
  }
}
window.updateUserProfile = updateUserProfile;

// Теми
function setTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.style.setProperty('--bg-color', '#f5f5f5');
    root.style.setProperty('--text-color', '#111');
    root.style.setProperty('--card-color', '#fff');
    root.style.setProperty('--btn-color', '#ddd');
    root.style.setProperty('--btn-hover-color', '#bbb');
  } else {
    root.style.setProperty('--bg-color', '#2c283b');
    root.style.setProperty('--text-color', 'rgb(255,248,239)');
    root.style.setProperty('--card-color', '#1e1736');
    root.style.setProperty('--btn-color', '#3f3564');
    root.style.setProperty('--btn-hover-color', 'rgb(76,58,110)');
  }
}
window.setTheme = setTheme;

// Мова
function setLanguage(lang) {
  alert('Language set to: ' + lang);
}
window.setLanguage = setLanguage;

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
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

  // Закриття модалок
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  // Копіювання номера картки
  document.body.addEventListener('click', e => {
    if (e.target.classList.contains('nam')) copyCardNumber(e);
  });

  // Зміна аватара
  document.getElementById('profileAvatarContainer')?.addEventListener('click', () => {
    document.getElementById('avatarInput')?.click();
  });

  document.getElementById('avatarInput')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('Avatar must be less than 2MB');

    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('profileAvatar').src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Показати/сховати пароль
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

  // Відслідковування стану аутентифікації
  auth.onAuthStateChanged(user => {
    if (user) {
      showUserAvatar(user);
      document.getElementById('profileName').value = user.displayName || '';
      document.getElementById('profileEmail').value = user.email || '';
      document.getElementById('profileAvatar').src = user.photoURL || '/images/proff.png';
    } else {
      showAuthButtons();
    }
  });

  // Реєстрація по кнопці
  const registerBtn = document.querySelector('#registerModal button.modal-btn:not([id])');
  if (registerBtn) {
    registerBtn.addEventListener('click', () => {
      const name = document.querySelector('#registerModal input[placeholder="Name"]')?.value.trim();
      const email = document.querySelector('#registerModal input[placeholder="Email"]')?.value.trim();
      const password = document.querySelector('#registerModal input[placeholder="Password"]')?.value;
      if (!name || !email || !password) return alert('Fill all fields!');
      register(email, password, name);
    });
  }

  // Логін по кнопці
  const loginBtn = document.querySelector('#loginModal button.modal-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const email = document.querySelector('#loginModal input[placeholder="Email"]')?.value.trim();
      const password = document.querySelector('#loginModal input[placeholder="Password"]')?.value;
      if (!email || !password) return alert('Fill all fields!');
      login(email, password);
    });
  }

  // Збереження профілю
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', updateUserProfile);
  }

  // Google Sign-In кнопки
  document.querySelectorAll('.google-btn').forEach(btn => {
    btn.addEventListener('click', googleSignIn);
  });

});
