import { PluginSettingTab, Setting } from 'obsidian';
import VaultLoginPlugin from './main';

export class SettingsTab extends PluginSettingTab {
  private plugin: VaultLoginPlugin;

  constructor(plugin: VaultLoginPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Vault Login Settings' });

    new Setting(containerEl)
      .setName('Admin username')
      .setDesc('Default admin account created on first run.')
      .addText(t => t.setValue(this.plugin.settings.adminUsername).onChange(async v => {
        this.plugin.settings.adminUsername = v;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName('Admin password')
      .setDesc('Password for the default admin account.')
      .addText(t => {
        t.inputEl.type = 'password';
        t.setValue(this.plugin.settings.adminPassword).onChange(async v => {
          this.plugin.settings.adminPassword = v;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Users directory')
      .setDesc('Folder where user profile .md files are stored.')
      .addText(t => t.setValue(this.plugin.settings.usersDir).onChange(async v => {
        this.plugin.settings.usersDir = v;
        await this.plugin.saveSettings();
      }));
  }
}
