export class LoginOverlay {
  private overlay: HTMLElement | null = null;
  private onLogin: (username: string, password: string) => Promise<boolean>;

  constructor(onLogin: (username: string, password: string) => Promise<boolean>) {
    this.onLogin = onLogin;
  }

  show(): void {
    if (this.overlay) return;
    this.overlay = document.createElement('div');
    this.overlay.className = 'vault-login-overlay';

    const card = document.createElement('div');
    card.className = 'vault-login-card';
    card.innerHTML = `
      <h2>Vault Login</h2>
      <div class="vault-login-field">
        <label>Username</label>
        <input type="text" id="vault-login-username" class="vault-login-input" placeholder="Enter username" autocomplete="off" />
      </div>
      <div class="vault-login-field">
        <label>Password</label>
        <input type="password" id="vault-login-password" class="vault-login-input" placeholder="Enter password" autocomplete="off" />
      </div>
      <button id="vault-login-btn" class="vault-login-btn">Log in</button>
      <p id="vault-login-error" class="vault-login-error"></p>
    `;

    this.overlay.appendChild(card);

    document.body.appendChild(this.overlay);

    const usernameInput = document.getElementById('vault-login-username') as HTMLInputElement;
    const passwordInput = document.getElementById('vault-login-password') as HTMLInputElement;
    const loginBtn = document.getElementById('vault-login-btn') as HTMLElement;
    const errorEl = document.getElementById('vault-login-error') as HTMLElement;

    // Trap events at the overlay so Obsidian can't steal focus
    const trap = (e: Event) => e.stopPropagation();
    this.overlay.addEventListener('pointerdown', trap);
    this.overlay.addEventListener('mousedown', trap);
    this.overlay.addEventListener('touchstart', trap);

    const doLogin = async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      if (!username || !password) {
        errorEl.textContent = 'Please enter username and password';
        return;
      }
      loginBtn.textContent = 'Logging in...';
      (loginBtn as HTMLButtonElement).disabled = true;
      const success = await this.onLogin(username, password);
      if (success) {
        this.hide();
      } else {
        errorEl.textContent = 'Invalid username or password';
        loginBtn.textContent = 'Log in';
        (loginBtn as HTMLButtonElement).disabled = false;
        passwordInput.value = '';
        passwordInput.focus();
      }
    };

    loginBtn.addEventListener('click', doLogin);
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
    usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') passwordInput.focus();
    });

    setTimeout(() => usernameInput.focus(), 100);
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  isVisible(): boolean {
    return this.overlay !== null;
  }
}
