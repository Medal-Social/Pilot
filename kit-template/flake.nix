{
  description = "kit-template — managed by kit";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nix-darwin = {
      url = "github:LnL7/nix-darwin";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    nix-homebrew.url = "github:zhaofengli-wip/nix-homebrew";
  };

  outputs = { self, nixpkgs, nix-darwin, nix-homebrew, ... }: {
    darwinConfigurations.example = nix-darwin.lib.darwinSystem {
      system = "aarch64-darwin";
      modules = [
        ./machines/example.nix
        nix-homebrew.darwinModules.nix-homebrew
        ({ ... }: {
          system.stateVersion = 5;
          users.users.you.home = "/Users/you";
          nix-homebrew = {
            enable = true;
            enableRosetta = true;
            user = "you";
          };
        })
      ];
    };
  };
}
