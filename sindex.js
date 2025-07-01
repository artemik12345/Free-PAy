function flipCard(cardElement) {
  cardElement.classList.toggle('flipped');
}

function openModal() {
  const modal = document.getElementById('settingsModal');
  modal.classList.remove('hide');
  modal.style.display = 'flex';

  // Блокуємо кнопку налаштувань при відкритті будь-якого модала
  const settingsBtn = document.querySelector('.open-settings');
  if (settingsBtn) {
    settingsBtn.classList.add('disabled');
  }
}

function closeModal() {
  const modal = document.getElementById('settingsModal');
  modal.classList.add('hide');
  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.remove('hide');

    // Розблоковуємо кнопку, якщо жодна модалка не відкрита
    unlockSettingsIfNoModalsOpen();
  }, 400);
}

function unlockSettingsIfNoModalsOpen() {
  const modals = ['profileModal', 'loginModal', 'registerModal', 'sendModal', 'historyModal', 'newCardModal', 'settingsModal'];
  const anyModalOpen = modals.some(modalId => {
    const el = document.getElementById(modalId);
    return el && !el.classList.contains('hide') && el.style.display === 'flex';
  });

  const settingsBtn = document.querySelector('.open-settings');
  if (settingsBtn && !anyModalOpen) {
    settingsBtn.classList.remove('disabled');
  }
}

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

function setLanguage(lang) {
  alert("Language set to: " + lang.toUpperCase());
}

function openCustomModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('hide');
  modal.style.display = 'flex';

  if (id === 'profileModal') {
    const user = getLoggedInUser();
    if (user) {
      document.getElementById('profileName').value = user.name;
      document.getElementById('profileEmail').value = user.email;
      document.getElementById('profileAvatar').src = user.avatar || '/images/proff.png';
    }
  }

  // Блокуємо кнопку налаштувань при відкритті будь-якого модала
  const settingsBtn = document.querySelector('.open-settings');
  if (settingsBtn) {
    settingsBtn.classList.add('disabled');
  }
}

function closeCustomModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('hide');
  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.remove('hide');

    // Розблоковуємо кнопку, якщо жодна модалка не відкрита
    unlockSettingsIfNoModalsOpen();
  }, 400);
}

function copyCardNumber(event) {
  event.stopPropagation();
  const number = document.querySelector('.nam').textContent;
  navigator.clipboard.writeText(number).then(() => {
    alert("Card number copied: " + number);
  }).catch(() => {
    alert("Copy error");
  });
}

// ========== АВТОРИЗАЦІЯ ТА ПРОФІЛЬ ==========

