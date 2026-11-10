export default function ConfBadge({ value }) {
  const pct = Math.round(value * 100);
  const tone = value >= 0.7 ? "bg-olive-100 text-leaf-700" : value >= 0.5 ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-800";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{pct}%</span>;
}
