var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => VaultLoginPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian6 = require("obsidian");

// src/auth.ts
var Auth = class {
  constructor() {
    this.username = null;
  }
  async login(username, password, userManager, adminFallback) {
    const user = await userManager.getUser(username);
    if (user && user.password === password) {
      this.username = username;
      return true;
    }
    if (adminFallback && username === adminFallback.username && password === adminFallback.password) {
      await userManager.createUser({
        username: username.toLowerCase(),
        displayName: "Admin",
        role: "admin",
        password,
        created: new Date().toISOString().split("T")[0]
      });
      this.username = username;
      return true;
    }
    return false;
  }
  logout() {
    this.username = null;
  }
  getCurrentUser() {
    return this.username;
  }
  isLoggedIn() {
    return this.username !== null;
  }
};

// src/userManager.ts
var import_obsidian = require("obsidian");
var UserManager = class {
  constructor(app, usersDir) {
    this.app = app;
    this.usersDir = usersDir;
  }
  async ensureUsersDir() {
    if (!await this.app.vault.adapter.exists(this.usersDir)) {
      await this.app.vault.adapter.mkdir(this.usersDir);
    }
  }
  async getUser(username) {
    try {
      const path = (0, import_obsidian.normalizePath)(`${this.usersDir}/${username}.md`);
      if (!await this.app.vault.adapter.exists(path))
        return null;
      const content = await this.app.vault.adapter.read(path);
      return this.parseUserFile(content);
    } catch (e) {
      return null;
    }
  }
  async getAllUsers() {
    await this.ensureUsersDir();
    const listed = await this.app.vault.adapter.list(this.usersDir);
    const users = [];
    for (const file of listed.files) {
      if (file.endsWith(".md")) {
        const content = await this.app.vault.adapter.read(file);
        const user = this.parseUserFile(content);
        if (user)
          users.push(user);
      }
    }
    return users;
  }
  async createUser(user) {
    await this.ensureUsersDir();
    const path = (0, import_obsidian.normalizePath)(`${this.usersDir}/${user.username}.md`);
    const content = this.generateUserFile(user);
    await this.app.vault.adapter.write(path, content);
  }
  async deleteUser(username) {
    const path = (0, import_obsidian.normalizePath)(`${this.usersDir}/${username}.md`);
    try {
      await this.app.vault.adapter.remove(path);
    } catch (e) {
    }
  }
  async updatePassword(username, newPassword) {
    const user = await this.getUser(username);
    if (user) {
      user.password = newPassword;
      await this.createUser(user);
    }
  }
  parseUserFile(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match)
      return null;
    const fm = match[1];
    const get = (key) => {
      var _a;
      const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
      return (_a = m == null ? void 0 : m[1]) == null ? void 0 : _a.trim();
    };
    const username = get("username");
    if (!username)
      return null;
    return {
      username,
      displayName: get("displayName") || username,
      role: get("role") || "member",
      password: get("password") || "",
      created: get("created") || new Date().toISOString().split("T")[0]
    };
  }
  generateUserFile(user) {
    return `---
username: ${user.username}
displayName: ${user.displayName}
role: ${user.role}
password: ${user.password}
created: ${user.created}
---

# ${user.displayName}

User profile for ${user.username}.
`;
  }
};

// src/loginModal.ts
var LoginOverlay = class {
  constructor(onLogin) {
    this.overlay = null;
    this.onLogin = onLogin;
  }
  show() {
    if (this.overlay)
      return;
    this.overlay = document.createElement("div");
    this.overlay.className = "vault-login-overlay";
    const card = document.createElement("div");
    card.className = "vault-login-card";
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
    this.overlay.addEventListener("mousedown", (e) => e.stopPropagation());
    this.overlay.addEventListener("pointerdown", (e) => e.stopPropagation());
    document.body.appendChild(this.overlay);
    const usernameInput = document.getElementById("vault-login-username");
    const passwordInput = document.getElementById("vault-login-password");
    const loginBtn = document.getElementById("vault-login-btn");
    const errorEl = document.getElementById("vault-login-error");
    usernameInput.addEventListener("mousedown", (e) => e.stopPropagation());
    passwordInput.addEventListener("mousedown", (e) => e.stopPropagation());
    loginBtn.addEventListener("mousedown", (e) => e.stopPropagation());
    const doLogin = async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      if (!username || !password) {
        errorEl.textContent = "Please enter username and password";
        return;
      }
      loginBtn.textContent = "Logging in...";
      loginBtn.disabled = true;
      const success = await this.onLogin(username, password);
      if (success) {
        this.hide();
      } else {
        errorEl.textContent = "Invalid username or password";
        loginBtn.textContent = "Log in";
        loginBtn.disabled = false;
        passwordInput.value = "";
        passwordInput.focus();
      }
    };
    loginBtn.addEventListener("click", doLogin);
    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        doLogin();
    });
    usernameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        passwordInput.focus();
    });
    setTimeout(() => usernameInput.focus(), 100);
  }
  hide() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
  isVisible() {
    return this.overlay !== null;
  }
};

