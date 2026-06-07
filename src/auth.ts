import { UserManager } from './userManager';

export class Auth {
  private username: string | null = null;

  async login(
    username: string,
    password: string,
    userManager: UserManager,
    adminFallback?: { username: string; password: string },
  ): Promise<boolean> {
    const user = await userManager.getUser(username);
    if (user && user.password === password) {
      this.username = username;
      return true;
    }
    if (
      adminFallback &&
      username === adminFallback.username &&
      password === adminFallback.password
    ) {
      await userManager.createUser({
        username: username.toLowerCase(),
        displayName: 'Admin',
        role: 'admin',
        password,
        created: new Date().toISOString().split('T')[0],
      });
      this.username = username;
      return true;
    }
    return false;
  }

  logout(): void {
    this.username = null;
  }

  getCurrentUser(): string | null {
    return this.username;
  }

  isLoggedIn(): boolean {
    return this.username !== null;
  }
}
