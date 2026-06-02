"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { fileToDataUrl, MAX_UPLOAD_BYTES } from "@/lib/file";
import {
  Camera,
  Trash2,
  LogOut,
  Shield,
  Lock,
  Check,
  Sun,
  Moon,
} from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell>
      <Settings />
    </AppShell>
  );
}

function Settings() {
  const { email, role, profile, updateProfile, logout, theme, setTheme } =
    useStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({
    emailDigest: true,
    productUpdates: false,
    leaderboard: true,
  });

  const displayName =
    profile.name || (email?.split("@")[0] ?? "You").replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pickAvatar = async (file?: File) => {
    if (!file) return;
    setAvatarErr(null);
    if (!file.type.startsWith("image/")) return setAvatarErr("Choose an image file.");
    if (file.size > MAX_UPLOAD_BYTES) return setAvatarErr("Image too large (~4.5MB max).");
    updateProfile({ avatar: await fileToDataUrl(file) });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
      <header className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-widest text-white/40">
          Account
        </p>
        <h1 className="mt-1.5 text-3xl font-medium tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your profile, security, and preferences.
        </p>
      </header>

      {/* Profile */}
      <Section title="Profile" subtitle="This is how you appear across the platform.">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover ring-1 ring-white/15"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-nonstop/15 text-lg font-semibold text-nonstop ring-1 ring-nonstop/30">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-surface-3 text-white transition hover:bg-surface-2"
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickAvatar(e.target.files?.[0])}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{displayName}</p>
            <p className="text-xs text-muted-2">{email}</p>
            {profile.avatar && (
              <button
                onClick={() => updateProfile({ avatar: "" })}
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-2 transition hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" /> Remove photo
              </button>
            )}
            {avatarErr && <p className="mt-1 text-xs text-red-400">{avatarErr}</p>}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              placeholder={displayName}
              className={inputCls}
            />
          </Field>
          <Field label="Title / role">
            <input
              value={profile.title}
              onChange={(e) => updateProfile({ title: e.target.value })}
              placeholder="e.g. Producer"
              className={inputCls}
            />
          </Field>
          <Field label="Phone">
            <input
              value={profile.phone}
              onChange={(e) => updateProfile({ phone: e.target.value })}
              placeholder="(555) 000-0000"
              className={inputCls}
            />
          </Field>
          <Field label="Age">
            <input
              type="number"
              min={13}
              max={120}
              value={profile.age || ""}
              onChange={(e) =>
                updateProfile({ age: parseInt(e.target.value, 10) || 0 })
              }
              placeholder="—"
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input value={email ?? ""} disabled className={`${inputCls} opacity-60`} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted-2">Changes save automatically.</p>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" subtitle="Choose how NonStop Financial looks.">
        <div className="grid gap-3 sm:grid-cols-2">
          <ThemeOption
            active={theme === "dark"}
            onClick={() => setTheme("dark")}
            icon={<Moon className="h-4 w-4" />}
            label="Dark"
            desc="The original, low-glare interface."
            swatch="#15161a"
          />
          <ThemeOption
            active={theme === "light"}
            onClick={() => setTheme("light")}
            icon={<Sun className="h-4 w-4" />}
            label="Light"
            desc="Bright paper for well-lit rooms."
            swatch="#ffffff"
          />
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" subtitle="Password and account access.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current password">
            <input type="password" placeholder="••••••••" className={inputCls} />
          </Field>
          <Field label="New password">
            <input type="password" placeholder="••••••••" className={inputCls} />
          </Field>
          <Field label="Confirm new">
            <input type="password" placeholder="••••••••" className={inputCls} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() =>
              setPwMsg(
                "Password updates activate once Supabase auth is connected (no backend in this preview)."
              )
            }
            className="inline-flex items-center gap-1.5 bg-nonstop px-4 py-2 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
          >
            <Lock className="h-4 w-4" /> Update password
          </button>
          {pwMsg && <span className="text-xs text-muted-2">{pwMsg}</span>}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
          <div className="flex items-center gap-2.5">
            <Shield className="h-4 w-4 text-zinc-300" />
            <div>
              <p className="text-sm text-white">
                Current role:{" "}
                <span className="font-semibold capitalize text-nonstop">
                  {role === "user" ? "Agent" : "Admin"}
                </span>
              </p>
              <p className="text-xs text-muted-2">
                Admins are assigned in lib/admins.ts. Switch views from the top
                bar.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.replace("/");
            }}
            className="inline-flex items-center gap-1.5 border border-line-2 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </Section>

      {/* Preferences */}
      <Section title="Preferences" subtitle="Notifications and visibility.">
        <div className="divide-y divide-line">
          {(
            [
              ["emailDigest", "Weekly progress digest", "A summary of your training each Monday."],
              ["productUpdates", "Product updates", "New features and announcements."],
              ["leaderboard", "Appear on team leaderboard", "Let teammates see your ranking."],
            ] as const
          ).map(([key, title, desc]) => (
            <div key={key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-white">{title}</p>
                <p className="text-xs text-muted-2">{desc}</p>
              </div>
              <Toggle
                on={prefs[key]}
                onToggle={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}
              />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

const inputCls =
  "w-full border border-line-2 bg-surface-2 px-3 py-2 text-sm text-white outline-none transition focus:border-nonstop";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
      <p className="mb-5 mt-0.5 text-sm text-muted">{subtitle}</p>
      {children}
    </section>
  );
}

function ThemeOption({
  active,
  onClick,
  icon,
  label,
  desc,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
  swatch: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-3 border p-3 text-left transition ${
        active
          ? "border-nonstop bg-nonstop/10"
          : "border-line-2 bg-surface-2 hover:border-line"
      }`}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line text-white"
        style={{ background: swatch, color: swatch === "#ffffff" ? "#18181b" : "#fff" }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          {label}
          {active && <Check className="h-3.5 w-3.5 text-nonstop" />}
        </span>
        <span className="block text-xs text-muted-2">{desc}</span>
      </span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
        on ? "bg-nonstop" : "bg-surface-3"
      }`}
    >
      <span
        className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      >
        {on && <Check className="h-3 w-3 text-nonstop" />}
      </span>
    </button>
  );
}