// src/taskScanner.ts
var import_obsidian2 = require("obsidian");
var TaskScanner = class {
  constructor(app, usersDir) {
    this.app = app;
    this.usersDir = usersDir;
  }
  async getAllTasks() {
    const files = this.app.vault.getMarkdownFiles();
    const tasks = [];
    for (const file of files) {
      if (file.path.startsWith(this.usersDir + "/"))
        continue;
      const content = await this.app.vault.read(file);
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^\s*-\s+\[(\s|x)\]\s+(.*?)((?:\s+#[a-zA-Z][a-zA-Z0-9_-]*)+)\s*$/i);
        if (match) {
          const checked = match[1].toLowerCase() === "x";
          const description = match[2].trim();
          const assignees = match[3].trim().split(/\s+/).map((t) => t.replace("#", "").toLowerCase());
          tasks.push({
            file: file.path,
            line: i,
            description,
            assignees,
            checked
          });
        }
      }
    }
    return tasks;
  }
  async getTasksForUser(username) {
    const all = await this.getAllTasks();
    return all.filter((t) => !t.checked && t.assignees.includes(username.toLowerCase()));
  }
  async toggleTask(task) {
    const file = this.app.vault.getAbstractFileByPath(task.file);
    if (!(file instanceof import_obsidian2.TFile))
      return;
    const content = await this.app.vault.read(file);
    const lines = content.split("\n");
    const line = lines[task.line];
    lines[task.line] = /\[x\]/i.test(line) ? line.replace(/\[x\]/i, "[ ]") : line.replace("[ ]", "[x]");
    await this.app.vault.modify(file, lines.join("\n"));
    new import_obsidian2.Notice(`Task ${lines[task.line].includes("[x]") ? "completed" : "reopened"}`);
  }
};

// src/taskView.ts
var import_obsidian3 = require("obsidian");
var TASK_VIEW_TYPE = "vault-login-tasks";
var TaskView = class extends import_obsidian3.ItemView {
  constructor(leaf, scanner) {
    super(leaf);
    this.taskItems = [];
    this._currentUser = "";
    this.scanner = scanner;
  }
  getViewType() {
    return TASK_VIEW_TYPE;
  }
  getDisplayText() {
    return this._currentUser ? `Tasks for ${this._currentUser}` : "My Tasks";
  }
  getIcon() {
    return "list-checks";
  }
  setCurrentUser(username) {
    this._currentUser = username;
  }
  async onOpen() {
    await this.refresh();
  }
  async refresh() {
    if (!this._currentUser) {
      this.renderMessage("Not logged in.");
      return;
    }
    this.taskItems = await this.scanner.getTasksForUser(this._currentUser);
    this.render();
    this.leaf.tabHeaderInnerTitleEl.textContent = this.getDisplayText();
  }
  renderMessage(msg) {
    const content = this.containerEl.children[1];
    content.empty();
    content.addClass("vault-tasks-container");
    content.createEl("p", { text: msg, cls: "vault-tasks-empty" });
  }
  render() {
    const content = this.containerEl.children[1];
    content.empty();
    content.addClass("vault-tasks-container");
    content.createEl("h3", { text: `My Tasks (${this.taskItems.length})` });
    if (this.taskItems.length === 0) {
      content.createEl("p", { text: "No tasks assigned to you.", cls: "vault-tasks-empty" });
      return;
    }
    const list = content.createEl("ul", { cls: "vault-tasks-list" });
    for (const task of this.taskItems) {
      const item = list.createEl("li", { cls: "vault-task-item" });
      const checkbox = item.createEl("input", { type: "checkbox" });
      checkbox.addClass("vault-task-checkbox");
      checkbox.checked = task.checked;
      const desc = item.createEl("span", { text: task.description, cls: "vault-task-desc" });
      const meta = item.createEl("span", { cls: "vault-task-meta" });
      meta.textContent = ` \u2014 ${task.file}:${task.line + 1}`;
      checkbox.addEventListener("change", async () => {
        const oldChecked = task.checked;
        task.checked = !oldChecked;
        await this.scanner.toggleTask(task);
        await this.refresh();
      });
    }
  }
};

// src/userModals.ts
var import_obsidian4 = require("obsidian");
var CreateUserModal = class extends import_obsidian4.Modal {
  constructor(app, userManager, onDone) {
    super(app);
    this.userManager = userManager;
    this.onDone = onDone;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Create User" });
    let username = "";
    let displayName = "";
    let password = "";
    new import_obsidian4.Setting(contentEl).setName("Username").addText((t) => t.onChange((v) => username = v));
    new import_obsidian4.Setting(contentEl).setName("Display name").addText((t) => t.onChange((v) => displayName = v));
    new import_obsidian4.Setting(contentEl).setName("Password").addText((t) => {
      t.inputEl.type = "password";
      t.onChange((v) => password = v);
    });
    new import_obsidian4.Setting(contentEl).addButton(
      (b) => b.setButtonText("Create").setCta().onClick(async () => {
        if (!username || !password)
          return;
        await this.userManager.createUser({
          username: username.toLowerCase(),
          displayName: displayName || username,
          role: "member",
          password,
          created: new Date().toISOString().split("T")[0]
        });
        this.close();
        this.onDone();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ManageUsersModal = class extends import_obsidian4.Modal {
  constructor(app, userManager) {
    super(app);
    this.userManager = userManager;
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Manage Users" });
    const users = await this.userManager.getAllUsers();
    if (users.length === 0) {
      contentEl.createEl("p", { text: "No users found." });
      return;
    }
    for (const user of users) {
      const item = contentEl.createEl("div", { cls: "vault-user-item" });
      const info = item.createEl("div", { cls: "vault-user-info" });
      info.createEl("strong", { text: user.displayName });
      info.createEl("span", { text: ` (@${user.username}, ${user.role})`, cls: "vault-user-role" });
      const del = item.createEl("button", { text: "Delete", cls: "vault-delete-btn" });
      del.addEventListener("click", async () => {
        await this.userManager.deleteUser(user.username);
        this.close();
        new ManageUsersModal(this.app, this.userManager).open();
      });
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ChangePasswordModal = class extends import_obsidian4.Modal {
  constructor(app, auth, userManager) {
    super(app);
    this.auth = auth;
    this.userManager = userManager;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Change Password" });
    let currentPw = "";
    let newPw = "";
    let confirmPw = "";
    const errorEl = contentEl.createEl("p", { cls: "vault-login-error" });
    new import_obsidian4.Setting(contentEl).setName("Current password").addText((t) => {
      t.inputEl.type = "password";
      t.onChange((v) => currentPw = v);
    });
    new import_obsidian4.Setting(contentEl).setName("New password").addText((t) => {
      t.inputEl.type = "password";
      t.onChange((v) => newPw = v);
    });
    new import_obsidian4.Setting(contentEl).setName("Confirm new password").addText((t) => {
      t.inputEl.type = "password";
      t.onChange((v) => confirmPw = v);
    });
    new import_obsidian4.Setting(contentEl).addButton(
      (b) => b.setButtonText("Change Password").setCta().onClick(async () => {
        const username = this.auth.getCurrentUser();
        if (!username) {
          errorEl.textContent = "Not logged in.";
          return;
        }
        const user = await this.userManager.getUser(username);
        if (!user || user.password !== currentPw) {
          errorEl.textContent = "Current password is incorrect.";
          return;
        }
        if (newPw !== confirmPw) {
          errorEl.textContent = "Passwords do not match.";
          return;
        }
        if (!newPw) {
          errorEl.textContent = "Password cannot be empty.";
          return;
        }
        await this.userManager.updatePassword(username, newPw);
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/settingsTab.ts
var import_obsidian5 = require("obsidian");
var SettingsTab = class extends import_obsidian5.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Vault Login Settings" });
    new import_obsidian5.Setting(containerEl).setName("Admin username").setDesc("Default admin account created on first run.").addText((t) => t.setValue(this.plugin.settings.adminUsername).onChange(async (v) => {
      this.plugin.settings.adminUsername = v;
      await this.plugin.saveSettings();
    }));
    new import_obsidian5.Setting(containerEl).setName("Admin password").setDesc("Password for the default admin account.").addText((t) => {
      t.inputEl.type = "password";
      t.setValue(this.plugin.settings.adminPassword).onChange(async (v) => {
        this.plugin.settings.adminPassword = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian5.Setting(containerEl).setName("Users directory").setDesc("Folder where user profile .md files are stored.").addText((t) => t.setValue(this.plugin.settings.usersDir).onChange(async (v) => {
      this.plugin.settings.usersDir = v;
      await this.plugin.saveSettings();
    }));
  }
};

// src/main.ts
var DEFAULT_SETTINGS = {
  adminUsername: "admin",
  adminPassword: "admin",
  usersDir: "_users"
};
var VaultLoginPlugin = class extends import_obsidian6.Plugin {
  async onload() {
    await this.loadSettings();
    await this.detectUsersDir();
    this.auth = new Auth();
    this.userManager = new UserManager(this.app, this.settings.usersDir);
    this.taskScanner = new TaskScanner(this.app, this.settings.usersDir);
    this.loginOverlay = new LoginOverlay(async (username, password) => {
      const ok = await this.auth.login(username, password, this.userManager, {
        username: this.settings.adminUsername,
        password: this.settings.adminPassword
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
      id: "login",
      name: "Log in",
      callback: () => {
        if (!this.auth.isLoggedIn())
          this.loginOverlay.show();
      }
    });
    this.addCommand({
      id: "logout",
      name: "Log out",
      callback: async () => {
        this.auth.logout();
        this.loginOverlay.show();
      }
    });
    this.addCommand({
      id: "create-user",
      name: "Create user",
      callback: () => {
        new CreateUserModal(this.app, this.userManager, () => {
        }).open();
      }
    });
    this.addCommand({
      id: "manage-users",
      name: "Manage users",
      callback: () => {
        new ManageUsersModal(this.app, this.userManager).open();
      }
    });
    this.addCommand({
      id: "show-tasks",
      name: "Show my tasks",
      callback: () => this.openTaskView()
    });
    this.addCommand({
      id: "refresh-tasks",
      name: "Refresh tasks",
      callback: async () => {
        const leaves = this.app.workspace.getLeavesOfType(TASK_VIEW_TYPE);
        for (const leaf of leaves) {
          if (leaf.view instanceof TaskView)
            await leaf.view.refresh();
        }
      }
    });
    this.addCommand({
      id: "change-password",
      name: "Change password",
      callback: () => {
        new ChangePasswordModal(this.app, this.auth, this.userManager).open();
      }
    });
    this.addRibbonIcon("log-in", "Vault Login", () => {
      if (this.auth.isLoggedIn()) {
        this.openTaskView();
      } else {
        this.loginOverlay.show();
      }
    });
    this.addSettingTab(new SettingsTab(this));
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(TASK_VIEW_TYPE);
  }
  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, (data == null ? void 0 : data.settings) || {});
  }
  async saveSettings() {
    const data = await this.loadData() || {};
    data.settings = this.settings;
    await this.saveData(data);
  }
  async detectUsersDir() {
    try {
      if (await this.app.vault.adapter.exists(this.settings.usersDir))
        return;
    } catch (e) {
    }
    const found = await this.findDir("_users", "", 0);
    if (found) {
      this.settings.usersDir = found;
      await this.saveSettings();
    }
  }
  async findDir(name, base, depth) {
    if (depth > 10)
      return null;
    try {
      const items = await this.app.vault.adapter.list(base || "");
      for (const fp of items.folders) {
        const p = fp.replace(/\\/g, "/").replace(/\/$/, "");
        const fn = p.split("/").pop() || "";
        if (fn === ".obsidian" || fn === "node_modules" || fn === ".git")
          continue;
        if (fn === name)
          return p;
        const sub = await this.findDir(name, p, depth + 1);
        if (sub)
          return sub;
      }
    } catch (e) {
    }
    return null;
  }
  async refreshTaskView() {
    const leaves = this.app.workspace.getLeavesOfType(TASK_VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof TaskView) {
        leaf.view.setCurrentUser(this.auth.getCurrentUser() || "");
        await leaf.view.refresh();
      }
    }
  }
  async openTaskView() {
    if (!this.auth.isLoggedIn()) {
      this.loginOverlay.show();
      return;
    }
    const existing = this.app.workspace.getLeavesOfType(TASK_VIEW_TYPE)[0];
    if (existing) {
      this.app.workspace.revealLeaf(existing);
      if (existing.view instanceof TaskView) {
        existing.view.setCurrentUser(this.auth.getCurrentUser() || "");
        await existing.view.refresh();
      }
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf)
      return;
    await leaf.setViewState({
      type: TASK_VIEW_TYPE,
      active: true
    });
    if (leaf.view instanceof TaskView) {
      leaf.view.setCurrentUser(this.auth.getCurrentUser() || "");
      await leaf.view.refresh();
    }
  }
};
