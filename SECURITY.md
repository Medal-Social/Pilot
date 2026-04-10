# Security Policy

## Reporting a Vulnerability

If you find a security vulnerability in Pilot, please report it responsibly.

**Do NOT open a public GitHub issue.**

Email: **security@medalsocial.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if you have one)

We will respond within 48 hours and work with you on a fix before public disclosure.

## Scope

- Pilot CLI (`@medalsocial/pilot`)
- Plugin system (`plugin.toml` manifests, permission validation)
- Skill deployment (`~/.pilot/skills/`, CLAUDE.md routing)
- Local data storage (`~/.pilot/`)

## Not in scope

- Third-party plugins (report to plugin maintainer)
- AI model behavior (report to model provider)
- Vulnerabilities in dependencies (report upstream, but let us know too)

## Supported Versions

We support the latest release. Update with `pilot update` or `brew upgrade pilot`.
