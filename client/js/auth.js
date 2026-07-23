/**
 * Authentication & Session Management Module
 */

const Auth = {
  getToken() {
    return localStorage.getItem('token');
  },

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  setSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 500);
  },

  requireAuth() {
    const token = this.getToken();
    if (!token) {
      window.location.href = '/login.html';
    }
  },

  redirectIfAuth() {
    const token = this.getToken();
    if (token) {
      window.location.href = '/feed.html';
    }
  },

  async syncCurrentUser() {
    try {
      if (!this.getToken()) return null;
      const user = await API.get('/auth/me');
      this.setUser(user);
      this.updateNavbarUser(user);
      return user;
    } catch (err) {
      console.error('Failed to sync user session:', err);
      return null;
    }
  },

  updateNavbarUser(user) {
    const navAvatar = document.getElementById('nav-user-avatar');
    if (navAvatar && user) {
      navAvatar.src = user.profilePicture || '/uploads/default-avatar.svg';
    }
  }
};

// Global Logout Bindings
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  }

  // Auto-sync navbar profile avatar if logged in
  if (Auth.getToken()) {
    const user = Auth.getUser();
    if (user) {
      Auth.updateNavbarUser(user);
    }
  }
});
