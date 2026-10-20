// Environment access without a hard dependency on the Deno global, so the pure
// modules in this folder can be imported by vitest.

export type EnvReader = (name: string) => string | undefined;

interface DenoLike {
  env: { get(name: string): string | undefined };
}

export const readEnv: EnvReader = (name) => {
  const deno = (globalThis as { Deno?: DenoLike }).Deno;
  const value = deno?.env.get(name);
  return value === "" ? undefined : value;
};

export function isDevEnv(env: EnvReader = readEnv): boolean {
  return env("ENV") === "dev";
}

export class ConfigError extends Error {
  constructor(readonly variable: string) {
    super(`Missing configuration: ${variable}`);
    this.name = "ConfigError";
  }
}

/** Required secret. In ENV=dev a placeholder keeps local runs possible; production fails closed. */
export function requireSecret(name: string, env: EnvReader = readEnv): string {
  const value = env(name);
  if (value) return value;
  if (isDevEnv(env)) return `dev-${name.toLowerCase()}`;
  throw new ConfigError(name);
}

export function siteUrl(env: EnvReader = readEnv): string {
  return (env("SITE_URL") ?? "https://www.peyzajbul.com").replace(/\/+$/, "");
}
