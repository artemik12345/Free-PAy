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

// Вихід
async function logout() {
  try {
    await signOut(auth);
    alert("Logged out");
    showAuthButtons();
  } catch (error) {
    alert("Logout error: " + error.message);
  }
}

// Ініціалізація
document.addEventListener("DOMContentLoaded", () => {

  // Обробник для кнопки налаштувань ⚙️
  document.querySelector(".open-settings")?.addEventListener("click", () => {
    openModal("settingsModal");
  });

  // Обробники кнопок логіну/реєстрації
  document.getElementById("btnlog")?.addEventListener("click", () => {
    openModal("loginModal");
  });

  document.getElementById("btnsing")?.addEventListener("click", () => {
    openModal("registerModal");
  });

  // Обробники кнопок відправки, історії, оновлення
  document.getElementById("btn1")?.addEventListener("click", () => openModal("sendModal"));
  document.getElementById("btn2")?.addEventListener("click", () => openModal("historyModal"));
  document.getElementById("btn3")?.addEventListener("click", () => openModal("newCardModal"));

  // Закриття модалок при натисканні на ×
  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      if (modal) closeModal(modal.id);
    });
  });

  // Закриття модалок при натисканні ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = document.querySelectorAll(".modal[style*='display: flex']");
      openModals.forEach(modal => {
        closeModal(modal.id);
      });
    }
  });

  // Копіювання номера карти (перевірка на картку)
  document.querySelectorAll(".card-front .nam").forEach(el => {
    el.addEventListener("click", copyCardNumber);
  });

  // Кнопка аватара користувача відкриває профіль
  document.getElementById("userAvatar")?.addEventListener("click", () => {
    openModal("profileModal");
  });

  // Завантаження профілю користувача
  const profileNameInput = document.getElementById("profileName");
  const profileEmailInput = document.getElementById("profileEmail");
  const profileAvatarImg = document.getElementById("profileAvatar");
  const profilePasswordInput = document.getElementById("profilePassword");
  const togglePasswordBtn = document.getElementById("togglePasswordBtn");

  // Завантажити аватар з input
  const avatarInput = document.getElementById("avatarInput");
  const avatarContainer = document.getElementById("profileAvatarContainer");
  const avatarOverlay = document.getElementById("avatarOverlay");

  avatarContainer?.addEventListener("click", () => {
    avatarInput.click();
  });

  avatarInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      profileAvatarImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Показати/приховати пароль
  togglePasswordBtn?.addEventListener("click", () => {
    if (profilePasswordInput.type === "password") {
      profilePasswordInput.type = "text";
      togglePasswordBtn.textContent = "Hide";
    } else {
      profilePasswordInput.type = "password";
      togglePasswordBtn.textContent = "Show";
    }
  });

  // Кнопка збереження профілю (фіктивна реалізація)
  document.getElementById("saveProfileBtn")?.addEventListener("click", () => {
    alert("Save profile changes: function to implement.");
  });

  // Кнопка виходу
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    logout();
  });

  // Кнопка верифікації (фіктивна)
  document.getElementById("verifyBtn")?.addEventListener("click", () => {
    alert("Verification process not implemented yet.");
  });

  // Відслідковування авторизації
  onAuthStateChanged(auth, (user) => {
    if (user) {
      showUserAvatar(user);
      // Можна тут додати оновлення профілю тощо
    } else {
      showAuthButtons();
    }
  });

  // Виводимо flipCard у глобальний scope, щоб викликати з onclick в HTML
  window.flipCard = flipCard;
  window.openModal = openModal;
  window.closeCustomModal = closeCustomModal;
  window.copyCardNumber = copyCardNumber;
  window.register = register;
  window.login = login;

});
