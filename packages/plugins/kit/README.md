# kit

> Your machine, version-controlled.

**Open-source MDM and dotfiles for engineers.** Reproducible Mac/Linux setups in one command. Secure secrets, transparent config, fully portable. No vendor lock-in.

## What it does

- `kit init` — bootstrap a fresh machine in one command (Xcode CLT, Nix, SSH, GitHub auth, repo clone, system rebuild)
- `kit new` — scaffold a brand-new kit repo for a fresh user
- `kit update` — pull latest config and rebuild
- `kit status` — health check (machine info, apps, secrets, repo state)
- `kit apps add|remove|list` — manage Homebrew casks/brews
- `kit edit` — open the current machine's config in your editor

## How it works

kit reads a `kit.config.json` from your dotfiles repo. The repo holds your Nix configuration plus an `apps.json` per machine. Run `kit update` to pull the latest config and apply it.

## Install

kit ships bundled with [pilot](https://github.com/Medal-Social/pilot). Install pilot, then:

```bash
pilot up kit       # installs the kit shell alias
kit status         # try it out
```

You can also invoke commands directly via `pilot kit ...` — both forms are equivalent.

## License

Apache-2.0. Source-available — issues and security reports welcome. Code contributions outside the Medal Social team aren't actively solicited.

## What's next

- Medal Social Provider (kit v1.1) — opt into org policy, fleet inventory, push-based config updates
