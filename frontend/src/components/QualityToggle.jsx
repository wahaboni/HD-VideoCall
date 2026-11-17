import { QUALITY_KEYS, QUALITY_PRESETS } from '../lib/quality.js';

/**
 * Segmented control untuk memilih kualitas video.
 * @param {{value: string, onChange: (value: string) => void, disabled?: boolean, compact?: boolean}} props
 */
export default function QualityToggle({ value, onChange, disabled = false, compact = false }) {
  return (
    <div
      role="radiogroup"
      aria-label="Kualitas video"
      className={`inline-grid grid-flow-col gap-1 rounded-xl border border-slate-700/60 bg-slate-900/70 p-1 ${
        compact ? 'text-xs' : 'text-sm'
      }`}
    >
      {QUALITY_KEYS.map((key) => {
        const preset = QUALITY_PRESETS[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              active
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {compact ? key.toUpperCase() : preset.label}
            <span className="ml-2 hidden text-[11px] font-normal text-slate-400 sm:inline">
              {preset.width}×{preset.height}
            </span>
          </button>
        );
      })}
    </div>
  );
}