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
  storageBucket: "freepay-app.firebasestorage.app",
  messagingSenderId: "812063343387",
  appId: "1:812063343387:web:83a5dd07d770cd1aca09be",
  measurementId: "G-BM44C1C2JR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ================= Функції модалок =================

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = "flex";
    modal.classList.remove("hide");
  }
  disableSettingsButton();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("hide");
    setTimeout(() => {
      modal.style.display = "none";
      unlockSettingsIfNoModalsOpen();
    }, 300);
  }
}

function disableSettingsButton() {
  const btn = document.querySelector(".open-settings");
  if (btn) btn.classList.add("disabled");
}

function unlockSettingsIfNoModalsOpen() {
  const modals = [
    "profileModal",
    "loginModal",
    "registerModal",
    "sendModal",
    "historyModal",
    "newCardModal",
    "settingsModal"
  ];
  const anyOpen = modals.some((id) => {
    const el = document.getElementById(id);
    return el && el.style.display === "flex" && !el.classList.contains("hide");
  });
  if (!anyOpen) {
    const btn = document.querySelector(".open-settings");
    if (btn) btn.classList.remove("disabled");
  }
}

// ================= Показ/приховання кнопок і аватара =================

const authButtons = document.getElementById("authButtons");
const userAvatarContainer = document.getElementById("userAvatarContainer");

function showUserAvatar(user) {
  authButtons.style.display = "none";
  userAvatarContainer.style.display = "block";
  const avatarImg = document.getElementById("userAvatar");
  avatarImg.src = user.photoURL || "/images/proff.png";
  avatarImg.alt = user.displayName || user.email;
  avatarImg.title = user.displayName || user.email;
}

function showAuthButtons() {
  authButtons.style.display = "flex";
  userAvatarContainer.style.display = "none";
  closeModal("profileModal");
}

// ================= Переворот карти =================

function flipCard(cardElement) {
  cardElement.classList.toggle('flipped');
}

// ================= Копіювання номера карти =================

function copyCardNumber(event) {
  event.stopPropagation();
  const number = event.target.textContent;
  navigator.clipboard.writeText(number)
    .then(() => alert("Card number copied: " + number))
    .catch(() => alert("Copy error"));
}

// ================= Firebase Авторизація =================

async function register(email, password, name) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      createdAt: new Date().toISOString()
    });
    alert("Registered successfully!");
    closeModal("registerModal");
  } catch (error) {
    alert("Registration error: " + error.message);
  }
}

async function login(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Logged in!");
    closeModal("loginModal");
  } catch (error) {
    alert("Login error: " + error.message);
  }
}

async function logout() {
  await signOut(auth);
}

// Google Sign-In

async function googleSignIn() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert("Google Sign-In error: " + error.message);
  }
}

// ================= Стан авторизації користувача =================

onAuthStateChanged(auth, async (user) => {
  if (user) {
    showUserAvatar(user);
    disableSettingsButton();

    // Якщо треба, можна завантажити додаткові дані з Firestore
    // const userDoc = await getDoc(doc(db, "users", user.uid));
  } else {
    showAuthButtons();
  }
});

// ================= Ініціалізація DOM =================

