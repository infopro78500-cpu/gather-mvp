import React from "react";

const ornaments = [
  { top: "5%", left: "18%", color: "bg-amber-400" },
  { top: "12%", right: "18%", color: "bg-red-400" },
  { top: "48%", left: "6%", color: "bg-emerald-300" },
  { top: "62%", right: "6%", color: "bg-sky-200" },
  { bottom: "12%", left: "22%", color: "bg-rose-300" },
  { bottom: "6%", right: "22%", color: "bg-yellow-200" },
];

export function QRCodeGarland() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="absolute inset-[-8px] rounded-2xl border-2 border-emerald-200/90 shadow-[0_0_0_4px_rgba(16,185,129,0.12)] backdrop-blur-[1px]" aria-hidden />
      <div className="absolute inset-[-14px] rounded-3xl border border-amber-200/80 blur-[1px]" aria-hidden />
      <div className="absolute inset-[-18px] rounded-3xl bg-gradient-to-r from-emerald-300/20 via-amber-200/30 to-emerald-200/20 animate-pulse" aria-hidden />
      {ornaments.map((ornament, index) => (
        <span
          key={`${ornament.color}-${index}`}
          className={`absolute w-2.5 h-2.5 rounded-full shadow-md shadow-emerald-900/20 ${ornament.color}`}
          style={{ ...("top" in ornament ? { top: ornament.top } : {}), ...("bottom" in ornament ? { bottom: ornament.bottom } : {}), ...("left" in ornament ? { left: ornament.left } : {}), ...("right" in ornament ? { right: ornament.right } : {}) }}
          aria-hidden
        />
      ))}
    </div>
  );
}
