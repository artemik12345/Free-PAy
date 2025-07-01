import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile,
  updateEmail
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC-grJlXshD89_MdLFm5oosejZDGR-gtgc",
  authDomain: "freepay-app.firebaseapp.com",
  projectId: "freepay-app",
  storageBucket: "freepay-app.appspot.com",
  messagingSenderId: "812063343387",
  appId: "1:812063343387:web:83a5dd07d770cd1aca09be",
  measurementId: "G-BM44C1C2JR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Функція для перевороту карти
function flipCard(cardElement) {
  if (!cardElement) return;
  cardElement.classList.toggle('flipped');
}

// Відкриття модалки по id
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hide');
  modal.style.display = 'flex';

  const settingsBtn = document.querySelector('.open-settings');
  if (settingsBtn) settingsBtn.classList.add('disabled');
}

// Закриття модалки по id
function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('hide');
  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.remove('hide');
    unlockSettingsIfNoModalsOpen();
  }, 400);
}

// Закриття модалки (з HTML викликається closeCustomModal)
function closeCustomModal(id) {
  closeModal(id);
}

// Перевірка відкритих модалок і розблокування кнопки налаштувань
function unlockSettingsIfNoModalsOpen() {
  const modals = ['profileModal', 'loginModal', 'registerModal', 'sendModal', 'historyModal', 'newCardModal', 'settingsModal'];
  const anyOpen = modals.some(id => {
    const el = document.getElementById(id);
    return el && !el.classList.contains('hide') && el.style.display === 'flex';
  });
  const settingsBtn = document.querySelector('.open-settings');
  if (settingsBtn && !anyOpen) settingsBtn.classList.remove('disabled');
}

// Копіювання номера карти
function copyCardNumber(event) {
  event.stopPropagation();
  const number = event.target.textContent;
  navigator.clipboard.writeText(number)
    .then(() => alert("Card number copied: " + number))
    .catch(() => alert("Copy error"));
}

// Показати аватар користувача після входу
function showUserAvatar(user) {
  const authButtons = document.getElementById('authButtons');
  if (authButtons) authButtons.style.display = 'none';

  const container = document.getElementById('userAvatarContainer');
  if (container) container.style.display = 'block';

  const avatarImg = document.getElementById('userAvatar');
  if (avatarImg) {
    avatarImg.src = user.photoURL || '/images/proff.png';
    avatarImg.alt = user.displayName || user.email || '';
    avatarImg.title = user.displayName || user.email || '';
  }
}

// Показати кнопки авторизації, якщо користувач не в системі
function showAuthButtons() {
  const authButtons = document.getElementById('authButtons');
  if (authButtons) authButtons.style.display = 'flex';

  const container = document.getElementById('userAvatarContainer');
  if (container) container.style.display = 'none';

  closeModal('profileModal');
}

// Реєстрація користувача
async function register(email, password, name) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      createdAt: new Date().toISOString(),
      avatar: '/images/proff.png'
    });

    await updateProfile(user, { displayName: name });

    alert("Registered successfully!");
    closeModal("registerModal");
  } catch (error) {
    alert("Registration error: " + error.message);
  }
}

// Логін користувача
async function login(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Logged in!");
    closeModal("loginModal");
  } catch (error) {
    alert("Login error: " + error.message);
  }
}

// Вихід користувача
async function logout() {
  try {
    await signOut(auth);
    showAuthButtons();
  } catch (error) {
    alert("Logout error: " + error.message);
  }
}

// Вхід через Google
async function googleSignIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL || '/images/proff.png',
        createdAt: new Date().toISOString()
      });
    }

    alert(`Welcome, ${user.displayName}!`);
  } catch (error) {
    alert("Google Sign-In error: " + error.message);
  }
}

// Оновлення профілю користувача
async function updateUserProfile() {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  const newName = document.getElementById("profileName")?.value.trim();
  const newEmail = document.getElementById("profileEmail")?.value.trim();

  if (!newName || !newEmail) return alert("Fill all fields!");

  try {
    if (newEmail !== user.email) {
      await updateEmail(user, newEmail);
    }

    if (newName !== user.displayName) {
      await updateProfile(user, { displayName: newName });
    }

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      name: newName,
      email: newEmail
    });

    alert("Profile updated");
    closeModal("profileModal");
    showUserAvatar(user);
  } catch (error) {
    alert("Error updating profile: " + error.message);
  }
}

// Зміна теми
function setTheme(theme) {
  const root = document.documentElement;

  if (theme === 'light') {
    root.style.setProperty('--bg-color', '#f5f5f5');
    root.style.setProperty('--text-color', '#111');
    root.style.setProperty('--card-color', '#ffffff');
    root.style.setProperty('--btn-color', '#dddddd');
    root.style.setProperty('--btn-hover-color', '#bbbbbb');
  } else {
    root.style.setProperty('--bg-color', '#2c283b');
    root.style.setProperty('--text-color', 'rgb(255, 248, 239)');
    root.style.setProperty('--card-color', '#1e1736');
    root.style.setProperty('--btn-color', '#3f3564');
    root.style.setProperty('--btn-hover-color', 'rgb(76, 58, 110)');
  }
}

