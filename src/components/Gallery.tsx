"use client";

import Image from "next/image";
import { useState } from "react";

export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [i, setI] = useState(0);
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const current = images[i];
  const showFallback = !current || broken.has(i);
  return (
    <div>
      <div className="card relative aspect-square overflow-hidden">
        {showFallback ? (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-sand to-line text-mute" role="img" aria-label={name}>No photo yet</div>
        ) : (
          <Image key={current.url} src={current.url} alt={current.alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="rise object-cover" onError={() => setBroken(new Set(broken).add(i))} />
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-4 flex gap-3 overflow-x-auto pb-1" aria-label="Product photos">
          {images.map((img, n) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setI(n)}
                aria-label={`Show photo ${n + 1} of ${images.length}`}
                aria-current={n === i}
                className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 transition ${n === i ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
