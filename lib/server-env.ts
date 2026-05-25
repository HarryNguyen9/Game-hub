const requiredServerEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SESSION_SECRET"
] as const;

export type RequiredServerEnv = (typeof requiredServerEnv)[number];

export function getMissingServerEnv() {
  return requiredServerEnv.filter((name) => !process.env[name]);
}

export function envDiagnostics() {
  return Object.fromEntries(
    requiredServerEnv.map((name) => [
      name,
      {
        present: Boolean(process.env[name]),
        length: process.env[name]?.length || 0
      }
    ])
  ) as Record<RequiredServerEnv, { present: boolean; length: number }>;
}
