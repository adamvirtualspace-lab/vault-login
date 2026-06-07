import { ItemView, WorkspaceLeaf } from 'obsidian';
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

    content.createEl('h3', { text: `My Tasks (${this.taskItems.length})` });

    if (this.taskItems.length === 0) {
      content.createEl('p', { text: 'No tasks assigned to you.', cls: 'vault-tasks-empty' });
      return;
    }

    const list = content.createEl('ul', { cls: 'vault-tasks-list' });

    for (const task of this.taskItems) {
      const item = list.createEl('li', { cls: 'vault-task-item' });

      const checkbox = item.createEl('input', { type: 'checkbox' });
      checkbox.addClass('vault-task-checkbox');
      checkbox.checked = task.checked;

      const desc = item.createEl('span', { text: task.description, cls: 'vault-task-desc' });

      const meta = item.createEl('span', { cls: 'vault-task-meta' });
      meta.textContent = ` \u2014 ${task.file}:${task.line + 1}`;

      checkbox.addEventListener('change', async () => {
        const oldChecked = task.checked;
        task.checked = !oldChecked;
        await this.scanner.toggleTask(task);
        await this.refresh();
      });
    }
  }
}
