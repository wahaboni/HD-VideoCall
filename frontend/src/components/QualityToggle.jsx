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
      className={`inline-grid grid-flow-col gap-1 rounded-xl border p-1 backdrop-blur-xl ${
        compact
          ? 'border-white/20 bg-white/10'
          : 'border-white/60 bg-white/50'
      } ${compact ? 'text-xs' : 'text-sm'}`}
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
                ? compact
                  ? 'bg-white/90 text-indigo-600'
                  : 'bg-white text-indigo-600 shadow-sm'
                : compact
                  ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
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