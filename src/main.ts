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

    this.userManager = new UserManager(this.app, this.settings.usersDir);
    this.auth = new Auth();
    this.taskScanner = new TaskScanner(this.app);
    this.loginOverlay = new LoginOverlay(async (username: string, password: string) => {
      const ok = await this.auth.login(username, password, this.userManager);
      if (ok) {
        await this.refreshTaskView();
      }
      return ok;
    });

    this.registerView(TASK_VIEW_TYPE, (leaf) => new TaskView(leaf, this.taskScanner));

    await this.ensureAdminUser();

    // Always show login on startup
    this.loginOverlay.show();

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

  private async ensureAdminUser(): Promise<void> {
    const existing = await this.userManager.getUser(this.settings.adminUsername);
    if (!existing) {
      await this.userManager.createUser({
        username: this.settings.adminUsername.toLowerCase(),
        displayName: 'Admin',
        role: 'admin',
        password: this.settings.adminPassword,
        created: new Date().toISOString().split('T')[0],
      });
    }
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