// Зміна мови (простий приклад, можна розвивати)
function setLanguage(lang) {
  alert(`Language set to: ${lang}`);
}

// Події після завантаження DOM
document.addEventListener("DOMContentLoaded", () => {
  // Кнопки відкриття модалок
  document.getElementById("btnlog")?.addEventListener("click", () => openModal("loginModal"));
  document.getElementById("btnsing")?.addEventListener("click", () => openModal("registerModal"));
  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  document.getElementById("userAvatar")?.addEventListener("click", () => openModal("profileModal"));
  document.querySelector(".open-settings")?.addEventListener("click", () => openModal("settingsModal"));

  document.getElementById("btn1")?.addEventListener("click", () => openModal("sendModal"));
  document.getElementById("btn2")?.addEventListener("click", () => openModal("historyModal"));
  document.getElementById("btn3")?.addEventListener("click", () => {
    location.reload();
    setTheme("dark");
  });

  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal) closeModal(modal.id);
    });
  });

  // Делегування подій копіювання номера карти
  document.body.addEventListener("click", e => {
    if (e.target.classList.contains("nam")) copyCardNumber(e);
  });

  // Делегування перевороту карти
  document.body.addEventListener("click", e => {
    const card = e.target.closest(".card");
    if (card) flipCard(card);
  });

  // Зміна аватара
  document.getElementById("profileAvatarContainer")?.addEventListener("click", () => {
    document.getElementById("avatarInput")?.click();
  });

  document.getElementById("avatarInput")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Avatar must be less than 2MB");

    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById("profileAvatar").src = ev.target.result;
      // Тут можна додати завантаження на сервер
    };
    reader.readAsDataURL(file);
  });

  // Toggle пароля
  const togglePwdBtn = document.getElementById("togglePasswordBtn");
  if (togglePwdBtn) {
    togglePwdBtn.addEventListener("click", () => {
      const pwdInput = document.getElementById("profilePassword");
      if (!pwdInput) return;
      if (pwdInput.type === "password") {
        pwdInput.type = "text";
        togglePwdBtn.textContent = "Hide";
      } else {
        pwdInput.type = "password";
        togglePwdBtn.textContent = "Show";
      }
    });
  }

  // Авторизація Firebase (стежимо за станом)
  onAuthStateChanged(auth, (user) => {
    if (user) {
      showUserAvatar(user);
      document.getElementById('profileName').value = user.displayName || '';
      document.getElementById('profileEmail').value = user.email || '';
      document.getElementById('profileAvatar').src = user.photoURL || '/images/proff.png';

      const settingsBtn = document.querySelector('.open-settings');
      if (settingsBtn) settingsBtn.classList.add('disabled');
    } else {
      showAuthButtons();
    }
  });

  // Реєстрація (кнопка в модалці)
  const registerBtn = document.querySelector("#registerModal button.modal-btn:not([id])");
  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      const name = document.querySelector('#registerModal input[placeholder="Name"]')?.value.trim();
      const email = document.querySelector('#registerModal input[placeholder="Email"]')?.value.trim();
      const password = document.querySelector('#registerModal input[placeholder="Password"]')?.value;
      if (!name || !email || !password) return alert("Fill all fields!");
      register(email, password, name);
    });
  }

  // Логін (кнопка в модалці)
  const loginBtn = document.querySelector("#loginModal button.modal-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const email = document.querySelector('#loginModal input[placeholder="Email"]')?.value.trim();
      const password = document.querySelector('#loginModal input[placeholder="Password"]')?.value;
      if (!email || !password) return alert("Fill all fields!");
      login(email, password);
    });
  }

  // Збереження профілю
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", updateUserProfile);
  }

  // Google Sign-In кнопки
  window.google?.accounts.id.initialize({
    client_id: "YOUR_GOOGLE_CLIENT_ID",
    callback: (response) => {
      // Handle Google One Tap or Sign In (реалізація за потребою)
    }
  });

  // Google кнопки додати у потрібні div
  const googleLoginDiv = document.getElementById('googleSignInLoginDiv');
  const googleRegisterDiv = document.getElementById('googleSignInRegisterDiv');
  if (googleLoginDiv) {
    const btn = document.createElement('button');
    btn.textContent = "Sign in with Google";
    btn.className = "modal-btn";
    btn.addEventListener('click', googleSignIn);
    googleLoginDiv.appendChild(btn);
  }
  if (googleRegisterDiv) {
    const btn = document.createElement('button');
    btn.textContent = "Sign up with Google";
    btn.className = "modal-btn";
    btn.addEventListener('click', googleSignIn);
    googleRegisterDiv.appendChild(btn);
  }
});

// Експортуємо функції в глобальний контекст, бо в HTML викликаються (наприклад flipCard)
window.flipCard = flipCard;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeCustomModal = closeCustomModal;
window.copyCardNumber = copyCardNumber;
window.setTheme = setTheme;
window.setLanguage = setLanguage;
