"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x mx-auto max-w-md py-32 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-mute">Please try again. If it keeps happening, come back in a little while.</p>
      <button onClick={reset} className="btn-primary mt-8">Try again</button>
    </div>
  );
}
