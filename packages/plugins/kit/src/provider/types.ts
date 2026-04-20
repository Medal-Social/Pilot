// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

export interface ProviderContext {
  readonly machineId: string;
  readonly user: string;
  readonly kitRepoDir: string;
  readonly authToken?: string;
}

export interface RequiredApp {
  readonly name: string;
  readonly reason: string;
}

export interface RequiredApps {
  readonly casks: ReadonlyArray<RequiredApp>;
  readonly brews: ReadonlyArray<RequiredApp>;
  readonly source: string;
}

export interface RequiredPlugin {
  readonly id: string;
  readonly reason: string;
}

export interface RequiredPlugins {
  readonly plugins: ReadonlyArray<RequiredPlugin>;
  readonly source: string;
}

export interface SecurityCheck {
  readonly id: string;
  readonly description: string;
  readonly required: boolean;
}

export interface StatusReport {
  readonly machineId: string;
  readonly os: string;
  readonly arch: string;
  readonly kitCommit: string | null;
  readonly appsCount: number;
}

export type ProviderEventHandler = (event: { type: string; payload: unknown }) => void;

export interface Disposable {
  dispose(): void;
}

export interface FleetProvider {
  readonly id: string;
  readonly displayName: string;

  getRequiredApps(ctx: ProviderContext): Promise<RequiredApps>;
  getRequiredPlugins(ctx: ProviderContext): Promise<RequiredPlugins>;
  getSecurityBaseline(ctx: ProviderContext): Promise<SecurityCheck[]>;
  reportStatus(ctx: ProviderContext, report: StatusReport): Promise<void>;
  subscribe?(ctx: ProviderContext, handler: ProviderEventHandler): Disposable;
}
