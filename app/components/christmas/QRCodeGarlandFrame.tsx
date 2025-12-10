import React from "react";

type QRCodeGarlandFrameProps = {
  children: React.ReactNode;
};

const ornaments = [
  { cx: 18, cy: 20, color: "#f97316" },
  { cx: 46, cy: 14, color: "#facc15" },
  { cx: 78, cy: 18, color: "#ef4444" },
  { cx: 94, cy: 32, color: "#22d3ee" },
  { cx: 98, cy: 62, color: "#f59e0b" },
  { cx: 86, cy: 94, color: "#fb7185" },
  { cx: 54, cy: 102, color: "#38bdf8" },
  { cx: 26, cy: 96, color: "#f43f5e" },
  { cx: 10, cy: 70, color: "#fde047" },
  { cx: 8, cy: 44, color: "#22c55e" },
];

export function QRCodeGarlandFrame({ children }: QRCodeGarlandFrameProps) {
  return (
    <div className="group relative inline-block">
      <div className="pointer-events-none absolute inset-0">
        <svg
          className="h-full w-full"
          viewBox="0 0 110 110"
          role="presentation"
          aria-hidden
        >
          <g
            fill="none"
            stroke="#15803D"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.9"
          >
            <path d="M9 26 C 28 12, 52 12, 78 22 S 101 32, 100 22" />
            <path d="M98 26 C 104 44, 104 64, 98 80 S 96 104, 100 96" />
            <path d="M101 88 C 78 100, 54 102, 30 94 S 7 86, 10 92" />
            <path d="M12 92 C 6 74, 6 54, 12 38 S 16 12, 10 20" />
          </g>
          {ornaments.map((ornament, index) => (
            <circle
              key={`${ornament.cx}-${ornament.cy}-${index}`}
              cx={ornament.cx}
              cy={ornament.cy}
              r={4.5}
              fill={ornament.color}
              fillOpacity={0.95}
              stroke="#ffffff"
              strokeWidth={0.6}
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
            />
          ))}
        </svg>
      </div>

      <div className="relative rounded-2xl bg-white/95 px-4 py-4 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-50 transition-shadow duration-200 group-hover:shadow-xl group-hover:shadow-emerald-900/15">
        {children}
      </div>
    </div>
  );
}
