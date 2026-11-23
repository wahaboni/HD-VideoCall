import { AUTO_QUALITY, QUALITY_KEYS, QUALITY_PRESETS } from '../lib/quality.js';

/**
 * Segmented control untuk memilih kualitas video.
 * @param {{value: string, onChange: (value: string) => void, disabled?: boolean, compact?: boolean}} props
 */
export default function QualityToggle({ value, onChange, disabled = false, compact = false }) {
  return (
    <div
      role="radiogroup"
      aria-label="Kualitas video"
      className={`inline-grid grid-flow-col gap-1 rounded-2xl border p-1 shadow-lg shadow-cyan-950/20 backdrop-blur-xl ${
        compact
          ? 'border-slate-700/80 bg-slate-950/70'
          : 'border-slate-700 bg-slate-900/80'
      } ${compact ? 'text-xs' : 'text-sm'}`}
    >
      {QUALITY_KEYS.map((key) => {
        const preset = QUALITY_PRESETS[key];
        const label = key === AUTO_QUALITY ? 'AUTO' : preset.label;
        const active = value === key;
        const activeCls = compact
          ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
          : 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20';
        const idleCls = compact
          ? 'text-slate-400 hover:bg-slate-800 hover:text-cyan-200'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white';
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              active ? activeCls : idleCls
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {compact ? label : label}
            {preset && <span className="ml-2 hidden text-[11px] font-normal text-slate-400 sm:inline">
              {preset.width}×{preset.height}
            </span>}
          </button>
        );
      })}
    </div>
  );
}
