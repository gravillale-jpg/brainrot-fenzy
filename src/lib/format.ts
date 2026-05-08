// Pretty number formatter: 1.2K, 45M, 8.4B, 12T, 5.6Qa, 999Sx ...
const SUFFIXES = [
  "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
  "UDc", "DDc", "TDc", "QaDc", "QiDc", "SxDc", "SpDc", "ODc", "NDc", "Vg",
];

export function formatBToken(value: number | string | bigint): string {
  let n: number;
  if (typeof value === "bigint") n = Number(value);
  else if (typeof value === "string") n = Number(value);
  else n = value;
  if (!isFinite(n)) return "∞";
  if (n < 1000) return Math.floor(n).toString();
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(Math.abs(n)) / 3));
  const scaled = n / Math.pow(1000, tier);
  const str = scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
  return `${str}${SUFFIXES[tier]}`;
}

export function formatRate(value: number): string {
  return `${formatBToken(value)}/s`;
}
