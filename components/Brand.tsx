import Link from "next/link";

/**
 * Official NonStop artwork, extracted from the brand guide (transparent PNGs in
 * /public/brand). The mark is the "flock of arrows" rising into an N.
 */

export function NonstopMark({ className = "h-7 w-9" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/mark-color.png"
      alt="NonStop"
      className={`object-contain ${className}`}
    />
  );
}

/** Horizontal lockup — the official NONSTOP FINANCIAL logo. */
export function Logo({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`flex items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-horizontal-color.png"
        alt="NonStop Financial"
        className="h-7 w-auto"
      />
    </Link>
  );
}
