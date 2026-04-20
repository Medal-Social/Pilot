{ ... }: let
  apps = builtins.fromJSON (builtins.readFile ./test-mac.apps.json);
in {
  homebrew.casks = apps.casks;
  homebrew.brews = apps.brews;
}
