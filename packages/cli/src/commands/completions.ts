// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

const BASH_COMPLETION = `_pilot_completions() {
  local commands="crew down help plugins repl status training uninstall up update completions"
  COMPREPLY=($(compgen -W "$commands" -- "\${COMP_WORDS[COMP_CWORD]}"))
}
complete -F _pilot_completions pilot
`;

const ZSH_COMPLETION = `#compdef pilot
_pilot() {
  local commands=(crew down help plugins repl status training uninstall up update completions)
  _describe 'command' commands
}
_pilot
`;

const FISH_COMPLETION = `complete -c pilot -f
complete -c pilot -n '__fish_use_subcommand' -a crew -d 'Manage your AI crew'
complete -c pilot -n '__fish_use_subcommand' -a down -d 'Remove a template'
complete -c pilot -n '__fish_use_subcommand' -a help -d 'Show help'
complete -c pilot -n '__fish_use_subcommand' -a plugins -d 'Manage plugins'
complete -c pilot -n '__fish_use_subcommand' -a status -d 'System status'
complete -c pilot -n '__fish_use_subcommand' -a training -d 'Knowledge base'
complete -c pilot -n '__fish_use_subcommand' -a uninstall -d 'Uninstall Pilot'
complete -c pilot -n '__fish_use_subcommand' -a up -d 'Setup templates'
complete -c pilot -n '__fish_use_subcommand' -a update -d 'Check for updates'
complete -c pilot -n '__fish_use_subcommand' -a completions -d 'Shell completions'
`;

const SCRIPTS: Record<string, string> = {
  bash: BASH_COMPLETION,
  zsh: ZSH_COMPLETION,
  fish: FISH_COMPLETION,
};

export async function runCompletions(shell: string) {
  const script = SCRIPTS[shell];
  if (!script) {
    process.stderr.write(`Unknown shell: ${shell}. Supported shells: bash, zsh, fish\n`);
    process.exit(1);
  }
  process.stdout.write(script);
}
