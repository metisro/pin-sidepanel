# CasaMOD - Pin to Side Panel v1.0.0

CasaMOD Pin to Side Panel adds a **Pin** button to the CasaOS Files app so users can create custom folder shortcuts in the Files side panel.

The mod lets users choose a display name and CasaOS icon, saves the shortcut through CasaOS' custom shortcut API, and updates the Files side panel immediately without requiring a browser refresh.

## Features

- Adds a **Pin** button to the CasaOS Files toolbar.
- Pins the currently opened folder to the Files side panel.
- Allows custom shortcut names.
- Includes a searchable CasaOS icon picker.
- Uses the CasaOS shortcut API:
  - `GET /v1/users/current/custom/shortcut`
  - `POST /v1/users/current/custom/shortcut`
- Refreshes the visible side panel immediately after pinning or unpinning.
- Adds unpin controls for custom CasaOS shortcuts while protecting native Files entries.
- Includes a helper flow for paths that may need a `/DATA` symlink.

## Installation

1. Copy the `pin-sidepanel` folder to `/DATA/AppData/casamod/mod/` folder
2. Restart CasaMOD: `docker restart casamod` - or restart from CasaOS interface
3. Hard-refresh the browser (`Ctrl+Shift+R`)

## Usage

1. Open CasaOS Files.
2. Navigate into the folder you want to add to the side panel.
3. Click **Pin**.
4. Choose the shortcut name and icon.
5. If prompted, create the suggested `/DATA` symlink before pinning.
6. Click **Pin Shortcut**.

The shortcut should appear in the side panel immediately.

To remove a custom shortcut, hover over the shortcut in the side panel and click the unpin button.

## Pinning Folders Outside /DATA

CasaOS only reliably shows side-panel shortcuts for folders that resolve inside `/DATA`. If you want to pin a folder located outside `/DATA`, you must create a symlink to it within `/DATA`.

**To create a symlink:**

1. Navigate to `/DATA` via SSH or CasaOS web terminal.
2. Create a symlink to your external folder.
   You can copy the command from the mod's prompt or run a similar command in your terminal:

   ```bash
   ln -s /path/to/external/folder /DATA/shortcut-name
   ```
   Replace `/path/to/external/folder` with the actual path and `shortcut-name` with a name for the symlink.

3. In CasaOS Files, navigate to the symlink in `/DATA`.
4. Click **Pin** and choose your name and icon.

The shortcut will now appear in the Files side panel pointing to your external folder.

## How It Works

CasaOS stores custom side-panel shortcuts as an array at:

```text
/v1/users/current/custom/shortcut
```

This endpoint behaves like a full-replace endpoint, so the mod:

1. Reads the current shortcut list.
2. Adds or removes one shortcut locally.
3. Posts the full updated shortcut list back to CasaOS.
4. Updates the Files side-panel Vue state immediately.

New shortcuts created by the mod include a marker field:

```js
casamod: "pin-side-panel"
```

The unpin button does not depend on browser `localStorage`. CasaOS native Files entries are stored separately in `initFolders`, while custom shortcuts are stored in `shortcutList`, so the mod only exposes unpin controls for custom shortcuts.

The protected native entries are:

```text
Root, DATA, Documents, Downloads, Gallery, Media
```

The visible side panel is rendered from:

```js
dataList = initFolders + shortcutList
```

Because of this, the mod updates both `shortcutList` and `dataList` after changes. This avoids the need to refresh the browser.

## Shortcut Object Format

The shortcut objects use the CasaOS format:

```js
{
  name: "Shortcut Name",
  path: "/DATA/Folder",
  type: "folder",
  icon: "folder-outline",
  pack: "casa",
  visible: true,
  selected: true,
  extensions: null,
  casamod: "pin-side-panel"
}
```

## Known Limitations

- CasaOS only reliably shows side-panel shortcuts for folders that resolve inside `/DATA`.
- The CasaOS Files API does not reliably expose whether the current folder is a real directory or a symlink, so the mod always shows the `/DATA` symlink helper.
- The mod depends on CasaOS Files' current Vue component structure. Future CasaOS UI changes may require updating the side-panel refresh logic.
- The shortcut API is a full-replace endpoint. If multiple clients edit shortcuts at the same time, the last write may win.

## Development

This project currently consists of a single file:

```text
mod.js
```

Before publishing a change, run:

```powershell
node --check mod.js
```

## Version

Current version: `1.0.0`

## Author

Created by **metisro**.
Part of CasaMOD - [https://github.com/metisro/CasaMOD](https://github.com/metisro/CasaMOD)
