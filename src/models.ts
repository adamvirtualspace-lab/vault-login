export interface User {
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  password: string;
  created: string;
}

export interface Task {
  file: string;
  line: number;
  description: string;
  assignees: string[];
  checked: boolean;
}

export interface AuthSession {
  username: string;
  loggedInAt: number;
}

export interface PluginSettings {
  adminUsername: string;
  adminPassword: string;
  usersDir: string;
}
