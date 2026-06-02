import { Logo } from "@/components/Brand";

/** Shared chrome so /login and /signup look identical. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-12">
      {/* brand glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(80% 60% at 50% -10%, rgba(255,95,31,0.18), rgba(255,95,31,0.03) 45%, transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-7 shadow-xl shadow-black/30">
          <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
        <p className="mt-6 text-center text-[11px] text-muted-2">
          © 2026 NonStop Financial · Private preview
        </p>
      </div>
    </div>
  );
}

export const authInputCls =
  "w-full rounded-lg border border-line-2 bg-surface-2 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-2 focus:border-nonstop";

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-2">
        {label}
      </span>
      {children}
    </label>
  );
}
