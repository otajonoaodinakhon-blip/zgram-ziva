/* ==========================================================================
   ADMIN PANEL MODERATION & GLOBAL CHAT PURGE MANAGEMENT
   ========================================================================== */

const AdminController = {
  isAdminActive: false,

  init() {
    this.checkAdminStatus();
  },

  checkAdminStatus() {
    if (Store.currentUser && Store.currentUser.role === 'admin') {
      this.isAdminActive = true;
    }
  },

  isUserLockedFromAdmin() {
    if (!Store.currentUser) return true;
    const lockKey = `admin_lock_${Store.currentUser.username}`;
    return localStorage.getItem(lockKey) === 'true';
  },

  getFailedAttemptsCount() {
    if (!Store.currentUser) return 0;
    const attemptKey = `admin_attempts_${Store.currentUser.username}`;
    return parseInt(localStorage.getItem(attemptKey) || '0', 10);
  },

  incrementFailedAttempts() {
    if (!Store.currentUser) return;
    const attempts = this.getFailedAttemptsCount() + 1;
    const attemptKey = `admin_attempts_${Store.currentUser.username}`;
    localStorage.setItem(attemptKey, attempts.toString());

    if (attempts >= 3) {
      const lockKey = `admin_lock_${Store.currentUser.username}`;
      localStorage.setItem(lockKey, 'true');
      if (window.Toast) {
        Toast.show('⛔ Siz 3 marta noto\'g\'ri PIN kiritdingiz! Ushbu profil uchun Admin paneli butunlay bloklandi!', 'error', 5000);
      }
    } else {
      const remaining = 3 - attempts;
      if (window.Toast) {
        Toast.show(`❌ Noto'g'ri PIN! Qolgan urinishlar soni: ${remaining} ta`, 'warning');
      }
    }
  },

  toggleAdminMode() {
    if (!Store.currentUser) {
      if (window.App) window.App.openAuthModal();
      return;
    }

    if (this.isUserLockedFromAdmin()) {
      if (window.Toast) {
        Toast.show('⛔ Ushbu profil parolni 3 marta noto\'g\'ri kiritgani sababli Admin panelidan butunlay bloklangan!', 'error', 5000);
      }
      return;
    }

    if (this.isAdminActive) {
      Store.currentUser.role = 'user';
      Store.saveSession();
      this.isAdminActive = false;
      if (window.Toast) Toast.show('Admin rejimidan chiqildi.', 'info');
      window.location.reload();
    } else {
      let pinInput = document.getElementById('admin-pin-input')?.value;
      if (!pinInput) {
        this.openAdminPinModal();
        return;
      }

      if (pinInput === '1234') {
        const attemptKey = `admin_attempts_${Store.currentUser.username}`;
        localStorage.removeItem(attemptKey);

        Store.currentUser.role = 'admin';
        Store.saveSession();
        this.isAdminActive = true;
        if (window.Toast) Toast.show('✅ Admin rejimi faollashdi!', 'success');
        this.closePinModal();
        window.location.reload();
      } else {
        this.incrementFailedAttempts();
        const pinElement = document.getElementById('admin-pin-input');
        if (pinElement) pinElement.value = '';
      }
    }
  },

  openAdminPinModal() {
    if (this.isUserLockedFromAdmin()) {
      if (window.Toast) {
        Toast.show('⛔ Siz 3 marta noto\'g\'ri PIN kiritgansiz! Admin paneli siz uchun bloklangan.', 'error', 5000);
      }
      return;
    }
    let backdrop = document.getElementById('admin-pin-modal');
    if (backdrop) backdrop.classList.add('open');
  },

  closePinModal() {
    let backdrop = document.getElementById('admin-pin-modal');
    if (backdrop) backdrop.classList.remove('open');
  },

  renderDashboardModal() {
    const backdrop = document.getElementById('admin-modal');
    if (!backdrop) return;

    const statsGrid = backdrop.querySelector('#admin-stats-container');
    const postsTableBody = backdrop.querySelector('#admin-posts-table tbody');
    const bannedTableBody = backdrop.querySelector('#admin-banned-table tbody');
    const verifiedTableBody = backdrop.querySelector('#admin-verified-table tbody');

    // 1. Stats calculation
    const totalPosts = Store.posts.length;
    const totalLikes = Store.posts.reduce((acc, p) => acc + p.likes.length, 0);
    const bannedCount = Store.bannedUsers.length;

    statsGrid.innerHTML = `
      <div class="stat-box">
        <div class="number">${totalPosts}</div>
        <div class="label">Jami Postlar</div>
      </div>
      <div class="stat-box">
        <div class="number">${totalLikes}</div>
        <div class="label">Jami Likelar</div>
      </div>
      <div class="stat-box">
        <div class="number" style="color: var(--danger);">${bannedCount}</div>
        <div class="label">Taqiqlangan (Banned)</div>
      </div>
    `;

    // 2. Posts Moderation Table
    postsTableBody.innerHTML = Store.posts.map(post => `
      <tr>
        <td><strong>@${post.authorName}</strong> ${Store.isVerified(post.authorName) ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}</td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${post.caption || 'Media post'}</td>
        <td>${new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td>
          <button class="btn-danger" onclick="AdminController.deletePost('${post.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="4">Postlar yo\'q</td></tr>';

    // 3. Banned Users Table
    bannedTableBody.innerHTML = Store.bannedUsers.map(username => `
      <tr>
        <td><strong>@${username}</strong></td>
        <td><span style="color: var(--danger);">O'chirilgan & Banned</span></td>
        <td>
          <button class="btn-secondary" onclick="AdminController.unbanUser('${username}')">Taqiqni olish</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="3">Taqiqlanganlar yo\'q</td></tr>';

    // 4. Verified Badges Table
    if (verifiedTableBody) {
      verifiedTableBody.innerHTML = Store.verifiedUsers.map(username => `
        <tr>
          <td><strong>@${username}</strong> <i class="fas fa-check-circle verified-badge"></i></td>
          <td><span style="color: var(--accent-color);">Rasmiy Verified</span></td>
          <td>
            <button class="btn-secondary" onclick="AdminController.toggleVerify('${username}')">Belgini olib tashlash</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="3">Rasmiy belgilanganlar yo\'q</td></tr>';
    }

    backdrop.classList.add('open');
  },

  closeModal() {
    const backdrop = document.getElementById('admin-modal');
    if (backdrop) backdrop.classList.remove('open');
  },

  // CLEAR CHAT MESSAGES HISTORY (GLOBAL ADMIN ACTION)
  clearChatPrompt() {
    if (window.Toast) {
      Toast.confirm('Z Chat Tarixini Butunlay Tozalash', 'Barcha foydalanuvchilarning Z Chat xabarlarini to\'liq o\'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo\'lmaydi!', () => {
        Store.clearAllMessagesAdmin();
        if (window.Toast) Toast.show('✅ Z Chat tarixi butunlay tozalandi!', 'success');
        if (window.App && window.App.activeTab === 'chat') {
          window.App.renderChatLogOnly();
        }
      });
    }
  },

  deletePost(postId) {
    if (window.Toast) {
      Toast.confirm('Postni o\'chirish', 'Ushbu postni butunlay o\'chirmoqchimisiz?', () => {
        Store.deletePostAdmin(postId);
        this.renderDashboardModal();
        if (window.App) window.App.renderFeed();
        Toast.show('Post o\'chirildi!', 'success');
      });
    }
  },

  banUserPrompt() {
    const usernameInput = document.getElementById('admin-action-username');
    if (!usernameInput || !usernameInput.value.trim()) {
      if (window.Toast) Toast.show('Iltimos username kiriting!', 'warning');
      return;
    }
    const username = usernameInput.value.trim().toLowerCase();
    
    if (window.Toast) {
      Toast.confirm('Akkauntni Butunlay O\'chirish & Taqiqlash', `@${username} akkauntini va barcha postlarini butunlay yo'qotmoqchimisiz?`, () => {
        Store.banUserGlobally(username);
        usernameInput.value = '';
        if (window.Toast) Toast.show(`@${username} akkaunti butunlay o'chirildi va taqiqlandi!`, 'success');
        this.renderDashboardModal();
        if (window.App) {
          window.App.renderFeed();
          window.App.renderProfile();
          window.App.renderExploreUsers();
        }
      });
    }
  },

  toggleVerifyPrompt() {
    const usernameInput = document.getElementById('admin-verify-username');
    if (!usernameInput || !usernameInput.value.trim()) {
      if (window.Toast) Toast.show('Iltimos username kiriting!', 'warning');
      return;
    }
    const username = usernameInput.value.trim().toLowerCase();
    Store.toggleVerifyUser(username);
    usernameInput.value = '';
    const isNowVerified = Store.isVerified(username);
    if (window.Toast) {
      Toast.show(`@${username} ga Verified ko'k nishon ${isNowVerified ? 'berildi! ✅' : 'olib tashlandi!'}`, 'success');
    }
    this.renderDashboardModal();
    if (window.App) {
      window.App.renderFeed();
      window.App.renderProfile();
      window.App.renderExploreUsers();
      window.App.renderChatLogOnly();
    }
  },

  toggleVerify(username) {
    Store.toggleVerifyUser(username);
    const isNowVerified = Store.isVerified(username);
    if (window.Toast) {
      Toast.show(`@${username} ga Verified ko'k nishon ${isNowVerified ? 'berildi! ✅' : 'olib tashlandi!'}`, 'info');
    }
    this.renderDashboardModal();
    if (window.App) {
      window.App.renderFeed();
      window.App.renderProfile();
      window.App.renderExploreUsers();
      window.App.renderChatLogOnly();
    }
  },

  unbanUser(username) {
    Store.unbanUserGlobally(username);
    if (window.Toast) Toast.show(`@${username} taqiqdan chiqarildi!`, 'info');
    this.renderDashboardModal();
    if (window.App) window.App.renderFeed();
  }
};

window.AdminController = AdminController;
AdminController.init();
