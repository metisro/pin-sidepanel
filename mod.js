/**
 * CasaMOD: pin-to-side-panel v1.0.0
 *
 * Adds a "Pin" button to CasaOS Files for creating side-panel folder shortcuts.
 * The user picks a custom name + icon; the mod GET→append→POST the full
 * shortcut array (the API is a full-replace endpoint).
 *
 * API (confirmed from network capture):
 *   GET    /v1/users/current/custom/shortcut  → { success, data: [...] }
 *   POST   /v1/users/current/custom/shortcut  → body: entire array, same shape
 *
 * Correct shortcut object shape (from working "test1" entry):
 *   { name, path, type:"folder", icon:"<name>", pack:"casa",
 *     visible:true, selected:true, extensions:null, casamod:"pin-side-panel" }
 *
 * Icon "name" = full class name minus the "casa-" prefix, e.g.:
 *   CSS class "casa casa-files-outline" → stored icon value "files-outline"
 *   CSS class "casa casa-folder-outline" → stored icon value "folder-outline"
 * pack:"casa" tells CasaOS which iconfont set to use.
 */
(function CasaMOD_PinToSidePanel() {
  "use strict";

  const MOD_ID      = "casamod-pin-panel";
  const MOD_MARKER  = "pin-side-panel";
  const NATIVE_SHORTCUT_NAMES = new Set(["Root", "DATA", "Documents", "Downloads", "Gallery", "Media"]);

  // ─── Icon catalogue ────────────────────────────────────────────────────────
  // n = icon name stored in shortcut.json (strip "casa-" prefix from CSS class)
  //     e.g. CSS "casa casa-files-outline" → n:"files-outline"
  // l = human label shown in the picker
  // Picker renders: <i class="casa casa-${n}">  (full class = "casa " + "casa-" + n)
  const ICONS = [
    // ── Storage & drives ──
    { n: "root-outline",           l: "Root"            },
    { n: "data-outline",           l: "Data"            },
    { n: "storage-outline",        l: "Storage"         },
    { n: "storage-network",        l: "Storage Network" },
    { n: "storage-other",          l: "Storage Other"   },
    { n: "storage-merger",         l: "Storage Merger"  },
    { n: "storage-USB",            l: "Storage USB"     },
    { n: "hdd-local-outline",      l: "HDD Local"       },
    { n: "hdd-usb-outline",        l: "HDD USB"         },
    { n: "hdd-system-outline",     l: "HDD System"      },
    { n: "raid-outline",           l: "RAID"            },
    { n: "usb-outline",            l: "USB"             },
    // ── Files & folders ──
    { n: "folder-outline",         l: "Folder"          },
    { n: "folder-open-outline",    l: "Folder Open"     },
    { n: "folder-plus-outline",    l: "Folder +"        },
    { n: "folder-up-outline",      l: "Folder Up"       },
    { n: "files-outline",          l: "Files"           },
    { n: "file-up-outline",        l: "File Up"         },
    { n: "gallery-outline",        l: "Gallery"         },
    { n: "downloads-outline",      l: "Downloads"       },
    { n: "media-outline",          l: "Media"           },
    // ── Transfer & sync ──
    { n: "upload-outline",         l: "Upload"          },
    { n: "upload2-outline",        l: "Upload 2"        },
    { n: "download-outline",       l: "Download"        },
    { n: "sending-files-outline",  l: "Send Files"      },
    { n: "transmission-outline",   l: "Transmission"    },
    { n: "sync-outline",           l: "Sync"            },
    { n: "sync2-outline",          l: "Sync 2"          },
    { n: "backup-outline",         l: "Backup"          },
    { n: "backup2-outline",        l: "Backup 2"        },
    // ── Network & sharing ──
    { n: "network-outline",        l: "Network"         },
    { n: "network2-outline",       l: "Network 2"       },
    { n: "internet-outline",       l: "Internet"        },
    { n: "wifi-outline",           l: "Wi-Fi"           },
    { n: "ethernet-outline",       l: "Ethernet"        },
    { n: "smb",                    l: "SMB"             },
    { n: "webdav",                 l: "WebDAV"          },
    { n: "shared-outline",         l: "Shared"          },
    { n: "share",                  l: "Share"           },
    { n: "share-outline",          l: "Share 2"         },
    { n: "share-1",                l: "Share 3"         },
    // ── Cloud ──
    { n: "cloud-outline",          l: "Cloud"           },
    { n: "cloud",                  l: "Cloud (solid)"   },
    { n: "protection-outline",     l: "Protection"      },
    { n: "protection",             l: "Protection (s)"  },
    // ── Devices ──
    { n: "computer-outline",       l: "Computer"        },
    { n: "laptop-outline",         l: "Laptop"          },
    { n: "phone-outline",          l: "Phone"           },
    { n: "zimacube-outline",       l: "ZimaCube"        },
    { n: "thunderbolt-outline",    l: "Thunderbolt"     },
    { n: "gpu-outline",            l: "GPU"             },
    { n: "ios",                    l: "iOS"             },
    { n: "android",                l: "Android"         },
    { n: "macos",                  l: "macOS"           },
    { n: "windows",                l: "Windows"         },
    // ── Apps & system ──
    { n: "docker-outline",         l: "Docker"          },
    { n: "terminal-outline",       l: "Terminal"        },
    { n: "settings-outline",       l: "Settings"        },
    { n: "system-outline",         l: "System"          },
    { n: "control-outline",        l: "Control"         },
    { n: "port-outline",           l: "Port"            },
    // ── UI / actions ──
    { n: "search-outline",         l: "Search"          },
    { n: "edit-outline",           l: "Edit"            },
    { n: "edit2-outline",          l: "Edit 2"          },
    { n: "copy-outline",           l: "Copy"            },
    { n: "copy2-outline",          l: "Copy 2"          },
    { n: "cut-outline",            l: "Cut"             },
    { n: "paste-outline",          l: "Paste"           },
    { n: "paste2-outline",         l: "Paste 2"         },
    { n: "duplicate-outline",      l: "Duplicate"       },
    { n: "trash-outline",          l: "Trash"           },
    { n: "trash2-outline",         l: "Trash 2"         },
    { n: "trash-empty-outline",    l: "Trash Empty"     },
    { n: "overview-outline",       l: "Overview"        },
    { n: "view-dashboard-outline", l: "Dashboard"       },
    { n: "view-grid-outline",      l: "Grid"            },
    { n: "view-list-outline",      l: "List"            },
    { n: "display-applications-outline", l: "Apps"      },
    // ── Info & status ──
    { n: "information-outline",    l: "Info"            },
    { n: "alert-outline",          l: "Alert"           },
    { n: "alert-circle-outline",   l: "Alert Circle"    },
    { n: "question-outline",       l: "Question"        },
    { n: "plus-question-outline",  l: "Unknown"         },
    { n: "check-outline",          l: "Check"           },
    { n: "minus-outline",          l: "Minus"           },
    { n: "add-outline",            l: "Add"             },
    { n: "close-outline",          l: "Close"           },
    { n: "history-records-outline",l: "History"         },
    { n: "time-outline",           l: "Time"            },
    { n: "news-outline",           l: "News"            },
    // ── User ──
    { n: "user",                   l: "User"            },
    { n: "account-outline",        l: "Account"         },
    { n: "user-edit-outline",      l: "User Edit"       },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH TOKEN
  // ═══════════════════════════════════════════════════════════════════════════
  function token() {
    try {
      return document.querySelector("#app").__vue__.$store.state.access_token || "";
    } catch (_) {
      return localStorage.getItem("access_token") || "";
    }
  }

  function authHeaders() {
    return {
      "Content-Type":  "application/json",
      "Accept":        "application/json, text/plain, */*",
      "Authorization": token(),
      "Language":      "en_us",
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYMLINK HANDLING
  // ═══════════════════════════════════════════════════════════════════════════
  // CasaOS only displays side-panel shortcuts that resolve inside /DATA. The
  // Files API does not reliably expose whether the current folder is a symlink,
  // so the modal always shows the /DATA symlink helper.
  function checkIsSymlink(_folderPath) {
    return Promise.resolve(true);
  }
  // Full-replace: GET current list → mutate → POST whole array
  // ═══════════════════════════════════════════════════════════════════════════
  const ENDPOINT = "/v1/users/current/custom/shortcut";
  let shortcutCache = [];

  async function apiGetShortcuts() {
    const r = await fetch(ENDPOINT, {
      method: "GET",
      headers: authHeaders(),
      credentials: "include",
    });
    if (!r.ok) throw new Error(`GET shortcuts failed: ${r.status}`);
    const json = await r.json();
    // response: { success: 200, message: "ok", data: [...] }
    shortcutCache = Array.isArray(json?.data) ? json.data : [];
    return shortcutCache;
  }

  async function apiPostShortcuts(list) {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(list),
    });
    if (!r.ok) throw new Error(`POST shortcuts failed: ${r.status}`);
    return await r.json();
  }

  /** Build a shortcut entry in the exact shape CasaOS expects */
  function buildEntry(path, name, icon) {
    return {
      name:       name,
      path:       path,
      type:       "folder",
      icon:       icon,      // e.g. "files-outline", "folder-outline" (no "casa-" prefix)
      pack:       "casa",
      visible:    true,
      selected:   true,
      extensions: null,
      casamod:    MOD_MARKER,
    };
  }

  async function apiAddShortcut(path, name, icon) {
    const current = await apiGetShortcuts();
    // Guard: don't add a duplicate path
    if (current.some(s => s.path === path)) {
      throw new Error("already-pinned");
    }
    const updated = [...current, buildEntry(path, name, icon)];
    await apiPostShortcuts(updated);
    return await apiGetShortcuts();
  }

  async function apiRemoveShortcut(path) {
    const current = await apiGetShortcuts();
    const filtered = current.filter(s => s.path !== path);
    if (filtered.length === current.length) return current; // nothing to remove
    await apiPostShortcuts(filtered);
    return await apiGetShortcuts();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  function injectStyles() {
    if (document.getElementById(`${MOD_ID}-css`)) return;
    const s = document.createElement("style");
    s.id = `${MOD_ID}-css`;
    s.textContent = `
      /* ── toolbar pin button (next to "Upload or create") ── */
      .${MOD_ID}-pin-btn {
        display:inline-flex; align-items:center; gap:5px;
        height:24px; border:none;
        background:var(--primary,#49b3ff); cursor:pointer;
        transition:background .12s, opacity .12s;
        white-space:nowrap; flex-shrink:0;
      }
      .${MOD_ID}-pin-btn:hover   { background:#3aa0f0; }
      .${MOD_ID}-pin-btn:active  { opacity:.8; }
      .${MOD_ID}-pin-btn .casa   { font-size:14px; }

      .${MOD_ID}-unpin-slot {
        width:22px; min-width:22px;
        display:flex; align-items:center; justify-content:center;
        flex-shrink:0;
      }
      .${MOD_ID}-unpin-btn {
        display:none; align-items:center; justify-content:center;
        width:18px; height:18px; border-radius:50%; border:none;
        background:transparent; cursor:pointer;
        color:var(--danger,#f14668);
        padding:0; font-size:15px; line-height:1; opacity:0;
        transition:opacity .15s; flex-shrink:0;
      }
      .new-list-item:hover .${MOD_ID}-unpin-btn,
      .li:hover            .${MOD_ID}-unpin-btn {
        display:flex !important; opacity:1;
      }

      .${MOD_ID}-overlay {
        position:fixed; inset:0; background:rgba(10,10,10,.72);
        z-index:40; display:flex; align-items:center; justify-content:center;
        animation:${MOD_ID}-fi .15s ease;
      }
      @keyframes ${MOD_ID}-fi { from{opacity:0} to{opacity:1} }

      .${MOD_ID}-modal {
        background:var(--background-2,#1e2030);
        border:1px solid var(--background-4,#2e3148);
        border-radius:12px; padding:28px 28px 24px;
        width:460px; max-width:calc(100vw - 32px);
        box-shadow:0 24px 64px rgba(0,0,0,.55);
        animation:${MOD_ID}-su .18s ease;
        color:var(--text-1,#e0e4f0);
      }
      @keyframes ${MOD_ID}-su {
        from{transform:translateY(14px);opacity:0}
        to  {transform:translateY(0);opacity:1}
      }
      .${MOD_ID}-modal h3 {
        margin:0 0 20px; font-size:15px; font-weight:600;
        display:flex; align-items:center; gap:8px;
        color:var(--text-1,#e0e4f0);
      }
      .${MOD_ID}-modal h3 .casa { color:var(--primary,#49b3ff); font-size:20px; }
      .${MOD_ID}-field  { margin-bottom:18px; }
      .${MOD_ID}-label  {
        display:block; font-size:12px; font-weight:500;
        text-transform:uppercase; letter-spacing:.06em;
        color:var(--text-3,#7880a0); margin-bottom:6px;
      }
      .${MOD_ID}-input {
        width:100%; padding:9px 12px; border-radius:8px;
        border:1px solid var(--background-4,#2e3148);
        background:var(--background-3,#252840);
        color:var(--text-1,#e0e4f0); font-size:14px;
        outline:none; box-sizing:border-box; transition:border-color .15s;
      }
      .${MOD_ID}-input:focus { border-color:var(--primary,#49b3ff); }
      .${MOD_ID}-path-box {
        padding:8px 12px; border-radius:8px;
        background:var(--background-3,#252840);
        color:var(--text-3,#7880a0); font-size:12px;
        font-family:monospace; word-break:break-all;
        border:1px solid var(--background-4,#2e3148);
      }
      .${MOD_ID}-icon-search {
        display:flex; align-items:center; gap:6px;
        padding:7px 10px; border-radius:8px;
        border:1px solid var(--background-4,#2e3148);
        background:var(--background-3,#252840); margin-bottom:8px;
      }
      .${MOD_ID}-icon-search input {
        border:none; background:transparent; outline:none;
        color:var(--text-1,#e0e4f0); font-size:13px; flex:1;
      }
      .${MOD_ID}-icon-search .casa { color:var(--text-3,#7880a0); }
      .${MOD_ID}-picker {
        display:grid; grid-template-columns:repeat(auto-fill,minmax(56px,1fr));
        gap:6px; max-height:220px; overflow-y:auto; padding:2px;
        scrollbar-width:thin;
        scrollbar-color:var(--background-4,#2e3148) transparent;
      }
      .${MOD_ID}-picker::-webkit-scrollbar { width:4px; }
      .${MOD_ID}-picker::-webkit-scrollbar-thumb {
        background:var(--background-4,#2e3148); border-radius:2px;
      }
      .${MOD_ID}-ico-opt {
        display:flex; flex-direction:column; align-items:center; gap:4px;
        padding:8px 4px 6px; border-radius:8px;
        border:2px solid transparent;
        background:var(--background-3,#252840);
        cursor:pointer; transition:border-color .12s,background .12s;
        user-select:none;
      }
      .${MOD_ID}-ico-opt:hover { background:var(--background-4,#2e3148); }
      .${MOD_ID}-ico-opt.sel {
        border-color:var(--primary,#49b3ff);
        background:rgba(73,179,255,.08);
      }
      .${MOD_ID}-ico-opt .casa { font-size:22px; color:var(--primary,#49b3ff); }
      .${MOD_ID}-ico-opt .lbl {
        font-size:9px; color:var(--text-3,#7880a0);
        text-align:center; white-space:nowrap;
        overflow:hidden; text-overflow:ellipsis; width:100%;
      }
      .${MOD_ID}-footer {
        display:flex; justify-content:flex-end; gap:10px; margin-top:22px;
      }
      .${MOD_ID}-btn {
        padding:8px 18px; border-radius:8px; border:none;
        font-size:13px; font-weight:500; cursor:pointer;
        transition:background .12s,opacity .12s;
      }
      .${MOD_ID}-btn:active { opacity:.8; }
      .${MOD_ID}-btn-cancel {
        background:var(--background-3,#252840);
        color:var(--text-2,#a0a8c0);
        border:1px solid var(--background-4,#2e3148);
      }
      .${MOD_ID}-btn-cancel:hover { background:var(--background-4,#2e3148); }
      .${MOD_ID}-btn-ok { background:var(--primary,#49b3ff); color:#fff; }
      .${MOD_ID}-btn-ok:hover    { background:#3aa0f0; }
      .${MOD_ID}-btn-ok:disabled { opacity:.45; cursor:not-allowed; }

      /* ── symlink warning banner ── */
      .${MOD_ID}-symlink-warn {
        background:rgba(255,183,0,.1);
        border:1px solid rgba(255,183,0,.4);
        border-radius:8px;
        padding:12px 14px;
        margin-bottom:18px;
        font-size:12px;
        line-height:1.6;
        color:var(--text-2,#a0a8c0);
      }
      .${MOD_ID}-symlink-warn strong {
        display:block; margin-bottom:4px;
        color:#ffb700; font-size:13px;
      }
      /* ── command copy box ── */
      .${MOD_ID}-cmd-wrap {
        display:flex; align-items:stretch; gap:0;
        margin-top:10px; border-radius:8px; overflow:hidden;
        border:1px solid var(--background-4,#2e3148);
      }
      .${MOD_ID}-cmd-box {
        flex:1; padding:8px 10px;
        background:var(--background-3,#252840);
        color:#a8ff78; font-family:monospace; font-size:11px;
        word-break:break-all; line-height:1.5;
        border:none; outline:none; user-select:all;
        cursor:text;
      }
      .${MOD_ID}-copy-btn {
        padding:0 12px; border:none; border-left:1px solid var(--background-4,#2e3148);
        background:var(--background-3,#252840);
        color:var(--text-3,#7880a0); cursor:pointer;
        font-size:12px; font-weight:500; white-space:nowrap;
        transition:background .12s, color .12s;
        display:flex; align-items:center; gap:5px;
      }
      .${MOD_ID}-copy-btn:hover { background:var(--background-4,#2e3148); color:var(--text-1,#e0e4f0); }
      .${MOD_ID}-copy-btn.copied { color:#23d160; }
      /* ── symlink name field inside warning ── */
      .${MOD_ID}-symlink-name-row {
        display:flex; align-items:center; gap:8px; margin-top:10px;
      }
      .${MOD_ID}-symlink-name-row label {
        font-size:11px; color:var(--text-3,#7880a0); white-space:nowrap; flex-shrink:0;
      }
      .${MOD_ID}-symlink-name-row input {
        flex:1; padding:6px 10px; border-radius:6px; font-size:12px;
        border:1px solid var(--background-4,#2e3148);
        background:var(--background-3,#252840);
        color:var(--text-1,#e0e4f0); outline:none;
        font-family:monospace;
      }
      .${MOD_ID}-symlink-name-row input:focus { border-color:#ffb700; }

      /* ── "Open Terminal" button in warning banner ── */
      .${MOD_ID}-term-btn {
        display:inline-flex; align-items:center; gap:6px;
        margin-top:10px; padding:7px 14px; border-radius:7px; border:none;
        background:rgba(73,179,255,.15); color:var(--primary,#49b3ff);
        border:1px solid rgba(73,179,255,.3);
        cursor:pointer; font-size:12px; font-weight:500;
        transition:background .12s;
      }
      .${MOD_ID}-term-btn:hover { background:rgba(73,179,255,.25); }

      .${MOD_ID}-toast {
        position:fixed; bottom:24px; right:24px; z-index:100000;
        padding:12px 18px; border-radius:10px;
        font-size:13px; font-weight:500; color:#fff;
        box-shadow:0 8px 24px rgba(0,0,0,.4);
        animation:${MOD_ID}-ti .2s ease;
        max-width:320px; pointer-events:none;
      }
      .${MOD_ID}-toast.ok  { background:#23d160; }
      .${MOD_ID}-toast.err { background:#f14668; }
      .${MOD_ID}-toast.inf { background:#49b3ff; }
      @keyframes ${MOD_ID}-ti {
        from{transform:translateY(12px);opacity:0}
        to  {transform:translateY(0);opacity:1}
      }
    `;
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOAST
  // ═══════════════════════════════════════════════════════════════════════════
  function toast(msg, type = "inf", ms = 3200) {
    const el = document.createElement("div");
    el.className = `${MOD_ID}-toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  function esc(s) {
    return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;")
                  .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function baseName(p) {
    return (p||"").replace(/\/+$/,"").split("/").pop() || p;
  }

  function renderPicker(sel, filter) {
    const f = filter.toLowerCase();
    return ICONS
      .filter(ic => !f || ic.n.includes(f) || ic.l.toLowerCase().includes(f))
      .map(ic => `
        <div class="${MOD_ID}-ico-opt${ic.n===sel?" sel":""}" data-icon="${ic.n}" title="${ic.l}">
          <i class="casa casa-${ic.n} casa-24px"></i>
          <span class="lbl">${ic.l}</span>
        </div>`)
      .join("");
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  /** Sanitise a folder name into a safe symlink name */
  function safeSymlinkName(p) {
    return baseName(p).replace(/[^a-zA-Z0-9._-]/g, "_") || "shortcut";
  }

  /** Terminal command the user must run */
  function buildSymlinkCmd(realPath, symlinkName) {
    return `ln -s "${realPath}" "/DATA/${symlinkName}"`;
  }

  // ─── terminal trigger ─────────────────────────────────────────────────────

  /**
   * Open the native CasaOS terminal modal by calling showTerminalPanel()
   * on the top-bar Vue component (confirmed working via console inspection).
   */
  function findVueComponent(name) {
    function walk(vm, depth) {
      if (depth > 8 || !vm) return null;
      if (vm.$options?.name === name) return vm;
      for (const c of (vm.$children || [])) {
        const found = walk(c, depth + 1);
        if (found) return found;
      }
      return null;
    }
    try {
      return walk(document.querySelector("#app").__vue__, 0);
    } catch (_) {
      return null;
    }
  }

  function openTerminalModal() {
    const topBar = findVueComponent("top-bar");
    if (topBar && typeof topBar.showTerminalPanel === "function") {
      topBar.showTerminalPanel();
    } else {
      toast("Could not open terminal — top-bar component not found.", "err");
      console.warn("[pin-panel] top-bar Vue component or showTerminalPanel() not found.");
    }
  }

  // ─── side panel refresh ───────────────────────────────────────────────────
  // CasaOS renders the side panel from `dataList`, which is built from
  // `initFolders + shortcutList`. Updating only `shortcutList` is not enough;
  // the rendered list must be replaced too.

  function walkSidePanelVms(onFound) {
    const touched = new Set();
    let found = false;

    function walkVm(vm, depth) {
      if (depth > 12 || !vm || touched.has(vm)) return;
      touched.add(vm);

      const data = vm.$data || {};
      const isSidePanel =
        Array.isArray(data.initFolders) &&
        Array.isArray(data.dataList) &&
        Array.isArray(data.shortcutList);

      if (isSidePanel) {
        found = true;
        onFound(vm);
      }

      for (const c of (vm.$children || [])) walkVm(c, depth + 1);
    }

    function scanMountedVue(root) {
      if (!root) return;
      root.querySelectorAll("*").forEach(el => {
        if (el.__vue__) walkVm(el.__vue__, 0);
      });
    }

    const app = document.querySelector("#app");
    walkVm(app?.__vue__, 0);
    scanMountedVue(app || document.body);
    return found;
  }

  function currentShortcutList() {
    let shortcuts = null;
    try {
      walkSidePanelVms(vm => {
        if (!shortcuts) shortcuts = vm.$data.shortcutList;
      });
    } catch (_) {}
    return Array.isArray(shortcuts) ? shortcuts : shortcutCache;
  }

  function refreshSidePanel(shortcuts) {
    const touched = new Set();

    function normalizeShortcut(s) {
      return {
        ...s,
        icon: s.icon === "folder" ? "folder-outline" : s.icon,
      };
    }

    function updateSidePanelVm(vm) {
      if (!vm || touched.has(vm)) return;
      touched.add(vm);

      const data = vm.$data || {};
      const isSidePanel =
        Array.isArray(data.initFolders) &&
        Array.isArray(data.dataList) &&
        Array.isArray(data.shortcutList);

      if (!isSidePanel) return;

      if (Array.isArray(shortcuts)) {
        const nextShortcuts = shortcuts.map(normalizeShortcut);
        const nextDataList = [...data.initFolders, ...nextShortcuts];
        if (typeof vm.$set === "function") {
          vm.$set(data, "shortcutList", nextShortcuts);
          vm.$set(data, "dataList", nextDataList);
        } else {
          data.shortcutList = nextShortcuts;
          data.dataList = nextDataList;
        }
      }

      if (typeof vm.$forceUpdate === "function") vm.$forceUpdate();
      if (typeof vm.$nextTick === "function") vm.$nextTick(() => injectUnpinButtons());
    }

    try {
      const didFind = walkSidePanelVms(updateSidePanelVm);
      if (!didFind) console.warn("[pin-panel] refreshSidePanel: shortcutList component not found");
    } catch (e) {
      console.warn("[pin-panel] refreshSidePanel error:", e);
    }
  }

  // ─── pin modal ────────────────────────────────────────────────────────────

  function openModal(folderPath, isSymlink, onPin) {
    document.getElementById(`${MOD_ID}-overlay`)?.remove();
    let selIcon = "folder-outline";

    const showWarning = isSymlink;

    // For symlinks inside /DATA, the "true" path to create the symlink TO
    // is the folder path itself (we're already under /DATA via a symlink,
    // so the user needs a NEW symlink pointing to the real target).
    // The symlink name defaults to the folder's own name.
    let symlinkName = safeSymlinkName(folderPath);

    // The path we actually register as the shortcut
    const pinnedPath = () =>
      showWarning ? `/DATA/${symlinkNameEl?.value.trim() || symlinkName}` : folderPath;

    const overlay = document.createElement("div");
    overlay.className = `${MOD_ID}-overlay`;
    overlay.id = `${MOD_ID}-overlay`;
    overlay.innerHTML = `
      <div class="${MOD_ID}-modal" role="dialog" aria-modal="true">
        <h3><i class="casa casa-folder-plus-outline casa-24px"></i>Pin to Side Panel</h3>

        <div class="${MOD_ID}-field">
          <span class="${MOD_ID}-label">Folder path</span>
          <div class="${MOD_ID}-path-box">${esc(folderPath)}</div>
        </div>

        ${showWarning ? `
        <div class="${MOD_ID}-symlink-warn">
          <strong>⚠ Symlink or external path detected</strong>
          This folder is a symlink or lives outside <code>/DATA</code> on disk.
          CasaOS only shows shortcuts for paths that are real directories inside
          <code>/DATA</code>. You need to create a new symlink in <code>/DATA</code>
          pointing to the actual target of this folder.<br><br>
          <span style="color:var(--text-3,#7880a0);font-size:11px">Symlink name in /DATA:</span>
          <div class="${MOD_ID}-symlink-name-row">
            <label>/DATA/</label>
            <input id="${MOD_ID}-slname" type="text"
                   value="${esc(symlinkName)}" maxlength="64"
                   placeholder="symlink-name" spellcheck="false"/>
          </div>
          <div class="${MOD_ID}-cmd-wrap">
            <div class="${MOD_ID}-cmd-box" id="${MOD_ID}-cmd">${esc(buildSymlinkCmd(folderPath, symlinkName))}</div>
            <button class="${MOD_ID}-copy-btn" id="${MOD_ID}-copy">
              <i class="casa casa-copy-outline"></i> Copy
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px">
            <div style="font-size:11px;color:var(--text-3,#7880a0)">
              Run the command above, then click <strong>Pin Shortcut</strong>.
            </div>
            <button class="${MOD_ID}-term-btn" id="${MOD_ID}-open-term">
              <i class="casa casa-terminal-outline"></i> Open Terminal
            </button>
          </div>
        </div>` : ""}

        <div class="${MOD_ID}-field">
          <label class="${MOD_ID}-label" for="${MOD_ID}-name">Shortcut name</label>
          <input id="${MOD_ID}-name" class="${MOD_ID}-input"
                 type="text" maxlength="48"
                 value="${esc(baseName(folderPath))}"
                 placeholder="Display name…" />
        </div>

        <div class="${MOD_ID}-field">
          <span class="${MOD_ID}-label">Icon</span>
          <div class="${MOD_ID}-icon-search">
            <i class="casa casa-search-outline"></i>
            <input id="${MOD_ID}-ifilter" type="text"
                   placeholder="Filter icons…" maxlength="32"/>
          </div>
          <div class="${MOD_ID}-picker" id="${MOD_ID}-picker">
            ${renderPicker(selIcon,"")}
          </div>
        </div>

        <div class="${MOD_ID}-footer">
          <button class="${MOD_ID}-btn ${MOD_ID}-btn-cancel" id="${MOD_ID}-cancel">Cancel</button>
          <button class="${MOD_ID}-btn ${MOD_ID}-btn-ok" id="${MOD_ID}-ok">
            <i class="casa casa-folder-plus-outline"></i> Pin Shortcut
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const nameEl        = overlay.querySelector(`#${MOD_ID}-name`);
    const filterEl      = overlay.querySelector(`#${MOD_ID}-ifilter`);
    const picker        = overlay.querySelector(`#${MOD_ID}-picker`);
    const okBtn         = overlay.querySelector(`#${MOD_ID}-ok`);
    const cancelBtn     = overlay.querySelector(`#${MOD_ID}-cancel`);
    const symlinkNameEl = overlay.querySelector(`#${MOD_ID}-slname`);
    const cmdEl         = overlay.querySelector(`#${MOD_ID}-cmd`);
    const copyBtn       = overlay.querySelector(`#${MOD_ID}-copy`);
    const openTermBtn   = overlay.querySelector(`#${MOD_ID}-open-term`);

    // ── Live-update command when symlink name changes ──
    if (showWarning && symlinkNameEl) {
      symlinkNameEl.addEventListener("input", () => {
        const sl = symlinkNameEl.value.trim() || safeSymlinkName(folderPath);
        if (cmdEl) cmdEl.textContent = buildSymlinkCmd(folderPath, sl);
      });
    }

    // ── Copy command ──
    if (copyBtn && cmdEl) {
      copyBtn.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(cmdEl.textContent); }
        catch (_) {
          const r = document.createRange();
          r.selectNodeContents(cmdEl);
          getSelection().removeAllRanges();
          getSelection().addRange(r);
          document.execCommand("copy");
        }
        copyBtn.classList.add("copied");
        copyBtn.innerHTML = `<i class="casa casa-check-outline"></i> Copied!`;
        setTimeout(() => {
          copyBtn.classList.remove("copied");
          copyBtn.innerHTML = `<i class="casa casa-copy-outline"></i> Copy`;
        }, 2000);
      });
    }

    // ── Open Terminal button ──
    if (openTermBtn) {
      openTermBtn.addEventListener("click", e => {
        e.stopPropagation();
        openTerminalModal();
      });
    }

    // ── Icon picker ──
    picker.addEventListener("click", e => {
      const opt = e.target.closest(`.${MOD_ID}-ico-opt`);
      if (!opt) return;
      selIcon = opt.dataset.icon;
      picker.querySelectorAll(`.${MOD_ID}-ico-opt`)
            .forEach(o => o.classList.toggle("sel", o === opt));
    });

    filterEl.addEventListener("input", () => {
      picker.innerHTML = renderPicker(selIcon, filterEl.value.trim());
    });

    nameEl.addEventListener("input", () => {
      okBtn.disabled = !nameEl.value.trim();
    });

    // ── Confirm ──
    okBtn.addEventListener("click", async () => {
      const name = nameEl.value.trim();
      if (!name) return;
      const targetPath = pinnedPath();
      okBtn.disabled = true;
      okBtn.innerHTML = `<i class="casa casa-sync-outline"></i> Pinning…`;
      try {
        await onPin(name, selIcon, targetPath);
        overlay.remove();
      } catch (err) {
        if (err.message === "already-pinned") {
          toast("This folder is already pinned.", "inf");
          overlay.remove();
        } else {
          console.error("[pin-panel]", err);
          toast("Failed to pin — see console for details.", "err");
          okBtn.disabled = false;
          okBtn.innerHTML = `<i class="casa casa-folder-plus-outline"></i> Pin Shortcut`;
        }
      }
    });

    const close = () => overlay.remove();
    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    const escFn = e => {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escFn);
      }
    };
    document.addEventListener("keydown", escFn);
    setTimeout(() => nameEl.focus(), 60);
  }

  // TOOLBAR PIN BUTTON
  // Injects a "Pin" button next to the "Upload or create" button
  // in the file panel header. Uses the Vue component tree to read the current
  // open folder path at the moment the button is clicked.
  // ═══════════════════════════════════════════════════════════════════════════

  function findCurrentPath() {
    // Walk the Vue tree from #app looking for the file-panel component,
    // which holds currentPath in its data.
    function walk(vm, depth) {
      if (!vm || depth > 8) return null;
      if (vm.$options?.name === "file-panel") {
        const p = vm.$data?.currentPath || vm.$data?.path || vm.currentPath;
        if (typeof p === "string" && p.startsWith("/")) return p;
      }
      for (const c of (vm.$children || [])) {
        const found = walk(c, depth + 1);
        if (found) return found;
      }
      return null;
    }
    try { return walk(document.querySelector("#app").__vue__, 0); }
    catch (_) { return null; }
  }

  function injectPinButton(toolbar) {
    if (toolbar.querySelector(`.${MOD_ID}-pin-btn`)) return;

    const btn = document.createElement("button");
    btn.className = `${MOD_ID}-pin-btn button mr-2 is-small is-primary is-rounded`;
    btn.type      = "button";
    btn.title     = "Pin current folder to side panel";
    btn.innerHTML = `<i class="casa casa-folder-plus-outline"></i><span>Pin</span>`;

    btn.addEventListener("click", async () => {
      const folderPath = findCurrentPath();
      if (!folderPath) {
        toast("Could not resolve current folder path.", "err");
        return;
      }

      const isSymlink = await checkIsSymlink(folderPath);

      openModal(folderPath, isSymlink, async (name, icon, targetPath) => {
        const updated = await apiAddShortcut(targetPath, name, icon);
        toast(`"${name}" pinned to side panel`, "ok");
        refreshSidePanel(updated);
        setTimeout(() => refreshSidePanel(updated), 300);
        setTimeout(injectUnpinButtons, 500);
      });
    });

    // Insert before the upload/create dropdown (which is the first child of .action-btn)
    toolbar.insertBefore(btn, toolbar.firstChild);
  }

  function tryInjectPinButton() {
    // .action-btn lives inside .modal-card-head in the Files app
    // Try both the modal-card-head scoped version and a global fallback
    const actionBtn =
      document.querySelector(".modal-card-head .action-btn") ||
      document.querySelector(".action-btn");
    if (actionBtn) injectPinButton(actionBtn);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDE-PANEL UNPIN BUTTON
  // ═══════════════════════════════════════════════════════════════════════════
  function injectUnpinButtons() {
    const shortcuts = currentShortcutList();
    if (!shortcuts.length) return;

    document.querySelectorAll(
      ".list-container .li, [data-v-5cb5f976] .li"
    ).forEach(li => {
      if (li.querySelector(`.${MOD_ID}-unpin-slot`)) return;

      const listItem = li.querySelector(".list-item, .new-list-item");
      if (!listItem) return;

      const label = li.querySelector(".is-flex-grow-1")?.textContent?.trim();
      if (!label || NATIVE_SHORTCUT_NAMES.has(label)) return;

      const entry = shortcuts.find(s => s.name===label || baseName(s.path)===label);
      if (!entry) return;

      const slot = document.createElement("div");
      slot.className = `${MOD_ID}-unpin-slot`;

      const btn = document.createElement("button");
      btn.className = `${MOD_ID}-unpin-btn`;
      btn.title     = `Unpin "${label}" from side panel`;
      btn.setAttribute("aria-label", `Unpin ${label}`);
      btn.innerHTML = `<i class="casa casa-minus-outline"></i>`;

      btn.addEventListener("click", async e => {
        e.stopPropagation();
        e.preventDefault();
        btn.disabled = true;
        try {
          const updated = await apiRemoveShortcut(entry.path);
          toast(`"${label}" unpinned`, "ok");
          li.remove();
          refreshSidePanel(updated);
          setTimeout(() => refreshSidePanel(updated), 300);
        } catch (err) {
          console.error("[pin-panel] unpin failed:", err);
          toast("Failed to unpin — see console.", "err");
          btn.disabled = false;
        }
      });

      slot.appendChild(btn);
      listItem.appendChild(slot);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATION OBSERVER
  // ═══════════════════════════════════════════════════════════════════════════
  const observer = new MutationObserver(muts => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        // Re-inject pin button when the file panel header appears/changes
        if (node.classList?.contains("action-btn") ||
            node.classList?.contains("modal-card-head") ||
            node.querySelector?.(".action-btn") ||
            node.querySelector?.(".modal-card-head")) {
          setTimeout(tryInjectPinButton, 80);
        }
        // Side panel updated
        if (node.classList?.contains("list-container") ||
            node.classList?.contains("ul") ||
            node.classList?.contains("li") ||
            node.querySelector?.(".list-container")) {
          setTimeout(injectUnpinButtons, 100);
        }
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════════════════════════════
  function boot() {
    injectStyles();
    observer.observe(document.body, { childList: true, subtree: true });
    tryInjectPinButton();
    injectUnpinButtons();
    setInterval(injectUnpinButtons, 2500);
    setInterval(tryInjectPinButton, 2500);
  }

  if (document.readyState==="loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
