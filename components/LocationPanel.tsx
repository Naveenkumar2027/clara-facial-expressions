import React from 'react';
import type { LocationPanelData } from '../data/locations_database';

const INSTITUTION_NAME = 'Sai Vidya Institution of Technology';

interface LocationPanelProps {
  data: LocationPanelData;
  onClose: () => void;
}

/**
 * Displays a location navigation panel exactly as in the design:
 * Title, institution pill, floor, START FROM, FOLLOW THESE STEPS, CITATIONS.
 */
const LocationPanel: React.FC<LocationPanelProps> = ({ data, onClose }) => {
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 w-full max-w-md rounded-xl border border-green-500/30 bg-black/90 shadow-[0_0_30px_rgba(34,197,94,0.15)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 border-b border-green-500/20">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-wide text-green-400 uppercase">
            {data.title}
          </h2>
          <span className="rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-400 border border-green-500/40">
            {INSTITUTION_NAME}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          aria-label="Close"
        >
          <span className="text-lg font-bold">×</span>
        </button>
      </div>

      {/* Floor */}
      <div className="px-4 pt-3">
        <span className="inline-block rounded-full bg-blue-500/25 px-3 py-1 text-sm text-blue-300 border border-blue-500/40">
          {data.floorName}
        </span>
      </div>

      {/* START FROM */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-500/90 mb-1">
          Start from
        </p>
        <p className="text-sm text-white/90 leading-relaxed">
          {data.startFrom}
        </p>
      </div>

      {/* FOLLOW THESE STEPS */}
      <div className="px-4 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-500/90 mb-2">
          Follow these steps
        </p>
        <ol className="space-y-2">
          {data.steps.map((step, i) => (
            <li key={i}>
              <span className="inline-block w-full rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-200/95 text-left">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* CITATIONS */}
      {data.citationIds.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-500/90 mb-2">
            Citations
          </p>
          <div className="flex flex-wrap gap-2">
            {data.citationIds.map((id) => (
              <span
                key={id}
                className="rounded-full bg-blue-500/25 px-3 py-1 text-sm text-white border border-blue-500/40"
              >
                #{id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPanel;
