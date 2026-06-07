import { Plugin } from 'obsidian';
import { PluginSettings } from './models';
import { Auth } from './auth';
import { UserManager } from './userManager';
import { LoginOverlay } from './loginModal';
import { TaskScanner } from './taskScanner';
import { TaskView, TASK_VIEW_TYPE } from './taskView';
import { CreateUserModal, ManageUsersModal, ChangePasswordModal } from './userModals';
import { SettingsTab } from './settingsTab';

const DEFAULT_SETTINGS: PluginSettings = {
  adminUsername: 'admin',
  adminPassword: 'admin',
  usersDir: '_users',
};

export default class VaultLoginPlugin extends Plugin {
  settings!: PluginSettings;
  auth!: Auth;
  userManager!: UserManager;
  loginOverlay!: LoginOverlay;
  taskScanner!: TaskScanner;

  async onload(): Promise<void> {
    await this.loadSettings();
    await this.detectUsersDir();

    this.auth = new Auth();
    this.userManager = new UserManager(this.app, this.settings.usersDir);
    this.taskScanner = new TaskScanner(this.app, this.settings.usersDir);
    this.loginOverlay = new LoginOverlay(async (username: string, password: string) => {
      const ok = await this.auth.login(username, password, this.userManager, {
        username: this.settings.adminUsername,
        password: this.settings.adminPassword,
      });
      if (ok) {
        this.userManager = new UserManager(this.app, this.settings.usersDir);
        await this.refreshTaskView();
      }
      return ok;
    });

    this.registerView(TASK_VIEW_TYPE, (leaf) => new TaskView(leaf, this.taskScanner));

    this.app.workspace.onLayoutReady(() => {
      this.loginOverlay.show();
    });

    this.addCommand({
      id: 'login',
      name: 'Log in',
      callback: () => {
        if (!this.auth.isLoggedIn()) this.loginOverlay.show();
      },
    });

    this.addCommand({
      id: 'logout',
      name: 'Log out',
      callback: async () => {
        this.auth.logout();
        this.loginOverlay.show();
      },
    });

    this.addCommand({
      id: 'create-user',
      name: 'Create user',
      callback: () => {
        new CreateUserModal(this.app, this.userManager, () => {}).open();
      },
    });

    this.addCommand({
      id: 'manage-users',
      name: 'Manage users',
      callback: () => {
        new ManageUsersModal(this.app, this.userManager).open();
      },
    });

    this.addCommand({
      id: 'show-tasks',
      name: 'Show my tasks',
      callback: () => this.openTaskView(),
    });

    this.addCommand({
      id: 'refresh-tasks',
      name: 'Refresh tasks',
      callback: async () => {
        const leaves = this.app.workspace.getLeavesOfType(TASK_VIEW_TYPE);
        for (const leaf of leaves) {
          if (leaf.view instanceof TaskView) await leaf.view.refresh();
        }
      },
    });

    this.addCommand({
      id: 'change-password',
      name: 'Change password',
      callback: () => {
        new ChangePasswordModal(this.app, this.auth, this.userManager).open();
      },
    });

    this.addRibbonIcon('log-in', 'Vault Login', () => {
      if (this.auth.isLoggedIn()) {
        this.openTaskView();
      } else {
        this.loginOverlay.show();
      }
    });

    this.addSettingTab(new SettingsTab(this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(TASK_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings || {});
  }

  async saveSettings(): Promise<void> {
    const data = (await this.loadData()) || {};
    data.settings = this.settings;
    await this.saveData(data);
  }

  private async detectUsersDir(): Promise<void> {
    try {
      if (await this.app.vault.adapter.exists(this.settings.usersDir)) return;
    } catch {}

    const found = await this.findDir('_users', '', 0);
    if (found) {
      this.settings.usersDir = found;
      await this.saveSettings();
    }
  }

  private async findDir(name: string, base: string, depth: number): Promise<string | null> {
    if (depth > 10) return null;
    try {
      const items = await this.app.vault.adapter.list(base || '');
      for (const fp of items.folders) {
        const p = fp.replace(/\\/g, '/').replace(/\/$/, '');
        const fn = p.split('/').pop() || '';
        if (fn === '.obsidian' || fn === 'node_modules' || fn === '.git') continue;
        if (fn === name) return p;
        const sub = await this.findDir(name, p, depth + 1);
        if (sub) return sub;
      }
    } catch {}
    return null;
  }

  private async refreshTaskView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(TASK_VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof TaskView) {
        leaf.view.setCurrentUser(this.auth.getCurrentUser() || '');
        await leaf.view.refresh();
      }
    }
  }

  private async openTaskView(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this.loginOverlay.show();
      return;
    }

    const existing = this.app.workspace.getLeavesOfType(TASK_VIEW_TYPE)[0];
    if (existing) {
      this.app.workspace.revealLeaf(existing);
      if (existing.view instanceof TaskView) {
        existing.view.setCurrentUser(this.auth.getCurrentUser() || '');
        await existing.view.refresh();
      }
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;

    await leaf.setViewState({
      type: TASK_VIEW_TYPE,
      active: true,
    });

    if (leaf.view instanceof TaskView) {
      leaf.view.setCurrentUser(this.auth.getCurrentUser() || '');
      await leaf.view.refresh();
    }
  }
}
