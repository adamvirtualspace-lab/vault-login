import { App, TFile, Notice } from 'obsidian';
import { Task } from './models';

export class TaskScanner {
  private app: App;
  private usersDir: string;

  constructor(app: App, usersDir: string) {
    this.app = app;
    this.usersDir = usersDir;
  }

  async getAllTasks(): Promise<Task[]> {
    const files = this.app.vault.getMarkdownFiles();
    const tasks: Task[] = [];

    for (const file of files) {
      if (file.path.startsWith(this.usersDir + '/')) continue;
      const content = await this.app.vault.read(file);
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^\s*-\s+\[(\s|x)\]\s+(.*?)((?:\s+#[a-zA-Z][a-zA-Z0-9_-]*)+)\s*$/i);
        if (match) {
          const checked = match[1].toLowerCase() === 'x';
          const description = match[2].trim();
          const assignees = match[3].trim().split(/\s+/).map(t => t.replace('#', '').toLowerCase());
          tasks.push({
            file: file.path,
            line: i,
            description,
            assignees,
            checked,
          });
        }
      }
    }

    return tasks;
  }

  async getTasksForUser(username: string): Promise<Task[]> {
    const all = await this.getAllTasks();
    return all.filter(t => !t.checked && t.assignees.includes(username.toLowerCase()));
  }

  async toggleTask(task: Task): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(task.file);
    if (!(file instanceof TFile)) return;

    const content = await this.app.vault.read(file);
    const lines = content.split('\n');
    const line = lines[task.line];

    lines[task.line] = /\[x\]/i.test(line)
      ? line.replace(/\[x\]/i, '[ ]')
      : line.replace('[ ]', '[x]');

    await this.app.vault.modify(file, lines.join('\n'));
    new Notice(`Task ${lines[task.line].includes('[x]') ? 'completed' : 'reopened'}`);
  }
}
