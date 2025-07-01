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

// Універсальні функції відкриття/закриття модалок
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hide');
  modal.style.display = 'flex';

  // Блокуємо кнопку налаштувань
  const settingsBtn = document.querySelector('.open-settings');
  if (settingsBtn) settingsBtn.classList.add('disabled');
}

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

// Показати аватар користувача
function showUserAvatar(user) {
  document.getElementById('authButtons')?.style.setProperty('display', 'none');
  const container = document.getElementById('userAvatarContainer');
  if (container) container.style.display = 'block';

  const avatarImg = document.getElementById('userAvatar');
  if (avatarImg) {
    avatarImg.src = user.photoURL || '/images/proff.png';
    avatarImg.alt = user.displayName || user.email || '';
    avatarImg.title = user.displayName || user.email || '';
  }
}

// Показати кнопки авторизації
function showAuthButtons() {
  document.getElementById('authButtons')?.style.setProperty('display', 'flex');
  const container = document.getElementById('userAvatarContainer');
  if (container) container.style.display = 'none';
  closeModal('profileModal');
}

// Реєстрація Firebase
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

// Логін Firebase
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
    showAuthButtons();
  } catch (error) {
    alert("Logout error: " + error.message);
  }
}

// Google Sign-In
async function googleSignIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Перевіряємо чи є користувач в базі даних
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Якщо немає, створюємо нового
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

// Оновлення профілю
async function updateUserProfile() {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  const newName = document.getElementById("profileName")?.value.trim();
  const newEmail = document.getElementById("profileEmail")?.value.trim();

  if (!newName || !newEmail) return alert("Fill all fields!");

  try {
    // Оновлюємо email в Firebase Auth
    if (newEmail !== user.email) {
      await updateEmail(user, newEmail);
    }
    
    // Оновлюємо displayName в Firebase Auth
    if (newName !== user.displayName) {
      await updateProfile(user, { displayName: newName });
    }

    // Оновлюємо дані в Firestore
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

// Теми
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

// Обробник завантаження сторінки
document.addEventListener("DOMContentLoaded", () => {
  // Кнопки відкриття модалок
  document.getElementById("btnlog")?.addEventListener("click", () => openModal("loginModal"));
  document.getElementById("btnsing")?.addEventListener("click", () => openModal("registerModal"));
  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  document.getElementById("userAvatar")?.addEventListener("click", () => openModal("profileModal"));
  document.querySelector(".open-settings")?.addEventListener("click", () => openModal("settingsModal"));

  // Закриття модалок (кнопки ×)
  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal) closeModal(modal.id);
    });
  });

  // Копіювання номера карти (делегування)
  document.body.addEventListener("click", e => {
    if (e.target.classList.contains("nam")) copyCardNumber(e);
  });

  // Переворот карти (делегування)
  document.body.addEventListener("click", e => {
    const card = e.target.closest(".card");
    if (card) flipCard(card);
  });

  // Кнопки Google Sign-In
  document.getElementById("googleSignInBtnLogin")?.addEventListener("click", googleSignIn);
  document.getElementById("googleSignInBtnRegister")?.addEventListener("click", googleSignIn);

  // Реєстрація (кнопка)
  const registerBtn = document.querySelector("#registerModal button.modal-btn:not([id])");
  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      const name = document.querySelector('#registerModal input[placeholder="Name"]')?.value.trim();
      const email = document.querySelector('#registerModal input[placeholder="Email"]')?.value.trim();
      const password = document.querySelector('#registerModal input[placeholder="Password"]')?.value;

      if (!name || !email || !password) return alert("Please fill all fields");
      register(email, password, name);
    });
  }

  // Логін (кнопка)
  const loginBtn = document.querySelector("#loginModal button.modal-btn:not([id])");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const email = document.querySelector('#loginModal input[placeholder="Email"]')?.value.trim();
      const password = document.querySelector('#loginModal input[placeholder="Password"]')?.value;
      if (!email || !password) return alert("Please fill all fields");
      login(email, password);
    });
  }

  // Збереження профілю
  document.getElementById("saveProfileBtn")?.addEventListener("click", updateUserProfile);

  // Зміна аватара (локальний превʼю)
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
      // Тут можна додати логіку завантаження аватара на сервер
    };
    reader.readAsDataURL(file);
  });

  // Інші кнопки для відкриття модалок
  document.getElementById("btn1")?.addEventListener("click", () => openModal("sendModal"));
  document.getElementById("btn2")?.addEventListener("click", () => openModal("historyModal"));
  document.getElementById("btn3")?.addEventListener("click", () => {
    location.reload();
    setTheme("dark");
  });

  // Кнопка toggle пароля
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

  // Стан авторизації Firebase
  onAuthStateChanged(auth, (user) => {
    if (user) {
      showUserAvatar(user);
      
      // Заповнюємо дані профілю при відкритті модалки
      document.getElementById('profileName').value = user.displayName || '';
      document.getElementById('profileEmail').value = user.email || '';
      document.getElementById('profileAvatar').src = user.photoURL || '/images/proff.png';
      
      const settingsBtn = document.querySelector('.open-settings');
      if (settingsBtn) settingsBtn.classList.add('disabled');
    } else {
      showAuthButtons();
    }
  });
});

// Експорт (якщо потрібно)
export {
  flipCard,
  openModal,
  closeModal,
  copyCardNumber,
  setTheme,
  showUserAvatar,
  showAuthButtons,
  register,
  login,
  logout,
  googleSignIn,
  updateUserProfile
};
