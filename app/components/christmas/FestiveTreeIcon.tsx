import React from "react";

type FestiveTreeIconProps = {
  size?: number;
  className?: string;
};

export function FestiveTreeIcon({ size = 32, className }: FestiveTreeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Tronc */}
      <rect x="14" y="22" width="4" height="6" rx="1" fill="#8B5A2B" />

      {/* Niveaux de branches (3 triangles verts) */}
      <path d="M16 3 L7 14 H25 Z" fill="#16A34A" />
      <path d="M16 8 L8 18 H24 Z" fill="#15803D" />
      <path d="M16 12 L9 21 H23 Z" fill="#166534" />

      {/* Guirlande : courbe claire */}
      <path
        d="M9.5 15 C13 17, 19 17, 22.5 15"
        stroke="#FACC15"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10 19 C13.2 20.5, 18.8 20.5, 22 19"
        stroke="#FDBA74"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Boules sur la guirlande */}
      <circle cx="11" cy="14.8" r="1.1" fill="#F97316" />
      <circle cx="16" cy="16.2" r="1.1" fill="#F9A8D4" />
      <circle cx="21" cy="14.8" r="1.1" fill="#38BDF8" />

      <circle cx="12" cy="18.8" r="1.1" fill="#FACC15" />
      <circle cx="16" cy="20" r="1.1" fill="#F97316" />
      <circle cx="20" cy="18.8" r="1.1" fill="#22C55E" />

      {/* Petite étoile */}
      <path
        d="M16 2.1 L17 3.7 L18.8 4 L17.5 5.2 L17.8 7 L16 6.2 L14.2 7 L14.5 5.2 L13.2 4 L15 3.7 Z"
        fill="#FACC15"
      />
    </svg>
  );
}
