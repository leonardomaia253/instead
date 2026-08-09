export function getPublicAppOrigin() {
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.APP_ORIGIN;
  if (!origin) throw new Error("NEXT_PUBLIC_APP_ORIGIN or APP_ORIGIN is required");
  return origin.replace(/\/$/, "");
}
