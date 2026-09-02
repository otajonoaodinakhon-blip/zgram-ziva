/* ==========================================================================
   Z GRAM STATE ENGINE (WITH ADMIN CHAT PURGE & REALTIME SYNC)
   ========================================================================== */

const Store = {
  gun: null,
  currentUser: null,
  posts: [],
  users: {},
  blockedUsers: [],
  bannedUsers: [],
  verifiedUsers: ['admin'],
  messages: [],
  stories: [],
  followGraph: {},
  listenersBound: false,

  init() {
    try {
      if (typeof Gun !== 'undefined') {
        const relayUrl = `${location.protocol}//${location.host}/gun`;
        this.gun = Gun([relayUrl]);
        console.log('⚡ GunDB P2P Relay Connected:', relayUrl);
      }
    } catch (e) {
      console.warn('GunDB running in LocalStorage fallback mode:', e);
    }

    this.loadCurrentSession();
    this.loadInitialData();

    if (this.gun && !this.listenersBound) {
      this.bindRealtimeGunListeners();
      this.listenersBound = true;
    }
  },

  loadCurrentSession() {
    const saved = localStorage.getItem('insta_current_user');
    if (saved) {
      const user = JSON.parse(saved);
      if (this.isBanned(user.username)) {
        this.logout();
        return;
      }
      this.currentUser = user;
    } else {
      this.currentUser = null;
    }
  },

  saveSession() {
    if (this.currentUser) {
      localStorage.setItem('insta_current_user', JSON.stringify(this.currentUser));
      if (this.gun) {
        this.gun.get('users_v3').get(this.currentUser.username).put(JSON.stringify(this.currentUser));
      }
    } else {
      localStorage.removeItem('insta_current_user');
    }
  },

  signUp(username, password, fullName, avatar) {
    username = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (!username || !password) {
      if (window.Toast) Toast.show('Username va parol kiritilishi shart!', 'error');
      return false;
    }

    if (this.isBanned(username)) {
      if (window.Toast) Toast.show('Bu username admin tomonidan taqiqlangan!', 'error');
      return false;
    }

    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    const newUser = {
      id: 'usr_' + Date.now(),
      username: username,
      password: password,
      fullName: fullName.trim() || username,
      avatar: defaultAvatar,
      bio: 'Z gram da yangi foydalanuvchi ✨',
      role: username === 'admin' ? 'admin' : 'user',
      createdAt: Date.now()
    };

    const savedUsers = JSON.parse(localStorage.getItem('insta_users_db') || '{}');
    if (savedUsers[username]) {
      if (window.Toast) Toast.show('Bu username band! Boshqa nom tanlang.', 'warning');
      return false;
    }

    savedUsers[username] = newUser;
    localStorage.setItem('insta_users_db', JSON.stringify(savedUsers));

    if (this.gun) {
      this.gun.get('users_v3').get(username).put(JSON.stringify(newUser));
    }

    this.followGraph[username] = { followers: [], following: [] };
    this.saveFollowGraph();

    if (username === 'admin') {
      this.toggleVerifyUser('admin', true);
    }

    this.currentUser = newUser;
    this.saveSession();
    return true;
  },

  login(username, password) {
    username = username.toLowerCase().trim();
    if (this.isBanned(username)) {
      if (window.Toast) Toast.show('Bu username admin tomonidan taqiqlangan!', 'error');
      return false;
    }

    const savedUsers = JSON.parse(localStorage.getItem('insta_users_db') || '{}');
    const user = savedUsers[username];

    if (!user) {
      if (window.Toast) Toast.show('Bunday foydalanuvchi topilmadi! Ro\'yxatdan o\'ting.', 'error');
      return false;
    }

    if (user.password !== password) {
      if (window.Toast) Toast.show('Noto\'g\'ri parol!', 'error');
      return false;
    }

    this.currentUser = user;
    this.saveSession();
    return true;
  },

  updateProfile(fullName, avatar, bio) {
    if (!this.currentUser) return false;
    if (fullName) this.currentUser.fullName = fullName.trim();
    if (avatar) this.currentUser.avatar = avatar.trim();
    if (bio !== undefined) this.currentUser.bio = bio.trim();

    const savedUsers = JSON.parse(localStorage.getItem('insta_users_db') || '{}');
    savedUsers[this.currentUser.username] = this.currentUser;
    localStorage.setItem('insta_users_db', JSON.stringify(savedUsers));

    this.posts.forEach(p => {
      if (p.authorName === this.currentUser.username) {
        p.authorAvatar = this.currentUser.avatar;
      }
    });

    this.savePosts();
    this.saveSession();
    return true;
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('insta_current_user');
    window.location.reload();
  },

  loadInitialData() {
    this.blockedUsers = JSON.parse(localStorage.getItem('insta_blocked_users') || '[]');
    this.bannedUsers = JSON.parse(localStorage.getItem('insta_banned_users') || '[]');
    this.verifiedUsers = JSON.parse(localStorage.getItem('insta_verified_users') || '["admin"]');
    this.followGraph = JSON.parse(localStorage.getItem('insta_follow_graph') || '{}');

    const savedPosts = localStorage.getItem('insta_posts_db');
    this.posts = savedPosts ? JSON.parse(savedPosts) : [];

    const savedMsgs = localStorage.getItem('insta_messages');
    this.messages = savedMsgs ? JSON.parse(savedMsgs) : [];

    const savedStories = localStorage.getItem('insta_stories');
    this.stories = savedStories ? JSON.parse(savedStories) : [];
  },

  savePosts() {
    localStorage.setItem('insta_posts_db', JSON.stringify(this.posts));
    if (this.gun) {
      this.gun.get('instaposts_v3').put(JSON.stringify(this.posts));
    }
  },

  saveMessages() {
    localStorage.setItem('insta_messages', JSON.stringify(this.messages));
    if (this.gun) {
      this.gun.get('instamsgs_v3').put(JSON.stringify(this.messages));
    }
  },

  // ADMIN PURGE ALL CHAT MESSAGES GLOBALLY
  clearAllMessagesAdmin() {
    this.messages = [];
    localStorage.setItem('insta_messages', JSON.stringify([]));
    if (this.gun) {
      this.gun.get('instamsgs_v3').put(JSON.stringify([]));
    }
  },

  saveStories() {
    localStorage.setItem('insta_stories', JSON.stringify(this.stories));
    if (this.gun) {
      this.gun.get('instastories_v3').put(JSON.stringify(this.stories));
    }
  },

  saveFollowGraph() {
    localStorage.setItem('insta_follow_graph', JSON.stringify(this.followGraph));
    if (this.gun) {
      this.gun.get('instafollowers_v3').put(JSON.stringify(this.followGraph));
    }
  },

  saveVerifiedUsers() {
    localStorage.setItem('insta_verified_users', JSON.stringify(this.verifiedUsers));
    if (this.gun) {
      this.gun.get('instaverified_v3').put(JSON.stringify(this.verifiedUsers));
    }
  },

  saveBannedUsers() {
    localStorage.setItem('insta_banned_users', JSON.stringify(this.bannedUsers));
    if (this.gun) {
      this.gun.get('instabanned_v3').put(JSON.stringify(this.bannedUsers));
    }
  },

  bindRealtimeGunListeners() {
    if (!this.gun) return;

    this.gun.get('instamsgs_v3').on((data) => {
      if (data) {
        try {
          const remoteMsgs = JSON.parse(data);
          if (Array.isArray(remoteMsgs)) {
            this.messages = remoteMsgs;
            localStorage.setItem('insta_messages', JSON.stringify(remoteMsgs));
            if (window.App && window.App.activeTab === 'chat') {
              window.App.renderChatLogOnly();
            }
          }
        } catch (e) {}
      }
    });

    this.gun.get('instaposts_v3').on((data) => {
      if (data) {
        try {
          const remotePosts = JSON.parse(data);
          if (Array.isArray(remotePosts)) {
            this.posts = remotePosts;
            localStorage.setItem('insta_posts_db', JSON.stringify(remotePosts));
            if (window.App) {
              if (window.App.activeTab === 'feed') window.App.renderFeed();
              if (window.App.activeCommentPostId) window.App.renderCommentsModalContent(window.App.activeCommentPostId);
            }
          }
        } catch (e) {}
      }
    });

    this.gun.get('instastories_v3').on((data) => {
      if (data) {
        try {
          const remoteStories = JSON.parse(data);
          if (Array.isArray(remoteStories)) {
            this.stories = remoteStories;
            localStorage.setItem('insta_stories', JSON.stringify(remoteStories));
            if (window.App) window.App.renderStories();
          }
        } catch (e) {}
      }
    });

    this.gun.get('instafollowers_v3').on((data) => {
      if (data) {
        try {
          const remoteGraph = JSON.parse(data);
          if (remoteGraph && typeof remoteGraph === 'object') {
            this.followGraph = remoteGraph;
            localStorage.setItem('insta_follow_graph', JSON.stringify(remoteGraph));
            if (window.App) {
              if (window.App.activeTab === 'profile') window.App.renderProfile();
              if (window.App.activeTab === 'explore') window.App.renderExploreUsers();
            }
          }
        } catch (e) {}
      }
    });

    this.gun.get('instaverified_v3').on((data) => {
      if (data) {
        try {
          const remoteVerified = JSON.parse(data);
          if (Array.isArray(remoteVerified)) {
            this.verifiedUsers = remoteVerified;
            localStorage.setItem('insta_verified_users', JSON.stringify(remoteVerified));
            if (window.App) {
              if (window.App.activeTab === 'feed') window.App.renderFeed();
              if (window.App.activeTab === 'profile') window.App.renderProfile();
              if (window.App.activeTab === 'explore') window.App.renderExploreUsers();
              if (window.App.activeTab === 'chat') window.App.renderChatLogOnly();
            }
          }
        } catch (e) {}
      }
    });

    this.gun.get('instabanned_v3').on((data) => {
      if (data) {
        try {
          const remoteBanned = JSON.parse(data);
          if (Array.isArray(remoteBanned)) {
            this.bannedUsers = remoteBanned;
            localStorage.setItem('insta_banned_users', JSON.stringify(remoteBanned));
            if (window.App) window.App.renderFeed();
          }
        } catch (e) {}
      }
    });
  },

  toggleVerifyUser(username, forceStatus = null) {
    username = username.toLowerCase().trim();
    if (!username) return;

    const index = this.verifiedUsers.indexOf(username);

    if (forceStatus === true || (forceStatus === null && index === -1)) {
      if (!this.verifiedUsers.includes(username)) {
        this.verifiedUsers.push(username);
      }
    } else {
      this.verifiedUsers = this.verifiedUsers.filter(u => u !== username);
    }

    this.saveVerifiedUsers();

    if (window.App) {
      if (window.App.activeTab === 'feed') window.App.renderFeed();
      if (window.App.activeTab === 'profile') window.App.renderProfile();
      if (window.App.activeTab === 'explore') window.App.renderExploreUsers();
      if (window.App.activeTab === 'chat') window.App.renderChatLogOnly();
    }
  },

  isVerified(username) {
    if (!username) return false;
    return this.verifiedUsers.includes(username.toLowerCase().trim());
  },

  banUserGlobally(username) {
    username = username.toLowerCase().trim();
    if (!username) return;

    if (!this.bannedUsers.includes(username)) {
      this.bannedUsers.push(username);
      this.saveBannedUsers();
    }

    const savedUsers = JSON.parse(localStorage.getItem('insta_users_db') || '{}');
    if (savedUsers[username]) {
      delete savedUsers[username];
      localStorage.setItem('insta_users_db', JSON.stringify(savedUsers));
    }

    if (this.gun) {
      this.gun.get('users_v3').get(username).put(null);
    }

    this.posts = this.posts.filter(p => p.authorName !== username);
    this.savePosts();

    this.stories = this.stories.filter(s => s.username !== username);
    this.saveStories();

    if (this.currentUser && this.currentUser.username === username) {
      this.logout();
    }
  },

  unbanUserGlobally(username) {
    username = username.toLowerCase().trim();
    this.bannedUsers = this.bannedUsers.filter(u => u !== username);
    this.saveBannedUsers();
  },

  isBanned(username) {
    if (!username) return false;
    return this.bannedUsers.includes(username.toLowerCase().trim());
  },

  followUser(targetUsername) {
    if (!this.currentUser) return false;
    targetUsername = targetUsername.toLowerCase().trim();
    const currentUsername = this.currentUser.username;

    if (currentUsername === targetUsername) return false;

    if (!this.followGraph[currentUsername]) {
      this.followGraph[currentUsername] = { followers: [], following: [] };
    }
    if (!this.followGraph[targetUsername]) {
      this.followGraph[targetUsername] = { followers: [], following: [] };
    }

    if (!this.followGraph[currentUsername].following.includes(targetUsername)) {
      this.followGraph[currentUsername].following.push(targetUsername);
    }

    if (!this.followGraph[targetUsername].followers.includes(currentUsername)) {
      this.followGraph[targetUsername].followers.push(currentUsername);
    }

    this.saveFollowGraph();
    return true;
  },

  unfollowUser(targetUsername) {
    if (!this.currentUser) return false;
    targetUsername = targetUsername.toLowerCase().trim();
    const currentUsername = this.currentUser.username;

    if (this.followGraph[currentUsername]) {
      this.followGraph[currentUsername].following = this.followGraph[currentUsername].following.filter(u => u !== targetUsername);
    }
    if (this.followGraph[targetUsername]) {
      this.followGraph[targetUsername].followers = this.followGraph[targetUsername].followers.filter(u => u !== currentUsername);
    }

    this.saveFollowGraph();
    return true;
  },

  isFollowing(targetUsername) {
    if (!this.currentUser) return false;
    targetUsername = targetUsername.toLowerCase().trim();
    const userGraph = this.followGraph[this.currentUser.username];
    return userGraph ? userGraph.following.includes(targetUsername) : false;
  },

  getFollowersList(username) {
    username = username.toLowerCase().trim();
    return this.followGraph[username] ? this.followGraph[username].followers : [];
  },

  getFollowingList(username) {
    username = username.toLowerCase().trim();
    return this.followGraph[username] ? this.followGraph[username].following : [];
  },

  getAllUsersList() {
    const savedUsers = JSON.parse(localStorage.getItem('insta_users_db') || '{}');
    return Object.values(savedUsers).filter(u => !this.isBanned(u.username));
  },

  convertMediaFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();

      reader.onload = (e) => {
        if (isVideo) {
          resolve({ mediaUrl: e.target.result, isVideo: true });
        } else {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1080;

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve({ mediaUrl: dataUrl, isVideo: false });
          };
          img.onerror = reject;
          img.src = e.target.result;
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  createPost(mediaUrl, caption, isVideo = false) {
    if (!this.currentUser) return false;
    if (this.isBanned(this.currentUser.username)) {
      if (window.Toast) Toast.show('Siz admin tomonidan taqiqlangansiz (Banned)!', 'error');
      return false;
    }

    const newPost = {
      id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      authorId: this.currentUser.id,
      authorName: this.currentUser.username,
      authorAvatar: this.currentUser.avatar,
      mediaUrl: mediaUrl,
      isVideo: isVideo,
      caption: caption || '',
      likes: [],
      comments: [],
      createdAt: Date.now()
    };

    this.posts.unshift(newPost);
    this.savePosts();
    return true;
  },

  toggleLike(postId) {
    if (!this.currentUser) return;
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    const username = this.currentUser.username;
    const index = post.likes.indexOf(username);
    if (index === -1) {
      post.likes.push(username);
    } else {
      post.likes.splice(index, 1);
    }
    this.savePosts();
  },

  addComment(postId, text) {
    if (!this.currentUser) return;
    const post = this.posts.find(p => p.id === postId);
    if (!post || !text.trim()) return;
    post.comments.push({
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
      author: this.currentUser.username,
      avatar: this.currentUser.avatar,
      text: text.trim(),
      createdAt: Date.now()
    });
    this.savePosts();
  },

  deleteComment(postId, commentId) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    post.comments = post.comments.filter(c => c.id !== commentId);
    this.savePosts();
  },

  blockUser(username) {
    if (!this.currentUser || username === this.currentUser.username) return;
    if (!this.blockedUsers.includes(username)) {
      this.blockedUsers.push(username);
      localStorage.setItem('insta_blocked_users', JSON.stringify(this.blockedUsers));
    }
  },

  unblockUser(username) {
    this.blockedUsers = this.blockedUsers.filter(u => u !== username);
    localStorage.setItem('insta_blocked_users', JSON.stringify(this.blockedUsers));
  },

  isBlocked(username) {
    return this.blockedUsers.includes(username);
  },

  deletePostAdmin(postId) {
    this.posts = this.posts.filter(p => p.id !== postId);
    this.savePosts();
  },

  getFeedPosts() {
    return this.posts.filter(p => !this.isBlocked(p.authorName) && !this.isBanned(p.authorName));
  }
};

window.Store = Store;
Store.init();
