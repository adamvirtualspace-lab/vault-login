import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { Task } from './models';
import { TaskScanner } from './taskScanner';

export const TASK_VIEW_TYPE = 'vault-login-tasks';

export class TaskView extends ItemView {
  private scanner: TaskScanner;
  private taskItems: Task[] = [];
  private _currentUser: string = '';

  constructor(leaf: WorkspaceLeaf, scanner: TaskScanner) {
    super(leaf);
    this.scanner = scanner;
  }

  getViewType(): string {
    return TASK_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this._currentUser ? `Tasks for ${this._currentUser}` : 'My Tasks';
  }

  getIcon(): string {
    return 'list-checks';
  }

  setCurrentUser(username: string): void {
    this._currentUser = username;
  }

  async onOpen(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this._currentUser) {
      this.renderMessage('Not logged in.');
      return;
    }
    this.taskItems = await this.scanner.getTasksForUser(this._currentUser);
    this.render();
    this.leaf.tabHeaderInnerTitleEl.textContent = this.getDisplayText();
  }

  private renderMessage(msg: string): void {
    const content = this.containerEl.children[1] as HTMLElement;
    content.empty();
    content.addClass('vault-tasks-container');
    content.createEl('p', { text: msg, cls: 'vault-tasks-empty' });
  }

  private render(): void {
    const content = this.containerEl.children[1] as HTMLElement;
    content.empty();
    content.addClass('vault-tasks-container');

    // User info header
    const userBar = content.createEl('div', { cls: 'vault-user-bar' });
    userBar.createEl('span', { text: `Logged in as `, cls: 'vault-user-label' });
    const userBadge = userBar.createEl('span', { text: this._currentUser, cls: 'vault-user-badge' });
    userBadge.setAttr('data-username', this._currentUser);

    // Task count
    content.createEl('h3', { text: `My Tasks (${this.taskItems.length})` });

    if (this.taskItems.length === 0) {
      const emptyBox = content.createEl('div', { cls: 'vault-tasks-empty-box' });
      emptyBox.createEl('span', { text: '\u2714', cls: 'vault-tasks-empty-icon' });
      emptyBox.createEl('p', { text: 'No tasks assigned to you.', cls: 'vault-tasks-empty' });
      return;
    }

    // Group tasks by file
    const groups = new Map<string, Task[]>();
    for (const task of this.taskItems) {
      const list = groups.get(task.file) || [];
      list.push(task);
      groups.set(task.file, list);
    }

    for (const [filePath, tasks] of groups) {
      const group = content.createEl('div', { cls: 'vault-task-group' });

      // File header — clickable to open the note
      const fileHeader = group.createEl('div', { cls: 'vault-file-header' });
      const filePill = fileHeader.createEl('span', { cls: 'vault-file-pill' });
      filePill.createEl('span', { text: '\uD83D\uDCC4 ', cls: 'vault-file-icon' });
      filePill.createEl('span', { text: filePath });
      filePill.createEl('span', { text: `  ${tasks.length}`, cls: 'vault-task-count' });

      const tf = this.app.vault.getAbstractFileByPath(filePath);
      filePill.addEventListener('click', () => {
        if (tf instanceof TFile) {
          this.app.workspace.getLeaf(false).openFile(tf);
        }
      });

      // Tasks for this file
      for (const task of tasks) {
        const card = group.createEl('div', { cls: 'vault-task-card' });

        const checkbox = card.createEl('input', { type: 'checkbox' });
        checkbox.addClass('vault-task-checkbox');
        checkbox.checked = task.checked;

        const body = card.createEl('div', { cls: 'vault-task-body' });

        const desc = body.createEl('span', {
          text: task.description,
          cls: task.checked ? 'vault-task-desc vault-task-done' : 'vault-task-desc',
        });

        const loc = body.createEl('span', { cls: 'vault-task-location' });
        loc.createEl('span', { text: `line ${task.line + 1}`, cls: 'vault-task-loc-line' });

        checkbox.addEventListener('change', async () => {
          task.checked = !task.checked;
          await this.scanner.toggleTask(task);
          await this.refresh();
        });
      }
    }
  }
}
