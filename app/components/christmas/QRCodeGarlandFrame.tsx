import React from "react";

type QRCodeGarlandFrameProps = {
  children: React.ReactNode;
};

export function QRCodeGarlandFrame({ children }: QRCodeGarlandFrameProps) {
  return (
    <div className="inline-block">
      <div className="rounded-2xl bg-white/95 px-4 py-4 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-50">
        {children}
      </div>
    </div>
  );
}