function getUsers() {
  return JSON.parse(localStorage.getItem('users')) || [];
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function setLoggedInUser(user) {
  sessionStorage.setItem('loggedInUser', JSON.stringify(user));
}

function getLoggedInUser() {
  return JSON.parse(sessionStorage.getItem('loggedInUser'));
}

function logoutUser() {
  sessionStorage.removeItem('loggedInUser');
  showAuthButtons();
  const settingsBtn = document.querySelector('.open-settings');
  if (settingsBtn) {
    settingsBtn.classList.remove('disabled');
  }
}

function hashPassword(password) {
  return btoa(unescape(encodeURIComponent(password)));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8;
}

function showUserAvatar(user) {
  document.getElementById('authButtons').style.display = 'none';
  const container = document.getElementById('userAvatarContainer');
  container.style.display = 'block';

  const avatarImg = document.getElementById('userAvatar');
  avatarImg.src = user.avatar || '/images/proff.png';
  avatarImg.alt = user.name;
  avatarImg.title = user.name;
}

function showAuthButtons() {
  document.getElementById('authButtons').style.display = 'flex';
  document.getElementById('userAvatarContainer').style.display = 'none';
  closeCustomModal('profileModal');
}

function handleGoogleCredentialResponse(response) {
  try {
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const googleUser = JSON.parse(jsonPayload);

    const users = getUsers();
    const existingUserIndex = users.findIndex(u => u.googleId === googleUser.sub);

    if (existingUserIndex !== -1) {
      setLoggedInUser(users[existingUserIndex]);
    } else {
      const newUser = {
        name: googleUser.name || "Google User",
        email: googleUser.email,
        avatar: googleUser.picture || "/images/proff.png",
        googleId: googleUser.sub,
        isVerified: true,
        cards: [],
        balance: 0
      };
      users.push(newUser);
      saveUsers(users);
      setLoggedInUser(newUser);
    }

    showUserAvatar(getLoggedInUser());
    const settingsBtn = document.querySelector('.open-settings');
    if (settingsBtn) {
      settingsBtn.classList.add('disabled');
    }
    closeCustomModal('loginModal');
    closeCustomModal('registerModal');
    alert(`Welcome, ${getLoggedInUser().name}!`);
  } catch (error) {
    console.error("Google login error:", error);
    alert("Error during Google login. Please try again.");
  }
}

function registerUser() {
  const name = document.querySelector('#registerModal input[placeholder="Name"]').value.trim();
  const email = document.querySelector('#registerModal input[placeholder="Email"]').value.trim();
  const password = document.querySelector('#registerModal input[placeholder="Password"]').value;

  if (!name || !email || !password) return alert("Please fill in all fields!");
  if (!isValidEmail(email)) return alert("Please enter a valid email address!");
  if (!isValidPassword(password)) return alert("Password must be at least 8 characters!");

  const users = getUsers();
  if (users.some(u => u.email === email)) return alert("User with this email already exists!");

  const newUser = {
    name,
    email,
    passwordHash: hashPassword(password),
    avatar: "/images/proff.png",
    isVerified: false,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  setLoggedInUser(newUser);
  showUserAvatar(newUser);
  closeCustomModal('registerModal');
  alert("Registration successful!");
}

function loginUser() {
  const email = document.querySelector('#loginModal input[placeholder="Email"]').value.trim();
  const password = document.querySelector('#loginModal input[placeholder="Password"]').value;

  if (!email || !password) return alert("Please fill in all fields!");

  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user) return alert("User not found. Please register first.");
  if (user.googleId) return alert("This email is registered via Google. Use Google Sign-In.");
  if (user.passwordHash !== hashPassword(password)) return alert("Incorrect password!");

  setLoggedInUser(user);
  showUserAvatar(user);
  const settingsBtn = document.querySelector('.open-settings');
  if (settingsBtn) {
    settingsBtn.classList.add('disabled');
  }
  closeCustomModal('loginModal');
  alert(`Welcome back, ${user.name}!`);
}

function updateProfile() {
  const user = getLoggedInUser();
  if (!user) return alert("You need to be logged in to update profile");

  const newName = document.getElementById('profileName').value.trim();
  const newEmail = document.getElementById('profileEmail').value.trim();

  if (!newName || !newEmail) return alert("Please fill in all fields!");
  if (!isValidEmail(newEmail)) return alert("Please enter a valid email address!");

  const users = getUsers();
  // Перевірка, чи не зайнята нова пошта іншим користувачем (окрім себе)
  const emailTaken = users.some(u => u.email === newEmail && u.email !== user.email);
  if (emailTaken) return alert("This email is already in use!");

  // Оновлюємо інформацію користувача
  const index = users.findIndex(u => u.email === user.email);
  if (index === -1) return alert("User not found!");

  const updatedUser = { ...users[index], name: newName, email: newEmail };

  // Якщо змінили аватар
  if (window.newAvatarDataUrl) {
    updatedUser.avatar = window.newAvatarDataUrl;
    window.newAvatarDataUrl = null; // скидаємо тимчасове зображення
  }

  users[index] = updatedUser;
  saveUsers(users);
  setLoggedInUser(updatedUser);
  showUserAvatar(updatedUser);
  closeCustomModal('profileModal');
  alert("Profile updated successfully!");
}

// Прив’язуємо кнопку "Save changes" до цієї функції при ініціалізації
document.getElementById('saveProfileBtn').addEventListener('click', updateProfile);


// ========== ІНІЦІАЛІЗАЦІЯ ==========

document.addEventListener('DOMContentLoaded', () => {
  google.accounts.id.initialize({
    client_id: '238421477272-pu0ir2se3niflvo1h7b9fqmldc53clqr.apps.googleusercontent.com',
    callback: handleGoogleCredentialResponse
  });

  google.accounts.id.renderButton(
    document.getElementById('googleSignInLoginDiv'),
    { theme: 'outline', size: 'large', width: 240 }
  );

  google.accounts.id.renderButton(
    document.getElementById('googleSignInRegisterDiv'),
    { theme: 'outline', size: 'large', width: 240 }
  );

  const currentUser = getLoggedInUser();
  if (currentUser) {
    showUserAvatar(currentUser);
    const settingsBtn = document.querySelector('.open-settings');
    if (settingsBtn) {
      settingsBtn.classList.add('disabled');
    }
  } else {
    showAuthButtons();
  }

  document.getElementById('avatarInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Avatar image must be less than 2MB");

    const reader = new FileReader();
    reader.onload = function (ev) {
      document.getElementById('profileAvatar').src = ev.target.result;
      window.newAvatarDataUrl = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btnlog').onclick = () => openCustomModal('loginModal');
  document.getElementById('btnsing').onclick = () => openCustomModal('registerModal');
  document.getElementById('logoutBtn').onclick = logoutUser;
  document.getElementById('userAvatar').addEventListener('click', () => openCustomModal('profileModal'));
  document.getElementById('profileAvatarContainer').addEventListener('click', function () {
    document.getElementById('avatarInput').click();
  });

  // Відкриття модалки "New Card" по кліку на кнопку з класом btnnn
  const newCardBtn = document.querySelector('.btnnn');
  if (newCardBtn) {
    newCardBtn.addEventListener('click', () => openCustomModal('newCardModal'));
  }

  // Прикріплення обробників для кнопок Send, History, Update
  document.getElementById('btn1').addEventListener('click', () => openCustomModal('sendModal'));
  document.getElementById('btn2').addEventListener('click', () => openCustomModal('historyModal'));
 
  setTheme('dark');
});
document.getElementById('togglePasswordBtn').addEventListener('click', () => {
  const pwdInput = document.getElementById('profilePassword');
  const btn = document.getElementById('togglePasswordBtn');
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    btn.textContent = 'Hide';
  } else {
    pwdInput.type = 'password';
    btn.textContent = 'Show';
  }
});

