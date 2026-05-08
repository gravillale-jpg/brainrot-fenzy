// Profanity filter (RU + EN). Conservative basic list.
const BANNED = [
  // EN
  "fuck","shit","bitch","cunt","nigger","nigga","faggot","retard","whore","slut","dick","pussy","asshole",
  // RU (lat + cyr)
  "хуй","хуи","хуя","пизд","еба","ёба","блядь","бляд","сука","сучк","мудак","пидор","пидар","хер","залуп",
  "huy","pizd","ebal","blyad","suka","mudak","pidor","pidar",
];

export function isValidNickname(nick: string): { ok: true } | { ok: false; reason: "format" | "profanity" } {
  if (!/^[a-zA-Z0-9а-яА-ЯёЁ_]{3,20}$/.test(nick)) return { ok: false, reason: "format" };
  const lower = nick.toLowerCase();
  for (const b of BANNED) if (lower.includes(b)) return { ok: false, reason: "profanity" };
  return { ok: true };
}

export function generateAlternatives(nick: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 50 && out.length < 3; i++) {
    const variants = [
      `${nick}${Math.floor(Math.random() * 1000)}`,
      `${nick}_${Math.floor(Math.random() * 100)}`,
      `x${nick}x`,
      `${nick}${["pro","yt","tv","gg","xd"][Math.floor(Math.random() * 5)]}`,
    ];
    const v = variants[Math.floor(Math.random() * variants.length)];
    if (v.length <= 20 && !out.includes(v) && isValidNickname(v).ok) out.push(v);
  }
  return out;
}
