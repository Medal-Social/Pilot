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

## Response Process

| Stage | Timeline | Description |
|-------|----------|-------------|
| Acknowledgment | 48 hours | We confirm receipt of your report |
| Triage | 7 days | We assess severity, confirm or reject the vulnerability |
| Fix development | Varies by severity | Critical: 7 days. High: 30 days. Medium/Low: next release |
| Coordinated disclosure | 90 days max | We coordinate with you on public disclosure timing |
| Release + credit | At disclosure | Fix is released, reporter is credited |

We follow [coordinated vulnerability disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). We will not take legal action against researchers who follow this process.

## Reporter Credit

We credit vulnerability reporters in:
- The release notes for the fix
- The [Security Credits](docs/SECURITY-CREDITS.md) page

Reporters may request anonymity. We will not publish your name or contact information without your explicit consent.

## Scope

- Pilot CLI (`@medalsocial/pilot`)
- Plugin system (`plugin.toml` manifests, permission validation)
- Skill deployment (`~/.pilot/skills/`, CLAUDE.md routing)
- Local data storage (`~/.pilot/`)

## Not in Scope

- Third-party plugins (report to plugin maintainer)
- AI model behavior (report to model provider)
- Vulnerabilities in dependencies (report upstream, but let us know too)

## Supported Versions

We support the latest release. Update with `pilot update` or `brew upgrade pilot`.

## Verifying Releases

### npm packages

npm packages are published with [provenance attestation](https://docs.npmjs.com/generating-provenance-statements). Verify with:

```bash
npm audit signatures
```

### Binary releases

Binary releases are signed with [Sigstore cosign](https://docs.sigstore.dev/) using keyless signing tied to the GitHub Actions build identity. Verify with:

```bash
cosign verify-blob \
  --signature pilot-darwin-arm64.sig \
  --certificate pilot-darwin-arm64.pem \
  --certificate-identity "https://github.com/Medal-Social/pilot/.github/workflows/build-binaries.yml@refs/tags/v*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  pilot-darwin-arm64
```

Signature files (`.sig`) and certificate files (`.pem`) are attached to each GitHub Release alongside the binaries.
