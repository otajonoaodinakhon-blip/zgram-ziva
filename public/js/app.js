/* ==========================================================================
   MAIN Z GRAM CONTROLLER (FOLLOW/UNFOLLOW SYSTEM & USERS DISCOVERY)
   ========================================================================== */

const App = {
  activeTab: 'feed',
  selectedPostMedia: null,
  selectedIsVideo: false,
  storyTimer: null,
  activeCommentPostId: null,

  init() {
    this.checkAuthentication();
    this.bindEvents();
    this.renderHeaderAndUser();
    this.renderStories();
    this.renderFeed();
  },

  checkAuthentication() {
    if (!Store.currentUser) {
      this.openAuthModal();
    } else {
      this.closeModal('auth-modal');
    }
  },

  openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('open');
  },

  handleSignUp(e) {
    if (e) e.preventDefault();
    const username = document.getElementById('auth-signup-username').value;
    const pass = document.getElementById('auth-signup-pass').value;
    const name = document.getElementById('auth-signup-fullname').value;
    const avatar = document.getElementById('auth-signup-avatar-preview-url')?.value;

    if (Store.signUp(username, pass, name, avatar)) {
      if (window.Toast) Toast.show(`Z gram'ga xush kelibsiz, @${Store.currentUser.username}!`, 'success');
      this.closeModal('auth-modal');
      window.location.reload();
    }
  },

  handleLogin(e) {
    if (e) e.preventDefault();
    const username = document.getElementById('auth-login-username').value;
    const pass = document.getElementById('auth-login-pass').value;

    if (Store.login(username, pass)) {
      if (window.Toast) Toast.show(`Xush kelibsiz, @${Store.currentUser.username}!`, 'success');
      this.closeModal('auth-modal');
      window.location.reload();
    }
  },

  switchAuthTab(tab) {
    const loginForm = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');
    const btnLoginTab = document.getElementById('btn-auth-tab-login');
    const btnSignupTab = document.getElementById('btn-auth-tab-signup');

    if (tab === 'signup') {
      loginForm.style.display = 'none';
      signupForm.style.display = 'flex';
      btnSignupTab.classList.add('active');
      btnLoginTab.classList.remove('active');
    } else {
      signupForm.style.display = 'none';
      loginForm.style.display = 'flex';
      btnLoginTab.classList.add('active');
      btnSignupTab.classList.remove('active');
    }
  },

  bindEvents() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) this.switchTab(targetTab);
      });
    });

    const fileInput = document.getElementById('new-post-file-input');
    const previewImg = document.getElementById('new-post-image-preview');
    const previewVideo = document.getElementById('new-post-video-preview');

    if (fileInput) {
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const media = await Store.convertMediaFileToBase64(file);
            this.selectedPostMedia = media.mediaUrl;
            this.selectedIsVideo = media.isVideo;

            if (media.isVideo) {
              if (previewImg) previewImg.style.display = 'none';
              if (previewVideo) {
                previewVideo.src = media.mediaUrl;
                previewVideo.style.display = 'block';
              }
            } else {
              if (previewVideo) previewVideo.style.display = 'none';
              if (previewImg) {
                previewImg.src = media.mediaUrl;
                previewImg.style.display = 'block';
              }
            }
          } catch (err) {
            if (window.Toast) Toast.show('Media faylini yuklashda xatolik!', 'error');
          }
        }
      };
    }

    const avatarInput = document.getElementById('edit-profile-avatar-file');
    const avatarPreview = document.getElementById('edit-profile-avatar-preview');

    if (avatarInput && avatarPreview) {
      avatarInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const media = await Store.convertMediaFileToBase64(file);
            avatarPreview.src = media.mediaUrl;
            avatarPreview.setAttribute('data-base64', media.mediaUrl);
          } catch (err) {
            if (window.Toast) Toast.show('Profil rasmini yuklashda xatolik!', 'error');
          }
        }
      };
    }

    document.getElementById('btn-create-post-modal')?.addEventListener('click', () => this.openCreatePostModal());
    document.getElementById('btn-open-admin')?.addEventListener('click', () => {
      if (!AdminController.isAdminActive) {
        AdminController.toggleAdminMode();
      } else {
        AdminController.renderDashboardModal();
      }
    });

    document.getElementById('btn-switch-user')?.addEventListener('click', () => {
      if (window.Toast) {
        Toast.confirm('Chiqish', 'Profilingizdan chiqmoqchimisiz?', () => Store.logout());
      } else {
        Store.logout();
      }
    });
  },

  renderHeaderAndUser() {
    const userCard = document.getElementById('sidebar-user-card');
    if (userCard && Store.currentUser) {
      userCard.querySelector('img').src = Store.currentUser.avatar;
      const isVerified = Store.isVerified(Store.currentUser.username);
      userCard.querySelector('.username').innerHTML = `@${Store.currentUser.username} ${isVerified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}`;
      userCard.querySelector('.user-role').textContent = Store.currentUser.role === 'admin' ? '⚡ Admin' : Store.currentUser.fullName;
    }

    const adminBtnLabel = document.getElementById('admin-btn-label');
    if (adminBtnLabel) {
      adminBtnLabel.textContent = AdminController.isAdminActive ? 'Z Admin Paneli' : 'Admin Kirish';
    }
  },

  switchTab(tabName) {
    if (!Store.currentUser) {
      this.openAuthModal();
      return;
    }
    this.activeTab = tabName;
    document.querySelectorAll('.nav-item').forEach(li => li.classList.remove('active'));
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(btn => {
      btn.closest('.nav-item')?.classList.add('active');
    });

    const feedSection = document.getElementById('feed-section');
    const exploreSection = document.getElementById('explore-section');
    const profileSection = document.getElementById('profile-section');
    const chatSection = document.getElementById('chat-section');

    if (feedSection) feedSection.style.display = 'none';
    if (exploreSection) exploreSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (chatSection) chatSection.style.display = 'none';

    if (tabName === 'feed') {
      if (feedSection) feedSection.style.display = 'block';
      this.renderFeed();
    } else if (tabName === 'explore') {
      if (exploreSection) exploreSection.style.display = 'block';
      this.renderExploreUsers();
    } else if (tabName === 'profile') {
      if (profileSection) profileSection.style.display = 'block';
      this.renderProfile();
    } else if (tabName === 'chat') {
      if (chatSection) chatSection.style.display = 'block';
      this.renderChat();
    }
  },

  renderStories() {
    const wrapper = document.getElementById('stories-container');
    if (!wrapper) return;

    let html = '';
    if (Store.currentUser) {
      html += `
        <div class="story-item add-story" onclick="App.openAddStoryPrompt()">
          <div class="story-avatar-ring">
            <img src="${Store.currentUser.avatar}" alt="User" />
            <i class="fas fa-plus plus-icon"></i>
          </div>
          <span class="story-username">Story qo'shish</span>
        </div>
      `;
    }

    Store.stories.forEach(st => {
      const isVerified = Store.isVerified(st.username);
      html += `
        <div class="story-item" onclick="App.viewStory('${st.id}')">
          <div class="story-avatar-ring">
            <img src="${st.avatar}" alt="${st.username}" />
          </div>
          <span class="story-username">${st.username} ${isVerified ? '☑️' : ''}</span>
        </div>
      `;
    });

    wrapper.innerHTML = html;
  },

  openAddStoryPrompt() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const media = await Store.convertMediaFileToBase64(file);
        const newStory = {
          id: 'st_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          username: Store.currentUser.username,
          avatar: Store.currentUser.avatar,
          mediaUrl: media.mediaUrl,
          isVideo: media.isVideo
        };
        Store.stories.push(newStory);
        Store.saveStories();
        this.renderStories();
        if (window.Toast) Toast.show('✅ Story Z gram\'ga yuklandi!', 'success');
      }
    };
    fileInput.click();
  },

  viewStory(storyId) {
    const story = Store.stories.find(s => s.id === storyId);
    if (!story) return;

    const modal = document.getElementById('story-viewer-modal');
    if (!modal) return;

    const avatar = modal.querySelector('#story-viewer-avatar');
    const authorName = modal.querySelector('#story-viewer-author');
    const mediaContainer = modal.querySelector('#story-viewer-media');
    const progressFill = modal.querySelector('#story-viewer-progress-fill');

    if (avatar) avatar.src = story.avatar;
    if (authorName) {
      const isVerified = Store.isVerified(story.username);
      authorName.innerHTML = `@${story.username} ${isVerified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}`;
    }

    if (mediaContainer) {
      if (story.isVideo) {
        mediaContainer.innerHTML = `<video src="${story.mediaUrl}" autoplay loop playsinline></video>`;
      } else {
        mediaContainer.innerHTML = `<img src="${story.mediaUrl}" alt="Story Media" />`;
      }
    }

    if (progressFill) progressFill.style.width = '0%';
    modal.classList.add('open');

    let startTime = Date.now();
    const duration = 5000;
    if (this.storyTimer) clearInterval(this.storyTimer);

    this.storyTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      if (progressFill) progressFill.style.width = `${pct}%`;

      if (elapsed >= duration) {
        clearInterval(this.storyTimer);
        this.closeStoryViewer();
      }
    }, 50);
  },

  closeStoryViewer() {
    if (this.storyTimer) clearInterval(this.storyTimer);
    const modal = document.getElementById('story-viewer-modal');
    if (modal) modal.classList.remove('open');
  },

  renderFeed() {
    const feed = document.getElementById('feed-posts-list');
    if (!feed) return;

    const posts = Store.getFeedPosts();
    if (posts.length === 0) {
      feed.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <img src="z.png" style="width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.8;" />
          <h3 style="font-family: var(--font-heading); margin-bottom: 8px;">Z gram'da hali post yo'q</h3>
          <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">Birinchi bo'lib rasm yoki video ulashing!</p>
          <button onclick="App.openCreatePostModal()" style="background: var(--insta-gradient); color: white; padding: 12px 24px; border-radius: var(--radius-full); font-weight: 600;">
            <i class="fas fa-plus"></i> Post Yaratish
          </button>
        </div>
      `;
      return;
    }

    feed.innerHTML = posts.map(post => {
      const isLiked = Store.currentUser ? post.likes.includes(Store.currentUser.username) : false;
      const isVerified = Store.isVerified(post.authorName);
      const isFollowing = Store.isFollowing(post.authorName);
      const isSelf = Store.currentUser && post.authorName === Store.currentUser.username;
      const isVideo = post.isVideo || (post.mediaUrl && (post.mediaUrl.startsWith('data:video') || post.mediaUrl.endsWith('.mp4')));

      return `
        <div class="post-card" id="card-${post.id}">
          <div class="post-header">
            <div class="post-author" onclick="App.openUserProfile('${post.authorName}')">
              <img src="${post.authorAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + post.authorName}" alt="${post.authorName}" />
              <div>
                <div class="author-name">
                  @${post.authorName} ${isVerified ? '<i class="fas fa-check-circle verified-badge" title="Rasmiy Tasdiqlangan"></i>' : ''}
                </div>
                <div class="post-time">${new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px;">
              ${!isSelf ? `
                <button onclick="App.toggleFollow('${post.authorName}')" style="padding: 4px 12px; border-radius: var(--radius-full); font-size: 12px; font-weight: 600; ${isFollowing ? 'background: rgba(255,255,255,0.08); color: var(--text-secondary);' : 'background: var(--accent-color); color: black;'}">
                  ${isFollowing ? 'Obunadasiz' : '+ Obuna'}
                </button>
              ` : ''}
              <button class="post-actions-btn" onclick="App.showPostMenu('${post.id}', '${post.authorName}')">
                <i class="fas fa-ellipsis-h"></i>
              </button>
            </div>
          </div>

          <div class="post-media" ondblclick="App.handleDoubleTapLike('${post.id}', event)">
            ${isVideo ? `
              <video src="${post.mediaUrl}" controls playsinline loop preload="metadata"></video>
            ` : `
              <img src="${post.mediaUrl}" alt="Post Media" loading="lazy" />
            `}
            <i class="fas fa-heart double-click-heart"></i>
          </div>

          <div class="post-toolbar">
            <div class="left-toolbar">
              <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="App.toggleLike('${post.id}')">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
              </button>
              <button class="action-btn" onclick="App.openCommentsModal('${post.id}')">
                <i class="far fa-comment"></i>
              </button>
              <button class="action-btn" onclick="App.sharePost('${post.id}')">
                <i class="far fa-paper-plane"></i>
              </button>
            </div>
            <button class="action-btn"><i class="far fa-bookmark"></i></button>
          </div>

          <div class="likes-count">${post.likes.length} ta like</div>

          <div class="post-caption">
            <strong>@${post.authorName}</strong> ${post.caption}
          </div>

          <div class="post-quick-emojis">
            ${EmojiManager.packs.reactions.map(emoji => `
              <span class="emoji-pill" onclick="App.sendQuickEmojiReaction('${post.id}', '${emoji}', event)">${emoji}</span>
            `).join('')}
          </div>

          <div style="padding: 4px 16px 10px;">
            <button onclick="App.openCommentsModal('${post.id}')" style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">
              ${post.comments.length > 0 ? `Barcha ${post.comments.length} ta fikrni ko'rish...` : `Fikr qoldirish...`}
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // TOGGLE FOLLOW / UNFOLLOW ACTION
  toggleFollow(targetUsername) {
    if (!Store.currentUser) {
      this.openAuthModal();
      return;
    }
    targetUsername = targetUsername.toLowerCase().trim();
    const isFollowing = Store.isFollowing(targetUsername);

    if (isFollowing) {
      Store.unfollowUser(targetUsername);
      if (window.Toast) Toast.show(`@${targetUsername} dan obuna bekor qilindi`, 'info');
    } else {
      Store.followUser(targetUsername);
      if (window.Toast) Toast.show(`✅ @${targetUsername} ga obuna bo'ldingiz!`, 'success');
    }

    if (this.activeTab === 'feed') this.renderFeed();
    if (this.activeTab === 'profile') this.renderProfile();
    if (this.activeTab === 'explore') this.renderExploreUsers();
  },

  // RENDER EXPLORE / USERS DISCOVERY TAB
  renderExploreUsers() {
    const container = document.getElementById('explore-content');
    if (!container) return;

    const allUsers = Store.getAllUsersList();
    const currentUsername = Store.currentUser ? Store.currentUser.username : '';

    container.innerHTML = `
      <div style="max-width: 640px; margin: 20px auto; padding: 0 16px;">
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px;">
          <h3 style="font-family: var(--font-heading); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-users" style="color: var(--accent-color);"></i> Z gram Foydalanuvchilari
          </h3>
          <input type="text" id="search-users-input" onkeyup="App.filterUsersList()" placeholder="Foydalanuvchini izlash (@username yoki ism)..." style="width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius-full); font-size: 14px;" />
        </div>

        <div id="users-discovery-grid" style="display: flex; flex-direction: column; gap: 10px;">
          ${allUsers.length > 0 ? allUsers.map(usr => {
            const isSelf = usr.username === currentUsername;
            const isFollowing = Store.isFollowing(usr.username);
            const isVerified = Store.isVerified(usr.username);
            const followersCount = Store.getFollowersList(usr.username).length;

            return `
              <div class="user-card-item" data-search="${usr.username} ${usr.fullName}" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); border: 1px solid var(--border-color); padding: 14px 16px; border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <img src="${usr.avatar}" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);" />
                  <div>
                    <div style="font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 4px;">
                      ${usr.fullName} ${isVerified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                    </div>
                    <div style="color: var(--accent-color); font-size: 12px; font-weight: 600;">@${usr.username}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${followersCount} ta obunachi</div>
                  </div>
                </div>

                ${!isSelf ? `
                  <button onclick="App.toggleFollow('${usr.username}')" style="padding: 8px 18px; border-radius: var(--radius-full); font-size: 13px; font-weight: 600; ${isFollowing ? 'background: rgba(255,255,255,0.08); color: var(--text-secondary);' : 'background: var(--accent-color); color: black;'}">
                    ${isFollowing ? 'Obunadasiz' : '+ Obuna bo\'lish'}
                  </button>
                ` : '<span style="font-size: 12px; color: var(--text-secondary);">Siz</span>'}
              </div>
            `;
          }).join('') : `<div style="text-align: center; color: var(--text-secondary); padding: 30px;">Hali foydalanuvchilar mavjud emas</div>`}
        </div>
      </div>
    `;
  },

  filterUsersList() {
    const input = document.getElementById('search-users-input');
    if (!input) return;
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll('.user-card-item').forEach(card => {
      const searchData = card.getAttribute('data-search').toLowerCase();
      if (searchData.includes(q)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  },

  renderProfile() {
    const container = document.getElementById('profile-content');
    if (!container || !Store.currentUser) return;

    const username = Store.currentUser.username;
    const userPosts = Store.posts.filter(p => p.authorName === username);
    const isVerified = Store.isVerified(username);
    const followers = Store.getFollowersList(username);
    const following = Store.getFollowingList(username);

    container.innerHTML = `
      <div style="max-width: 740px; margin: 24px auto; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <img src="${Store.currentUser.avatar}" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-color);" />
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 22px; display: flex; align-items: center; gap: 6px;">
                ${Store.currentUser.fullName} ${isVerified ? '<i class="fas fa-check-circle verified-badge" style="font-size: 18px;"></i>' : ''}
              </h2>
              <div style="color: var(--accent-color); font-size: 14px; font-weight: 600;">@${Store.currentUser.username}</div>
              <p style="margin-top: 6px; font-size: 13px; color: var(--text-secondary);">${Store.currentUser.bio}</p>
            </div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="App.openEditProfileModal()" style="background: rgba(255,255,255,0.08); padding: 10px 16px; border-radius: var(--radius-md); font-weight: 600; font-size: 13px;">
              <i class="fas fa-edit"></i> Profilni Tahrirlash
            </button>
            <button onclick="Store.logout()" style="background: rgba(239,68,68,0.15); color: var(--danger); padding: 10px 16px; border-radius: var(--radius-md); font-weight: 600; font-size: 13px;">
              <i class="fas fa-sign-out-alt"></i> Chiqish
            </button>
          </div>
        </div>

        <div style="display: flex; gap: 24px; padding: 16px 0; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); margin-bottom: 24px;">
          <div><strong>${userPosts.length}</strong> <span style="color: var(--text-secondary);">postlar</span></div>
          <div style="cursor: pointer;" onclick="App.openFollowListModal('${username}', 'followers')">
            <strong style="color: var(--accent-color);">${followers.length}</strong> <span style="color: var(--text-secondary);">obunachilar</span>
          </div>
          <div style="cursor: pointer;" onclick="App.openFollowListModal('${username}', 'following')">
            <strong style="color: var(--accent-color);">${following.length}</strong> <span style="color: var(--text-secondary);">obunalar</span>
          </div>
        </div>

        <h4 style="margin-bottom: 14px; font-family: var(--font-heading);"><i class="fas fa-th"></i> Sizning Postlaringiz Grid</h4>
        ${userPosts.length > 0 ? `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px;">
            ${userPosts.map(p => `
              <div style="position: relative; height: 160px; border-radius: var(--radius-md); overflow: hidden; background: #000;">
                ${p.isVideo ? `<video src="${p.mediaUrl}" style="width: 100%; height: 100%; object-fit: cover;"></video>` : `<img src="${p.mediaUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`}
                <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.6); padding: 2px 8px; border-radius: 12px; font-size: 11px; color: white;">
                  <i class="fas fa-heart" style="color: #ef4444;"></i> ${p.likes.length}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 30px; color: var(--text-secondary); font-size: 13px;">
            Hali hech qanday post joylamagansiz.
          </div>
        `}
      </div>
    `;
  },

  openFollowListModal(username, type) {
    const list = type === 'followers' ? Store.getFollowersList(username) : Store.getFollowingList(username);
    const title = type === 'followers' ? 'Obunachilar' : 'Obunalar';

    const modal = document.getElementById('follow-list-modal');
    if (!modal) return;

    modal.querySelector('#follow-list-title').textContent = `${title} (${list.length})`;
    const body = modal.querySelector('#follow-list-container');

    if (list.length === 0) {
      body.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 13px;">Ro'yxat bo'sh</div>`;
    } else {
      const allUsers = Store.getAllUsersList();
      body.innerHTML = list.map(u => {
        const userObj = allUsers.find(usr => usr.username === u) || { username: u, fullName: u, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u}` };
        const isVerified = Store.isVerified(u);
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${userObj.avatar}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" />
              <div>
                <div style="font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                  @${u} ${isVerified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                </div>
                <div style="font-size: 11px; color: var(--text-secondary);">${userObj.fullName}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    modal.classList.add('open');
  },

  handleDoubleTapLike(postId, event) {
    if (!Store.currentUser) {
      this.openAuthModal();
      return;
    }
    Store.toggleLike(postId);
    this.renderFeed();

    const card = document.getElementById(`card-${postId}`);
    if (card) {
      const heart = card.querySelector('.double-click-heart');
      if (heart) {
        heart.classList.add('active');
        EmojiManager.triggerInteractiveBurst('❤️', event.clientX, event.clientY);
        setTimeout(() => heart.classList.remove('active'), 600);
      }
    }
  },

  toggleLike(postId) {
    if (!Store.currentUser) {
      this.openAuthModal();
      return;
    }
    Store.toggleLike(postId);
    this.renderFeed();
  },

  sendQuickEmojiReaction(postId, emoji, event) {
    if (!Store.currentUser) {
      this.openAuthModal();
      return;
    }
    EmojiManager.triggerInteractiveBurst(emoji, event.clientX, event.clientY);
    Store.addComment(postId, `${emoji}`);
    this.renderFeed();
  },

  openCommentsModal(postId) {
    this.activeCommentPostId = postId;
    this.renderCommentsModalContent(postId);
    const modal = document.getElementById('comments-modal');
    if (modal) modal.classList.add('open');
  },

  renderCommentsModalContent(postId) {
    const post = Store.posts.find(p => p.id === postId);
    if (!post) return;

    const container = document.getElementById('comments-modal-list');
    if (!container) return;

    if (post.comments.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 13px;">Hozircha hech qanday fikr bildirilmagan. Birinchi bo'ling!</div>`;
    } else {
      container.innerHTML = post.comments.map(c => {
        const isVerified = Store.isVerified(c.author);
        const isSelf = Store.currentUser && c.author === Store.currentUser.username;
        const isAdmin = AdminController.isAdminActive;

        return `
          <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
            <img src="${c.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + c.author}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;" />
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                @${c.author} ${isVerified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
              </div>
              <div style="font-size: 13px; margin-top: 2px;">${c.text}</div>
            </div>
            ${(isSelf || isAdmin) ? `
              <button onclick="App.deleteComment('${post.id}', '${c.id}')" style="color: var(--text-secondary); font-size: 12px; padding: 4px;"><i class="fas fa-trash"></i></button>
            ` : ''}
          </div>
        `;
      }).join('');
    }
  },

  submitModalComment() {
    if (!this.activeCommentPostId || !Store.currentUser) return;
    const input = document.getElementById('modal-comment-input');
    if (!input || !input.value.trim()) return;

    Store.addComment(this.activeCommentPostId, input.value.trim());
    input.value = '';
    this.renderCommentsModalContent(this.activeCommentPostId);
    this.renderFeed();
  },

  deleteComment(postId, commentId) {
    Store.deleteComment(postId, commentId);
    this.renderCommentsModalContent(postId);
    this.renderFeed();
    if (window.Toast) Toast.show('Fikr o\'chirildi', 'info');
  },

  toggleEmojiPickerForPost(postId, event) {
    const input = document.getElementById(`input-comment-${postId}`);
    const picker = EmojiManager.createPicker((selectedEmoji) => {
      if (typeof selectedEmoji === 'object' && selectedEmoji.url) {
        input.value += ` [${selectedEmoji.name}] `;
      } else {
        input.value += selectedEmoji;
      }
    });

    picker.style.position = 'fixed';
    picker.style.left = `${Math.min(event.clientX, window.innerWidth - 340)}px`;
    picker.style.top = `${Math.min(event.clientY - 300, window.innerHeight - 380)}px`;

    document.body.appendChild(picker);

    const closeHandler = (e) => {
      if (!picker.contains(e.target) && e.target !== event.target) {
        if (picker.parentNode) picker.parentNode.removeChild(picker);
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);
  },

  showPostMenu(postId, authorName) {
    if (!Store.currentUser) return;
    const isSelf = authorName === Store.currentUser.username;
    const isAdmin = AdminController.isAdminActive;

    if (isSelf || isAdmin) {
      if (window.Toast) {
        Toast.confirm('Postni o\'chirish', 'Ushbu postni o\'chirmoqchimisiz?', () => {
          Store.deletePostAdmin(postId);
          this.renderFeed();
          Toast.show('Post o\'chirildi', 'info');
        });
      }
    } else {
      if (window.Toast) {
        Toast.confirm('Foydalanuvchini bloklash', `@${authorName} ni bloklaysizmi?`, () => {
          Store.blockUser(authorName);
          this.renderFeed();
          Toast.show(`@${authorName} bloklandi`, 'warning');
        });
      }
    }
  },

  openCreatePostModal() {
    if (!Store.currentUser) {
      this.openAuthModal();
      return;
    }
    this.selectedPostMedia = null;
    this.selectedIsVideo = false;

    const previewImg = document.getElementById('new-post-image-preview');
    const previewVideo = document.getElementById('new-post-video-preview');
    if (previewImg) previewImg.style.display = 'none';
    if (previewVideo) previewVideo.style.display = 'none';

    const modal = document.getElementById('create-post-modal');
    if (modal) modal.classList.add('open');

    setTimeout(() => {
      const fileInput = document.getElementById('new-post-file-input');
      if (fileInput) fileInput.click();
    }, 150);
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  },

  submitNewPost() {
    const captionInput = document.getElementById('new-post-caption');

    if (!this.selectedPostMedia) {
      if (window.Toast) Toast.show('Iltimos kompyuteringiz/telefoningizdan rasm yoki video tanlang!', 'warning');
      return;
    }

    if (Store.createPost(this.selectedPostMedia, captionInput ? captionInput.value.trim() : '', this.selectedIsVideo)) {
      if (captionInput) captionInput.value = '';
      this.closeModal('create-post-modal');
      this.renderFeed();
      if (window.Toast) Toast.show('✅ Post Z gram\'ga muvaffaqiyatli ulashildi!', 'success');
    }
  },

  openEditProfileModal() {
    if (!Store.currentUser) return;
    document.getElementById('edit-profile-fullname').value = Store.currentUser.fullName;
    document.getElementById('edit-profile-bio').value = Store.currentUser.bio;
    const avatarPreview = document.getElementById('edit-profile-avatar-preview');
    if (avatarPreview) {
      avatarPreview.src = Store.currentUser.avatar;
      avatarPreview.removeAttribute('data-base64');
    }
    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.classList.add('open');
  },

  saveProfileChanges() {
    const fullName = document.getElementById('edit-profile-fullname').value;
    const bio = document.getElementById('edit-profile-bio').value;
    const avatarPreview = document.getElementById('edit-profile-avatar-preview');
    const newAvatar = avatarPreview ? (avatarPreview.getAttribute('data-base64') || Store.currentUser.avatar) : Store.currentUser.avatar;

    if (Store.updateProfile(fullName, newAvatar, bio)) {
      this.closeModal('edit-profile-modal');
      this.renderHeaderAndUser();
      this.renderProfile();
      if (window.Toast) Toast.show('Profil tahrirlandi!', 'success');
    }
  },

  renderChat() {
    const chatContainer = document.getElementById('chat-content');
    if (!chatContainer || !Store.currentUser) return;

    chatContainer.innerHTML = `
      <div class="chat-container">
        <div class="chat-users-list">
          <div class="chat-user-item active">
            <img src="z.png" style="width: 36px; height: 36px; border-radius: 50%; object-fit: contain; background: rgba(255,255,255,0.08); padding: 4px;" />
            <div>
              <div style="font-weight: 600; font-size: 13px;">Z Chat (Umumiy Live)</div>
              <div style="font-size: 11px; color: var(--success);"><i class="fas fa-circle" style="font-size: 8px;"></i> Real-vaqt P2P online</div>
            </div>
          </div>
        </div>

        <div class="chat-messages-area">
          <div class="chat-messages-log" id="chat-log-box"></div>

          <div class="chat-input-bar">
            <input type="text" id="chat-message-input" placeholder="Z Chat'da xabar yozing..." onkeypress="if(event.key==='Enter') App.sendChatMessage()" />
            <button onclick="App.sendChatMessage()" style="color: var(--accent-color); font-weight: 600;">Yuborish</button>
          </div>
        </div>
      </div>
    `;

    this.renderChatLogOnly();
  },

  renderChatLogOnly() {
    const chatLogBox = document.getElementById('chat-log-box');
    if (!chatLogBox) return;

    chatLogBox.innerHTML = Store.messages.map(m => {
      const isVerified = Store.isVerified(m.sender);
      const isSelf = Store.currentUser && m.sender === Store.currentUser.username;
      return `
        <div class="msg-bubble ${isSelf ? 'sent' : 'received'}">
          <div style="font-size: 11px; opacity: 0.85; font-weight: 700; margin-bottom: 2px;">
            @${m.sender} ${isVerified ? '<i class="fas fa-check-circle verified-badge" style="color: white; font-size: 11px;"></i>' : ''}
          </div>
          ${m.text}
        </div>
      `;
    }).join('');

    chatLogBox.scrollTop = chatLogBox.scrollHeight;
  },

  sendChatMessage() {
    const input = document.getElementById('chat-message-input');
    if (!input || !input.value.trim() || !Store.currentUser) return;

    const newMsg = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      sender: Store.currentUser.username,
      text: input.value.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    Store.messages.push(newMsg);
    Store.saveMessages();
    input.value = '';
    this.renderChatLogOnly();
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
