/* ==========================================================================
   TELEGRAM-STYLE INTERACTIVE EMOJIS & CUSTOM PACK MANAGEMENT
   ========================================================================== */

const EmojiManager = {
  // Default Built-in Emoji Packs
  packs: {
    reactions: ['❤️', '🔥', '👏', '😍', '😂', '😮', '🎉', '🚀', '💯', '👍'],
    smilies: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
    gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝'],
    custom: []
  },

  init() {
    this.loadCustomPacks();
  },

  // Load user-defined custom emoji packs from storage
  loadCustomPacks() {
    try {
      const saved = localStorage.getItem('insta_custom_emojis');
      if (saved) {
        this.packs.custom = JSON.parse(saved);
      } else {
        // Initial preset custom badges
        this.packs.custom = [
          { name: 'VIP Badge', url: 'https://cdn-icons-png.flaticon.com/512/6941/6941890.png' },
          { name: 'Fire Star', url: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png' },
          { name: 'Crown', url: 'https://cdn-icons-png.flaticon.com/512/2991/2991106.png' },
          { name: 'Diamond', url: 'https://cdn-icons-png.flaticon.com/512/2332/2332274.png' }
        ];
      }
    } catch (e) {
      console.error('Error loading custom emojis:', e);
    }
  },

  // Add a new custom emoji URL/image pack
  addCustomEmoji(name, url) {
    if (!url) return false;
    const newEmoji = { name: name || 'Custom', url: url.trim() };
    this.packs.custom.push(newEmoji);
    localStorage.setItem('insta_custom_emojis', JSON.stringify(this.packs.custom));
    return true;
  },

  // Telegram-Style Interactive Emoji Particle Burst Animation
  triggerInteractiveBurst(emoji, startX, startY) {
    const particleCount = 14;
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'interactive-emoji-particle';

      // If it's a custom emoji object with image URL
      if (typeof emoji === 'object' && emoji.url) {
        const img = document.createElement('img');
        img.src = emoji.url;
        img.style.width = '36px';
        img.style.height = '36px';
        p.appendChild(img);
      } else {
        p.textContent = emoji;
      }

      // Random trajectory math
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.4 - 0.2);
      const distance = 80 + Math.random() * 120;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 40; // upward bias
      const rot = (Math.random() - 0.5) * 360;

      p.style.left = `${startX || window.innerWidth / 2}px`;
      p.style.top = `${startY || window.innerHeight / 2}px`;
      p.style.setProperty('--tx', `${tx}px`);
      p.style.setProperty('--ty', `${ty}px`);
      p.style.setProperty('--rot', `${rot}deg`);

      document.body.appendChild(p);

      // Cleanup after animation completes
      setTimeout(() => {
        if (p.parentNode) p.parentNode.removeChild(p);
      }, 1200);
    }
  },

  // Render Emoji Picker DOM component
  createPicker(onSelectCallback) {
    const container = document.createElement('div');
    container.className = 'emoji-picker-container';

    let currentCategory = 'smilies';

    const renderGrid = () => {
      grid.innerHTML = '';
      if (currentCategory === 'custom') {
        this.packs.custom.forEach(item => {
          const btn = document.createElement('div');
          btn.className = 'emoji-item';
          btn.title = item.name;
          btn.innerHTML = `<img src="${item.url}" alt="${item.name}" />`;
          btn.onclick = (e) => {
            this.triggerInteractiveBurst(item, e.clientX, e.clientY);
            onSelectCallback(item);
          };
          grid.appendChild(btn);
        });
      } else {
        const items = this.packs[currentCategory] || [];
        items.forEach(char => {
          const btn = document.createElement('div');
          btn.className = 'emoji-item';
          btn.textContent = char;
          btn.onclick = (e) => {
            this.triggerInteractiveBurst(char, e.clientX, e.clientY);
            onSelectCallback(char);
          };
          grid.appendChild(btn);
        });
      }
    };

    // Header Tabs
    const tabs = document.createElement('div');
    tabs.className = 'emoji-picker-tabs';
    const categories = [
      { id: 'smilies', icon: '😀' },
      { id: 'reactions', icon: '🔥' },
      { id: 'gestures', icon: '👍' },
      { id: 'custom', icon: '✨' }
    ];

    categories.forEach(cat => {
      const tabBtn = document.createElement('button');
      tabBtn.className = `emoji-tab-btn ${cat.id === currentCategory ? 'active' : ''}`;
      tabBtn.innerHTML = cat.icon;
      tabBtn.onclick = () => {
        currentCategory = cat.id;
        tabs.querySelectorAll('.emoji-tab-btn').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');
        renderGrid();
      };
      tabs.appendChild(tabBtn);
    });

    const grid = document.createElement('div');
    grid.className = 'emoji-picker-grid';

    // Custom Pack Uploading Section
    const uploader = document.createElement('div');
    uploader.className = 'custom-pack-uploader';
    uploader.innerHTML = `
      <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">+ Yangi Custom Emoji/Stiker Qo'shish</div>
      <input type="text" id="custom-emoji-name" placeholder="Emoji nomi (masalan: Odiy Fire)" />
      <input type="text" id="custom-emoji-url" placeholder="Rasm URL (PNG/GIF)" />
      <button id="btn-save-custom-emoji"><i class="fas fa-plus"></i> Qo'shish</button>
    `;

    container.appendChild(tabs);
    container.appendChild(grid);
    container.appendChild(uploader);

    renderGrid();

    // Event listener for adding custom emojis dynamically
    setTimeout(() => {
      const saveBtn = uploader.querySelector('#btn-save-custom-emoji');
      if (saveBtn) {
        saveBtn.onclick = () => {
          const name = uploader.querySelector('#custom-emoji-name').value;
          const url = uploader.querySelector('#custom-emoji-url').value;
          if (this.addCustomEmoji(name, url)) {
            uploader.querySelector('#custom-emoji-name').value = '';
            uploader.querySelector('#custom-emoji-url').value = '';
            currentCategory = 'custom';
            renderGrid();
            alert('Custom emoji paketga saqlandi!');
          } else {
            alert('Iltimos to\'g\'ri rasm URL manzilini kiriting!');
          }
        };
      }
    }, 0);

    return container;
  }
};

window.EmojiManager = EmojiManager;
EmojiManager.init();
