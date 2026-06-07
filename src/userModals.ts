import { App, Modal, Setting } from 'obsidian';
import { UserManager } from './userManager';
import { Auth } from './auth';

export class CreateUserModal extends Modal {
  private userManager: UserManager;
  private onDone: () => void;

  constructor(app: App, userManager: UserManager, onDone: () => void) {
    super(app);
    this.userManager = userManager;
    this.onDone = onDone;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Create User' });

    let username = '';
    let displayName = '';
    let password = '';

    new Setting(contentEl).setName('Username').addText(t => t.onChange(v => username = v));
    new Setting(contentEl).setName('Display name').addText(t => t.onChange(v => displayName = v));
    new Setting(contentEl).setName('Password').addText(t => {
      t.inputEl.type = 'password';
      t.onChange(v => password = v);
    });

    new Setting(contentEl).addButton(b =>
      b.setButtonText('Create').setCta().onClick(async () => {
        if (!username || !password) return;
        await this.userManager.createUser({
          username: username.toLowerCase(),
          displayName: displayName || username,
          role: 'member',
          password,
          created: new Date().toISOString().split('T')[0],
        });
        this.close();
        this.onDone();
      })
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ManageUsersModal extends Modal {
  private userManager: UserManager;

  constructor(app: App, userManager: UserManager) {
    super(app);
    this.userManager = userManager;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Manage Users' });

    const users = await this.userManager.getAllUsers();
    if (users.length === 0) {
      contentEl.createEl('p', { text: 'No users found.' });
      return;
    }

    for (const user of users) {
      const item = contentEl.createEl('div', { cls: 'vault-user-item' });
      const info = item.createEl('div', { cls: 'vault-user-info' });
      info.createEl('strong', { text: user.displayName });
      info.createEl('span', { text: ` (@${user.username}, ${user.role})`, cls: 'vault-user-role' });

      const del = item.createEl('button', { text: 'Delete', cls: 'vault-delete-btn' });
      del.addEventListener('click', async () => {
        await this.userManager.deleteUser(user.username);
        this.close();
        new ManageUsersModal(this.app, this.userManager).open();
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ChangePasswordModal extends Modal {
  private auth: Auth;
  private userManager: UserManager;

  constructor(app: App, auth: Auth, userManager: UserManager) {
    super(app);
    this.auth = auth;
    this.userManager = userManager;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Change Password' });

    let currentPw = '';
    let newPw = '';
    let confirmPw = '';
    const errorEl = contentEl.createEl('p', { cls: 'vault-login-error' });

    new Setting(contentEl).setName('Current password').addText(t => {
      t.inputEl.type = 'password';
      t.onChange(v => currentPw = v);
    });
    new Setting(contentEl).setName('New password').addText(t => {
      t.inputEl.type = 'password';
      t.onChange(v => newPw = v);
    });
    new Setting(contentEl).setName('Confirm new password').addText(t => {
      t.inputEl.type = 'password';
      t.onChange(v => confirmPw = v);
    });

    new Setting(contentEl).addButton(b =>
      b.setButtonText('Change Password').setCta().onClick(async () => {
        const username = this.auth.getCurrentUser();
        if (!username) { errorEl.textContent = 'Not logged in.'; return; }
        const user = await this.userManager.getUser(username);
        if (!user || user.password !== currentPw) {
          errorEl.textContent = 'Current password is incorrect.';
          return;
        }
        if (newPw !== confirmPw) { errorEl.textContent = 'Passwords do not match.'; return; }
        if (!newPw) { errorEl.textContent = 'Password cannot be empty.'; return; }
        await this.userManager.updatePassword(username, newPw);
        this.close();
      })
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
