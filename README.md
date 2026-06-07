# Vault Login

An Obsidian plugin that locks your vault behind a login screen and lets you assign tasks to users via hashtags in checkboxes.

---

## Quick Start

1. Enable the plugin in **Settings → Community plugins → Vault Login**
2. Restart Obsidian — the login screen appears
3. Log in with **admin / admin**
4. Use `Ctrl/Cmd+P` → **Show my tasks** to open your task sidebar

---

## Login / Logout

| Action | How |
|---|---|
| **Log in** | Appears automatically on startup. Also via `Ctrl/Cmd+P` → **Log in** |
| **Log out** | `Ctrl/Cmd+P` → **Log out** — login screen reappears immediately |
| **Ribbon icon** | Click the log-in icon in the left ribbon to open your tasks (or the login screen if logged out) |

The login screen covers the entire vault every time Obsidian starts. No persistent session — you must log in each session.

---

## Users

### Default admin
- **Username:** `admin`
- **Password:** `admin`

### Commands

| Command | What it does |
|---|---|
| **Create user** | Opens a form to add a new user (username, display name, password) |
| **Manage users** | Lists all users with a delete button next to each |
| **Change password** | Update the currently logged-in user's password |

### User storage
Each user is stored as a `.md` file in `_users/<username>.md`:

```md
---
username: adam
displayName: Adam
role: member
password: secret123
created: 2026-06-07
---

# Adam
```

The `_users/` folder appears in your file explorer like any other note. You can edit user details directly if needed.

You can place `_users` **anywhere** in your vault — the plugin auto-detects it on startup. Just move the folder to any location and restart Obsidian; the setting updates automatically.

---

## Tasks

### Assigning tasks
In any note, write a checkbox with `#username` tags at the end:

```md
- [ ] Fix the login bug #admin
- [ ] Review PR #admin #budi
- [ ] Write tests #adam #elsa
- [x] Completed task #admin   ← won't show in task list
```

- Only **unchecked** (`- [ ]`) tasks appear in the sidebar
- `[x]` tasks are ignored
- Indented subtasks work too:
  ```md
  - [ ] 3. Table #admin
      - [ ] 3. Table Itself #admin
      - [ ] 3A. Table as Cutting Board #budi
  ```

### Viewing your tasks

| Command | What it does |
|---|---|
| **Show my tasks** | Opens a sidebar view showing only tasks assigned to you |
| **Refresh tasks** | Re-scan the vault for changes (the view auto-refreshes when you toggle a task) |

The sidebar shows:
- **Task description** — the text before the hashtags
- **Source** — file path and line number (`note.md:12`)
- **Checkbox** — click to toggle `[ ]` ↔ `[x]` in the original note

### Task syntax reference

```
- [ ] <description> #user1 #user2 #user3 ...
```

- Hashtags must start with a letter (`#admin`, `#budi12`, `#dev_team`)
- Multiple assignees: separate with spaces (`#admin #budi`)
- The description is everything between the checkbox and the first `#tag`

---

## Settings

**Settings → Vault Login**

| Setting | Default | Description |
|---|---|---|
| Admin username | `admin` | Default admin account name (created on first run) |
| Admin password | `admin` | Password for the default admin account |
| Users directory | `_users` | Folder where user `.md` files are stored |

---

## Commands Summary

| Command | ID |
|---|---|
| Log in | `login` |
| Log out | `logout` |
| Create user | `create-user` |
| Manage users | `manage-users` |
| Show my tasks | `show-tasks` |
| Refresh tasks | `refresh-tasks` |
| Change password | `change-password` |

---

## File Structure

```
.obsidian/plugins/vault-login/
├── manifest.json        # Plugin metadata
├── main.js              # Compiled plugin
├── styles.css           # Login overlay + task sidebar styles
├── src/
│   ├── main.ts          # Plugin entry, commands, lifecycle
│   ├── auth.ts          # In-memory session management
│   ├── loginModal.ts    # Login overlay UI
│   ├── userManager.ts   # User CRUD via _users/*.md
│   ├── taskScanner.ts   # Scans vault for #tag checkboxes
│   ├── taskView.ts      # Sidebar task list view
│   ├── userModals.ts    # Create/manage/change-password modals
│   ├── settingsTab.ts   # Settings UI
│   └── models.ts        # TypeScript interfaces
```

---

## Notes

- **No encryption** — passwords are stored as plain text in `.md` frontmatter and plugin data
- **Vault files are visible** while logged in — the login screen only blocks the workspace on startup
- **Tasks scan all `.md` files** except those inside `_users/`
