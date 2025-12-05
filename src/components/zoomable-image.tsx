"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ZoomableImageProps = {
  src?: string;
  alt?: string;
  className?: string;
};

export default function ZoomableImage({
  src,
  alt = "",
  className,
}: ZoomableImageProps) {
  if (!src) {
    return (
      <div className="h-[260px] w-[180px] rounded-xl border border-slate-700/60 flex items-center justify-center text-xs text-slate-400">
        No image
      </div>
    );
  }

  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Thumbnail / normal size */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/70 transition hover:border-emerald-400/80 hover:ring-2 hover:ring-emerald-400/40 ${
          className ?? ""
        }`}
      >
        <Image
          src={src}
          alt={alt}
          width={260}
          height={360}
          className="h-full w-full object-cover"
        />
      </button>

      {/* Fullscreen-ish dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl border-slate-700 bg-slate-950/95 p-3">
          <div className="relative mx-auto aspect-[2.5/3.5] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-600/80 bg-slate-900">
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(min-width: 1024px) 768px, 90vw"
              className="object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
