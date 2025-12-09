import React from "react";

export function SnowfallOverlay() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
        <div className="gather-snow-layer gather-snow-layer-1" aria-hidden />
        <div className="gather-snow-layer gather-snow-layer-2" aria-hidden />
      </div>
      <style jsx global>{`
        .gather-snow-layer {
          position: absolute;
          top: -20%;
          left: -20%;
          width: 160%;
          height: 160%;
          background-image:
            radial-gradient(3px 3px at 20% 30%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(2px 2px at 70% 20%, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(2.5px 2.5px at 40% 80%, rgba(255, 255, 255, 0.75), transparent),
            radial-gradient(2px 2px at 90% 60%, rgba(255, 255, 255, 0.65), transparent);
          background-size: 260px 260px;
          animation: gather-snowfall 18s linear infinite;
          opacity: 0.35;
        }

        .gather-snow-layer-2 {
          animation-duration: 24s;
          animation-direction: reverse;
          opacity: 0.25;
          filter: blur(0.5px);
        }

        @keyframes gather-snowfall {
          0% {
            transform: translate3d(0, -8%, 0) rotate(0deg);
          }
          100% {
            transform: translate3d(-3%, 18%, 0) rotate(1deg);
          }
        }
      `}</style>
    </>
  );
}
