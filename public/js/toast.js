/* ==========================================================================
   NATIVE WEB-TO-APK TOAST & MODAL DIALOG ENGINE (REPLACES BROWSER ALERTS)
   ========================================================================== */

const Toast = {
  container: null,

  init() {
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        width: 90%;
        max-width: 360px;
      `;
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  },

  show(message, type = 'info', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    let icon = 'fa-info-circle';
    let bgColor = 'var(--bg-card)';
    let borderColor = 'var(--accent-color)';

    if (type === 'success') {
      icon = 'fa-check-circle';
      borderColor = 'var(--success)';
    } else if (type === 'error') {
      icon = 'fa-exclamation-circle';
      borderColor = 'var(--danger)';
    } else if (type === 'warning') {
      icon = 'fa-exclamation-triangle';
      borderColor = 'var(--warning)';
    }

    toast.style.cssText = `
      background: ${bgColor};
      border: 1px solid ${borderColor};
      color: var(--text-primary);
      padding: 12px 16px;
      border-radius: var(--radius-md);
      box-shadow: 0 8px 25px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      font-weight: 500;
      pointer-events: auto;
      animation: slideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      backdrop-filter: blur(10px);
    `;

    toast.innerHTML = `
      <i class="fas ${icon}" style="color: ${borderColor}; font-size: 16px;"></i>
      <span style="flex: 1;">${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  },

  // Custom Confirmation Dialog (Replaces confirm())
  confirm(title, message, onConfirmCallback) {
    let backdrop = document.getElementById('custom-confirm-dialog');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'custom-confirm-dialog';
      backdrop.className = 'modal-backdrop';
      document.body.appendChild(backdrop);
    }

    backdrop.innerHTML = `
      <div class="modal-content" style="max-width: 360px; padding: 20px; text-align: center;">
        <i class="fas fa-question-circle" style="font-size: 40px; color: var(--accent-color); margin-bottom: 12px;"></i>
        <h3 style="font-family: var(--font-heading); margin-bottom: 8px;">${title}</h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">${message}</p>
        <div style="display: flex; gap: 10px;">
          <button id="btn-confirm-cancel" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.08); border-radius: var(--radius-md); font-weight: 600;">Bekor qilish</button>
          <button id="btn-confirm-ok" style="flex: 1; padding: 10px; background: var(--insta-gradient); color: white; border-radius: var(--radius-md); font-weight: 600;">Tasdiqlash</button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');

    backdrop.querySelector('#btn-confirm-cancel').onclick = () => {
      backdrop.classList.remove('open');
    };

    backdrop.querySelector('#btn-confirm-ok').onclick = () => {
      backdrop.classList.remove('open');
      if (onConfirmCallback) onConfirmCallback();
    };
  }
};

window.Toast = Toast;
