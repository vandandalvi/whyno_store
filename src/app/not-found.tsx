import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x mx-auto max-w-md py-32 text-center">
      <p className="font-display text-7xl font-bold">404</p>
      <h1 className="mt-4 text-2xl font-semibold">We can’t find that page</h1>
      <p className="mt-2 text-mute">It may have moved or no longer be available.</p>
      <Link href="/products" className="btn-primary mt-8">Browse the shop</Link>
    </div>
  );
}
