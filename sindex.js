// --- Firebase Initialization ---
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

// --- Cloudinary Config ---
const CLOUD_NAME = "dslmbyqys";
const UPLOAD_PRESET = "freepay";

// --- DOM Elements ---
const avatarInput = document.getElementById("avatarInput");
const profileAvatar = document.getElementById("profileAvatar");
const userAvatar = document.getElementById("userAvatar");
const profileAvatarContainer = document.getElementById("profileAvatarContainer");
const avatarOverlay = document.getElementById("avatarOverlay");

// --- Avatar Functions ---
function loadCurrentAvatar() {
  const user = auth.currentUser;
  if (user && user.photoURL) {
    profileAvatar.src = user.photoURL;
    userAvatar.src = user.photoURL;
  }
}

// Avatar hover effects
profileAvatarContainer?.addEventListener("mouseenter", () => {
  avatarOverlay.style.opacity = 1;
});
profileAvatarContainer?.addEventListener("mouseleave", () => {
  avatarOverlay.style.opacity = 0;
});

// Avatar upload handler (modified to prevent auto-save)
avatarInput?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showMessage("Avatar must be less than 2MB", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    showMessage("Uploading avatar...", "info");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    // Set preview only (no Firebase update yet)
    profileAvatar.src = data.secure_url;
    profileAvatar.dataset.tempUrl = data.secure_url; // Store for potential save
    showMessage("Avatar ready! Click 'Save' to confirm.", "success");

  } catch (err) {
    console.error("Avatar upload error:", err);
    showMessage("Failed to upload avatar", "error");
  }
});

// --- Core Functions ---
function showMessage(text, type = "info", timeout = 4000) {
  const container = document.getElementById("messageContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-message ${type}`;
  toast.textContent = text;

  toast.addEventListener("click", () => {
    toast.style.animation = "slideOutRight 0.3s forwards";
    toast.addEventListener("animationend", () => toast.remove());
  });

  container.appendChild(toast);
  setTimeout(() => toast.remove(), timeout);
}

function copyCardNumber(event) {
  event.stopPropagation();
  const text = event.target.textContent;
  navigator.clipboard.writeText(text)
    .then(() => showMessage("Card number copied: " + text, "success"))
    .catch(() => showMessage("Failed to copy", "error"));
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = "flex";
  modal.classList.remove("hide");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("hide");
  setTimeout(() => {
    modal.style.display = "none";
    modal.classList.remove("hide");
  }, 300);
}

// --- Authentication Functions ---
async function register(email, password, name) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await db.collection("users").doc(user.uid).set({
      name,
      email,
      createdAt: new Date().toISOString(),
      avatar: "/images/proff.png"
    });

    await user.updateProfile({ displayName: name });
    await user.reload();

    showMessage("Registered successfully!", "success");
    closeModal("registerModal");
  } catch (error) {
    showMessage("Registration error: " + error.message, "error");
  }
}

async function login(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showMessage("Logged in!", "success");
    closeModal("loginModal");
  } catch (error) {
    showMessage("Login error: " + error.message, "error");
  }
}

async function logout() {
  try {
    await auth.signOut();
    showAuthButtons();
    closeModal("profileModal");
    showMessage("Logged out!", "success");
  } catch (error) {
    showMessage("Logout error: " + error.message, "error");
  }
}

async function googleSignIn() {
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const userDoc = await db.collection("users").doc(user.uid).get();
    if (!userDoc.exists) {
      await db.collection("users").doc(user.uid).set({
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL || "/images/proff.png",
        createdAt: new Date().toISOString()
      });
    }

    showMessage(`Welcome, ${user.displayName}!`, "success");
    closeModal("loginModal");
  } catch (error) {
    showMessage("Google sign-in error: " + error.message, "error");
  }
}

// --- Profile Management ---
function showUserAvatar(user) {
  document.getElementById("authButtons").style.display = "none";
  const userAvatarContainer = document.getElementById("userAvatarContainer");
  userAvatarContainer.style.display = "block";

  const avatarImg = document.getElementById("userAvatar");
  avatarImg.src = user.photoURL || "/images/proff.png";
  avatarImg.alt = user.displayName || user.email || "";
  avatarImg.title = user.displayName || user.email || "";
}

function showAuthButtons() {
  document.getElementById("authButtons").style.display = "flex";
  document.getElementById("userAvatarContainer").style.display = "none";
}

