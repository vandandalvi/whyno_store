export default function Loading() {
  return (
    <div className="container-x py-24" aria-busy="true" aria-live="polite">
      <div className="mx-auto h-2 w-40 animate-pulse rounded-full bg-line" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
