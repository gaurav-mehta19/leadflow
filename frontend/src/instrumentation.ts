export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerEnvironment } = await import("@/lib/server-startup");
    validateServerEnvironment();
  }
}
