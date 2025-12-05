"use client";

import { useState } from "react";
import ZoomableImage from "@/components/zoomable-image";

type FlippableImageProps = {
  frontUrl?: string;
  backUrl?: string;
  alt: string;
  className?: string;
};

export function FlippableImage({
  frontUrl,
  backUrl,
  alt,
  className = "",
}: FlippableImageProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const canFlip = !!backUrl;

  return (
    <div className={`relative ${className}`}>
      {/* 3D flip container */}
      <div
        className="aspect-[2.5/3.5] w-full rounded-md ring-1 ring-emerald-400/40 overflow-hidden"
        style={{ perspective: "1000px" }}
      >
        <div
          className="h-full w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0"
            style={{ backfaceVisibility: "hidden" }}
          >
            <ZoomableImage src={frontUrl} alt={alt} />
          </div>

          {/* Back */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {backUrl ? (
              <ZoomableImage src={backUrl} alt={alt} />
            ) : (
              <div className="h-full w-full bg-black/90" />
            )}
          </div>
        </div>
      </div>

      {/* Flip button */}
      {canFlip && (
        <button
          type="button"
          onClick={() => setIsFlipped((v) => !v)}
          className="absolute bottom-1 right-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/40 hover:bg-black/90"
        >
          {isFlipped ? "Show front" : "Show back"}
        </button>
      )}
    </div>
  );
}
