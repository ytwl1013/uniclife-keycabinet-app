import path from 'node:path';

import { config } from 'dotenv';

export type RuntimeEnvironment = 'development' | 'production' | 'test';

const runtimeEnvironments = new Set<RuntimeEnvironment>(['development', 'production', 'test']);

export function resolveRuntimeEnvironment(value = process.env.NODE_ENV): RuntimeEnvironment {
  if (value && runtimeEnvironments.has(value as RuntimeEnvironment)) {
    return value as RuntimeEnvironment;
  }

  return 'development';
}

export function loadEnvironmentFiles(
  backendRoot: string,
  runtimeEnvironment = resolveRuntimeEnvironment(),
): void {
  const candidates = [
    `.env.${runtimeEnvironment}.local`,
    `.env.${runtimeEnvironment}`,
    '.env.local',
    '.env',
  ];

  for (const candidate of candidates) {
    config({ path: path.join(backendRoot, candidate), override: false });
  }
}
