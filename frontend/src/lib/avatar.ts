const AVATAR_TONES = [
  "bg-avatar-1 text-avatar-foreground",
  "bg-avatar-2 text-avatar-foreground",
  "bg-avatar-3 text-avatar-foreground",
  "bg-avatar-4 text-avatar-foreground",
  "bg-avatar-5 text-avatar-foreground",
  "bg-avatar-6 text-avatar-foreground",
] as const;

function hashName(name: string): number {
  let hash = 0;
  for (const character of name.trim().toLowerCase()) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash;
}

export function avatarTone(name: string): string {
  return AVATAR_TONES[hashName(name) % AVATAR_TONES.length] ?? AVATAR_TONES[0];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase() || "?";
}