async function updateUserProfile() {
  const user = auth.currentUser;
  if (!user) return showMessage("Not logged in!", "error");

  const newName = document.getElementById("profileName")?.value.trim();
  const newEmail = document.getElementById("profileEmail")?.value.trim();
  const newPassword = document.getElementById("profilePassword")?.value;
  const tempAvatarUrl = profileAvatar.dataset.tempUrl;

  if (!newName || !newEmail) return showMessage("Fill all fields!", "error");

  try {
    // Update email if changed
    if (newEmail !== user.email) {
      await user.updateEmail(newEmail);
    }

    // Prepare profile updates
    const profileUpdates = { displayName: newName };
    if (tempAvatarUrl) profileUpdates.photoURL = tempAvatarUrl;

    // Execute updates
    await user.updateProfile(profileUpdates);
    await user.reload();

    // Update Firestore
    const dbUpdates = {
      name: newName,
      email: newEmail
    };
    if (tempAvatarUrl) dbUpdates.avatar = tempAvatarUrl;

    await db.collection("users").doc(user.uid).update(dbUpdates);

    // Update password if provided
    if (newPassword) {
      await user.updatePassword(newPassword);
      document.getElementById("profilePassword").value = "";
    }

    // Clear temp avatar URL if used
    if (tempAvatarUrl) delete profileAvatar.dataset.tempUrl;

    showMessage("Profile updated!", "success");
    closeModal("profileModal");
    showUserAvatar(auth.currentUser);

  } catch (error) {
    showMessage("Profile update error: " + error.message, "error");
  }
}

// --- UI Settings ---
function setTheme(theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.style.setProperty("--bg-color", "#f5f5f5");
    root.style.setProperty("--text-color", "#111");
    root.style.setProperty("--card-color", "#fff");
    root.style.setProperty("--btn-color", "#ddd");
    root.style.setProperty("--btn-hover-color", "#bbb");
    showMessage("Light theme applied", "info");
  } else {
    root.style.setProperty("--bg-color", "#2c283b");
    root.style.setProperty("--text-color", "rgb(255,248,239)");
    root.style.setProperty("--card-color", "#1e1736");
    root.style.setProperty("--btn-color", "#3f3564");
    root.style.setProperty("--btn-hover-color", "rgb(76,58,110)");
    showMessage("Dark theme applied", "info");
  }
}

function setLanguage(lang) {
  showMessage(`Language set to: ${lang}`, "info");
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  // Card flip
  document.querySelector(".card")?.addEventListener("click", function(e) {
    if (!e.target.classList.contains("nam")) this.classList.toggle("flipped");
  });

  // Auth buttons
  document.getElementById("btnlog")?.addEventListener("click", () => openModal("loginModal"));
  document.getElementById("btnsing")?.addEventListener("click", () => openModal("registerModal"));
  
  // Main buttons
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  document.getElementById("userAvatar")?.addEventListener("click", () => openModal("profileModal"));
  document.querySelector(".open-settings")?.addEventListener("click", () => openModal("settingsModal"));
  document.getElementById("btn1")?.addEventListener("click", () => openModal("sendModal"));
  document.getElementById("btn2")?.addEventListener("click", () => openModal("historyModal"));
  document.getElementById("btn3")?.addEventListener("click", () => location.reload());
  document.querySelector(".btnnn")?.addEventListener("click", () => openModal("newCardModal"));

  // Profile management
  document.getElementById("saveProfileBtn")?.addEventListener("click", updateUserProfile);
  document.getElementById("profileAvatarContainer")?.addEventListener("click", () => {
    document.getElementById("avatarInput").click();
  });

  // Password toggle
  const togglePwdBtn = document.getElementById("togglePasswordBtn");
  if (togglePwdBtn) {
    togglePwdBtn.addEventListener("click", function() {
      const pwdInput = document.getElementById("profilePassword");
      if (!pwdInput) return;
      if (pwdInput.type === "password") {
        pwdInput.type = "text";
        this.textContent = "Hide";
      } else {
        pwdInput.type = "password";
        this.textContent = "Show";
      }
    });
  }

  // Auth state listener
  auth.onAuthStateChanged(user => {
    if (user) {
      showUserAvatar(user);
      document.getElementById("profileName").value = user.displayName || "";
      document.getElementById("profileEmail").value = user.email || "";
      document.getElementById("profileAvatar").src = user.photoURL || "/images/proff.png";
      document.getElementById("userAvatar").src = user.photoURL || "/images/proff.png";
      
      // Clear any unsaved avatar changes
      if (profileAvatar.dataset.tempUrl) {
        delete profileAvatar.dataset.tempUrl;
      }
    } else {
      showAuthButtons();
    }
  });

  // Load current avatar
  loadCurrentAvatar();
});

// --- Window Exports ---
window.copyCardNumber = copyCardNumber;
window.openModal = openModal;
window.closeModal = closeModal;
window.logout = logout;
window.googleSignIn = googleSignIn;
window.setTheme = setTheme;
window.setLanguage = setLanguage;
window.updateUserProfile = updateUserProfile;
