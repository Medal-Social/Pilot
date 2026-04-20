{ ... }: let
  apps = builtins.fromJSON (builtins.readFile ./example.apps.json);
in {
  networking.hostName = "example";
  homebrew.casks = apps.casks;
  homebrew.brews = apps.brews;
}
