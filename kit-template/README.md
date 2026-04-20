# kit-template

A minimal, opinionated starter for managing your Mac or Linux machine with
[kit](https://github.com/Medal-Social/pilot) — open-source MDM and dotfiles for
engineers. Reproducible setups in one command. Secure secrets, transparent
config, fully portable. No vendor lock-in.

## Why this template

You want a reproducible machine setup that:

- Lives in a git repo you own
- Installs apps declaratively (no more "I forgot to install X")
- Moves with you to a new machine in one command
- Is easy to edit — just a few files, no framework

This template gives you that in under 10 files.

## Quick start

### Option 1 — Click "Use this template" (recommended)

1. Click **Use this template** → **Create a new repository** on GitHub
2. Name it `dotfiles` (or whatever you like), make it public or private
3. On your machine:

   ```sh
   # Install pilot if you haven't yet
   curl -fsSL https://pilot.medal.tv/install.sh | sh

   # Clone your new repo and bootstrap
   git clone git@github.com:YOU/dotfiles.git ~/dotfiles
   cd ~/dotfiles
   pilot kit init example
   ```

### Option 2 — Scaffold from scratch

If you'd rather generate the same structure locally:

```sh
pilot kit new
```

This produces an equivalent tree you can push anywhere.

## What's inside

```
kit-template/
├── flake.nix                          # Nix entry point — defines your machine(s)
├── kit.config.json                    # kit's config — lists machines + types
├── machines/
│   ├── example.nix                    # Machine-specific Nix config (hostname, apps)
│   └── example.apps.json              # Apps installed via Homebrew (casks + brews)
├── .gitignore
├── LICENSE                            # MIT
└── README.md
```

Nothing else. No framework, no build step, no hidden magic.

## First-time setup

After cloning:

1. **Rename the machine.** Replace `example` with your machine's hostname
   everywhere it appears (`flake.nix`, `machines/example.nix`,
   `kit.config.json`, and the filenames under `machines/`).
2. **Set your username.** In `flake.nix`, replace `you` with your macOS/Linux
   username. Do the same in `kit.config.json`.
3. **Set your repo.** In `kit.config.json`, replace `github:YOU/dotfiles` with
   your actual repo URL.
4. **Run `pilot kit init <machine>`** — kit will install Nix (if missing),
   build your flake, and set up everything defined in `machines/<machine>.nix`.

## Daily use

```sh
# Check machine health
pilot kit status

# Install an app
pilot kit apps add cask:slack
pilot kit apps add brew:httpie

# Remove an app
pilot kit apps remove cask:slack

# See what's installed
pilot kit apps list

# Sync with upstream (pull + rebuild)
pilot kit update

# Edit your machine config in $EDITOR
pilot kit edit
```

Every change to your apps list is a normal git commit — so `git log` is your
machine's history.

## Default apps

This template ships with a sensible starter set:

**Casks** (GUI apps): Zed, Ghostty, Geist Mono font
**Brews** (CLI tools): ripgrep, fd, gh, jq, fzf, bat, eza

Swap anything you don't want. The list is just `machines/example.apps.json` —
edit it directly or use `pilot kit apps add/remove`.

## Multiple machines

Add another machine by:

1. Adding an entry to `kit.config.json`:
   ```json
   "machines": {
     "example": { "type": "darwin", "user": "you" },
     "laptop":  { "type": "darwin", "user": "you" }
   }
   ```
2. Adding `darwinConfigurations.laptop = ...` to `flake.nix`
3. Creating `machines/laptop.nix` and `machines/laptop.apps.json`

Each machine can share or diverge as much as you like — they're just files.

## Linux (NixOS)

This template defaults to macOS (`nix-darwin`). For a NixOS machine, change
`type` to `nixos` in `kit.config.json` and swap the flake inputs. See
`pilot kit new` with a NixOS target for a reference layout.

## Philosophy

- **You own it.** Your config lives in your repo, under your git history.
- **No vendor lock-in.** Kit reads standard Nix and a tiny JSON file. Delete
  kit tomorrow and your setup still works with `darwin-rebuild` directly.
- **Transparent.** Every install, every change, is visible in the diff.
- **Portable.** Clone on a new machine, run `pilot kit init`, done.

## License

MIT — fork freely.
