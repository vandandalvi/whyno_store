"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";

export type Img = { url: string; objectKey: string; alt: string; width: number | null; height: number | null };
type Pending = { id: string; name: string; progress: number; error?: string };

const MAX = 10;

function upload(file: File, onProgress: (n: number) => void): Promise<Img> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/uploads");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: { error?: string } & Partial<Img> = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status === 201 && body.url && body.objectKey) resolve({ url: body.url, objectKey: body.objectKey, alt: "", width: body.width ?? null, height: body.height ?? null });
      else reject(new Error(xhr.status === 401 ? "Your session ended. Please sign in again." : body.error ?? "Upload failed. Please try again."));
    };
    xhr.onerror = () => reject(new Error("Connection problem. Please try again."));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

export function ImageUploader({ images, onChange }: { images: Img[]; onChange: (next: Img[]) => void }) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const live = useRef(images);
  live.current = images;

  async function addFiles(list: FileList | File[]) {
    const files = [...list].slice(0, Math.max(0, MAX - live.current.length));
    for (const file of files) {
      const id = crypto.randomUUID();
      setPending((p) => [...p, { id, name: file.name, progress: 0 }]);
      try {
        const img = await upload(file, (n) => setPending((p) => p.map((x) => (x.id === id ? { ...x, progress: n } : x))));
        onChange([...live.current, img]);
        live.current = [...live.current, img];
        setPending((p) => p.filter((x) => x.id !== id));
      } catch (e) {
        setPending((p) => p.map((x) => (x.id === id ? { ...x, error: (e as Error).message } : x)));
      }
    }
  }

  const move = (i: number, d: -1 | 1) => {
    const next = [...images];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void addFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl2 border-2 border-dashed px-6 py-10 text-center transition ${drag ? "border-ink bg-lime/30" : "border-line bg-white"}`}
      >
        <ImagePlus className="h-8 w-8 text-mute" aria-hidden />
        <p className="font-medium">Drag photos here</p>
        <p className="text-sm text-mute">JPG, PNG or WebP · up to 5 MB each · at least 200×200 px</p>
        <button type="button" className="btn-ghost mt-2" onClick={() => input.current?.click()} disabled={images.length >= MAX}>Choose photos</button>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose product photos" onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {pending.length > 0 && (
        <ul className="mt-4 space-y-2" aria-live="polite">
          {pending.map((p) => (
            <li key={p.id} className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate">{p.name}</span>
                {p.error ? (
                  <button type="button" className="shrink-0 font-medium text-red-700 underline" onClick={() => setPending((x) => x.filter((y) => y.id !== p.id))}>Dismiss</button>
                ) : <span>{p.progress}%</span>}
              </div>
              {p.error ? <p className="mt-1 text-red-700">{p.error}</p> : <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full bg-ink transition-all" style={{ width: `${p.progress}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}

      {images.length > 0 && (
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.objectKey} className="card overflow-hidden">
              <div className="relative aspect-square bg-sand">
                <Image src={img.url} alt={img.alt || `Photo ${i + 1}`} fill sizes="200px" className="object-cover" unoptimized />
                {i === 0 && <span className="badge absolute left-2 top-2 bg-lime text-lime-ink">Main photo</span>}
                <button type="button" onClick={() => onChange(images.filter((_, n) => n !== i))} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-card hover:bg-red-50" aria-label={`Remove photo ${i + 1}`}><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-2 p-3">
                <label className="sr-only" htmlFor={`alt-${i}`}>Describe photo {i + 1}</label>
                <input id={`alt-${i}`} className="input !min-h-[44px]" placeholder="Describe the photo" maxLength={160} value={img.alt} onChange={(e) => onChange(images.map((x, n) => (n === i ? { ...x, alt: e.target.value } : x)))} />
                <div className="flex justify-between">
                  <button type="button" className="btn-ghost !min-h-[40px] !px-3" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`}><ArrowLeft className="h-4 w-4" /></button>
                  <button type="button" className="btn-ghost !min-h-[40px] !px-3" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={`Move photo ${i + 1} later`}><ArrowRight className="h-4 w-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
