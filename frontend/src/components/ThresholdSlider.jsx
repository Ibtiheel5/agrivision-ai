export default function ThresholdSlider({ value, onChange }) {
  return (
    <label className="block rounded-lg border border-line bg-white p-4">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
        <span>Seuil de confiance</span>
        <span className="rounded bg-brand px-2 py-0.5 text-white">{Math.round(value * 100)} %</span>
      </div>
      <input
        type="range"
        min="0.05"
        max="0.95"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-brand"
      />
      <p className="mt-1 text-xs text-slate-500">Seules les détections au-dessus du seuil sont affichées.</p>
    </label>
  );
}