document.addEventListener("DOMContentLoaded", () => {
  // Кнопки відкриття модалок логіну/реєстрації
  document.getElementById("btnlog").addEventListener("click", () => openModal("loginModal"));
  document.getElementById("btnsing").addEventListener("click", () => openModal("registerModal"));

  // Вихід
  document.getElementById("logoutBtn").addEventListener("click", () => logout());

  // Google Sign-In кнопки
  const googleLoginBtn = document.createElement("button");
  googleLoginBtn.textContent = "Sign In with Google";
  googleLoginBtn.classList.add("modal-btn");
  googleLoginBtn.addEventListener("click", googleSignIn);
  document.getElementById("googleSignInLoginDiv").appendChild(googleLoginBtn);

  const googleRegisterBtn = document.createElement("button");
  googleRegisterBtn.textContent = "Sign Up with Google";
  googleRegisterBtn.classList.add("modal-btn");
  googleRegisterBtn.addEventListener("click", googleSignIn);
  document.getElementById("googleSignInRegisterDiv").appendChild(googleRegisterBtn);

  // Логін
  const loginBtn = document.querySelector("#loginModal button.modal-btn:not([id])");
  loginBtn.addEventListener("click", () => {
    const email = document.querySelector('#loginModal input[placeholder="Email"]').value.trim();
    const password = document.querySelector('#loginModal input[placeholder="Password"]').value;
    if (!email || !password) return alert("Please fill all fields");
    login(email, password);
  });

  // Реєстрація
  const registerBtn = document.querySelector("#registerModal button.modal-btn:not([id])");
  registerBtn.addEventListener("click", () => {
    const name = document.querySelector('#registerModal input[placeholder="Name"]').value.trim();
    const email = document.querySelector('#registerModal input[placeholder="Email"]').value.trim();
    const password = document.querySelector('#registerModal input[placeholder="Password"]').value;
    if (!name || !email || !password) return alert("Please fill all fields");
    register(email, password, name);
  });

  // Показ профілю при кліку на аватар
  document.getElementById("userAvatar").addEventListener("click", () => openModal("profileModal"));

  // Збереження профілю
  document.getElementById("saveProfileBtn").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    const newName = document.getElementById("profileName").value.trim();
    const newEmail = document.getElementById("profileEmail").value.trim();

    if (!newName || !newEmail) return alert("Fill all fields!");

    try {
      if (newEmail !== user.email) {
        await updateEmail(user, newEmail);
      }
      await updateProfile(user, { displayName: newName });
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { name: newName, email: newEmail });

      alert("Profile updated");
      closeModal("profileModal");
      showUserAvatar(user);
    } catch (error) {
      alert("Error updating profile: " + error.message);
    }
  });

  // Зміна аватара (локальний превʼю)
  document.getElementById("profileAvatarContainer").addEventListener("click", () => {
    document.getElementById("avatarInput").click();
  });

  document.getElementById("avatarInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Avatar must be less than 2MB");

    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById("profileAvatar").src = ev.target.result;
      // Можна додати логіку завантаження в Firebase Storage тут
    };
    reader.readAsDataURL(file);
  });

  // Делегування кліку для перевороту карток (якщо є контейнер з картками)
  const cardsContainer = document.getElementById('cardsContainer');
  if (cardsContainer) {
    cardsContainer.addEventListener('click', e => {
      const card = e.target.closest('.card');
      if (card) flipCard(card);
    });
  }

  // Делегування кліку для копіювання номера карти (усі елементи з класом .nam)
  document.body.addEventListener('click', e => {
    if (e.target.classList.contains('nam')) {
      copyCardNumber(e);
    }
  });

  // Копіювання номера картки (окремо, якщо хочеш)
  // document.querySelector(".nam").addEventListener("click", copyCardNumber);

  // Відкриття модалок Send, History, New Card
  document.getElementById("btn1").addEventListener("click", () => openModal("sendModal"));
  document.getElementById("btn2").addEventListener("click", () => openModal("historyModal"));
  document.getElementById("btn3").addEventListener("click", () => {
    location.reload();
    setTheme("dark");
  });

  // Кнопка налаштувань
  const settingsBtn = document.querySelector(".open-settings");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => openModal("settingsModal"));
  }

  // Закриття модалок (кнопки ×)
  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal) closeModal(modal.id);
    });
  });

  // Теми
  window.setTheme = (theme) => {
    const root = document.documentElement;
    if (theme === "light") {
      root.style.setProperty("--bg-color", "#f5f5f5");
      root.style.setProperty("--text-color", "#111");
      root.style.setProperty("--card-color", "#ffffff");
      root.style.setProperty("--btn-color", "#dddddd");
      root.style.setProperty("--btn-hover-color", "#bbbbbb");
    } else {
      root.style.setProperty("--bg-color", "#2c283b");
      root.style.setProperty("--text-color", "rgb(255, 248, 239)");
      root.style.setProperty("--card-color", "#1e1736");
      root.style.setProperty("--btn-color", "#3f3564");
      root.style.setProperty("--btn-hover-color", "rgb(76, 58, 110)");
    }
  };

  // Мова (алерт)
  window.setLanguage = (lang) => alert("Language set to: " + lang.toUpperCase());

  // Показ/приховання пароля в профілі
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
});
