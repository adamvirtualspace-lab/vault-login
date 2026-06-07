import { App, normalizePath } from 'obsidian';
import { User } from './models';

export class UserManager {
  private app: App;
  private usersDir: string;

  constructor(app: App, usersDir: string) {
    this.app = app;
    this.usersDir = usersDir;
  }

  async ensureUsersDir(): Promise<void> {
    if (!(await this.app.vault.adapter.exists(this.usersDir))) {
      await this.app.vault.adapter.mkdir(this.usersDir);
    }
  }

  async getUser(username: string): Promise<User | null> {
    try {
      const path = normalizePath(`${this.usersDir}/${username}.md`);
      if (!(await this.app.vault.adapter.exists(path))) return null;
      const content = await this.app.vault.adapter.read(path);
      return this.parseUserFile(content);
    } catch {
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureUsersDir();
    const listed = await this.app.vault.adapter.list(this.usersDir);
    const users: User[] = [];
    for (const file of listed.files) {
      if (file.endsWith('.md')) {
        const content = await this.app.vault.adapter.read(file);
        const user = this.parseUserFile(content);
        if (user) users.push(user);
      }
    }
    return users;
  }

  async createUser(user: User): Promise<void> {
    await this.ensureUsersDir();
    const path = normalizePath(`${this.usersDir}/${user.username}.md`);
    const content = this.generateUserFile(user);
    await this.app.vault.adapter.write(path, content);
  }

  async deleteUser(username: string): Promise<void> {
    const path = normalizePath(`${this.usersDir}/${username}.md`);
    try {
      await this.app.vault.adapter.remove(path);
    } catch {
      // file doesn't exist, ignore
    }
  }

  async updatePassword(username: string, newPassword: string): Promise<void> {
    const user = await this.getUser(username);
    if (user) {
      user.password = newPassword;
      await this.createUser(user);
    }
  }

  private parseUserFile(content: string): User | null {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const fm = match[1];
    const get = (key: string): string | undefined => {
      const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
      return m?.[1]?.trim();
    };
    const username = get('username');
    if (!username) return null;
    return {
      username,
      displayName: get('displayName') || username,
      role: (get('role') as 'admin' | 'member') || 'member',
      password: get('password') || '',
      created: get('created') || new Date().toISOString().split('T')[0],
    };
  }

  private generateUserFile(user: User): string {
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
}
