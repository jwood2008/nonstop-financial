"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { track } from "@/lib/supabase";
import { ArrowUpRight, Pencil, X, Plus, Trash2, ShoppingCart } from "lucide-react";

export default function BuyLeadsPage() {
  return (
    <AppShell>
      <BuyLeads />
    </AppShell>
  );
}

/** Ensure a vendor link is safe + absolute before we open it in a new tab. */
function normalizeUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Pretty host for a subtitle, e.g. "goatleads.com". */
function hostOf(url: string): string {
  const n = normalizeUrl(url);
  if (!n) return "";
  try {
    return new URL(n).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function BuyLeads() {
  const { leadVendors, canBeAdmin, addLeadVendor, updateLeadVendor, removeLeadVendor } =
    useStore();
  const [editing, setEditing] = useState(false);

  const live = leadVendors.filter((v) => normalizeUrl(v.url));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
      <PageHeader
        label="Buy Leads"
        title="Buy leads"
        meta="Purchase leads from our partner vendors. Pick a vendor to open their site in a new tab."
        actions={
          canBeAdmin ? (
            <button
              onClick={() => setEditing((e) => !e)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                editing
                  ? "border-nonstop bg-nonstop text-white"
                  : "border-white/15 bg-white/[0.04] text-white/70 hover:text-white"
              }`}
            >
              {editing ? (
                <>
                  <X className="h-3.5 w-3.5" /> Done
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" /> Edit vendors
                </>
              )}
            </button>
          ) : undefined
        }
      />

      {/* Vendor cards — what everyone sees */}
      {live.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {live.map((v) => {
            const href = normalizeUrl(v.url)!;
            const host = hostOf(v.url);
            return (
              <a
                key={v.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("buy_leads_click", v.id)}
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-nonstop/40 hover:shadow-[0_18px_44px_-18px_rgba(255,95,31,0.35)]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-nonstop/15 text-nonstop">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-white">{v.name}</p>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40 transition group-hover:text-nonstop" />
                  </div>
                  {v.description && (
                    <p className="mt-0.5 text-sm text-white/55">{v.description}</p>
                  )}
                  {host && <p className="mt-1 text-xs text-white/35">{host}</p>}
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
          <ShoppingCart className="mx-auto h-8 w-8 text-white/25" />
          <p className="mt-3 text-sm text-white/55">No lead vendors yet.</p>
          {canBeAdmin && (
            <p className="mt-1 text-xs text-white/40">
              Use “Edit vendors” above to add a vendor and their link.
            </p>
          )}
        </div>
      )}

      {/* Admin editor */}
      {canBeAdmin && editing && (
        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs text-white/45">
            Changes publish to everyone automatically. Paste each vendor’s referral link —
            a vendor only appears above once it has a valid link.
          </p>
          {leadVendors.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="grid min-w-[16rem] flex-1 gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={v.name}
                    onChange={(e) => updateLeadVendor(v.id, { name: e.target.value })}
                    placeholder="Vendor name — e.g. Aria Mortgage Leads"
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white placeholder:text-white/35 outline-none focus:border-nonstop"
                  />
                  <input
                    value={v.description}
                    onChange={(e) =>
                      updateLeadVendor(v.id, { description: e.target.value })
                    }
                    placeholder="Short description (optional)"
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-nonstop"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={v.url}
                    onChange={(e) => updateLeadVendor(v.id, { url: e.target.value })}
                    placeholder="Referral link — https://…"
                    className="flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/35 outline-none focus:border-nonstop"
                  />
                  {normalizeUrl(v.url) && (
                    <a
                      href={normalizeUrl(v.url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Test this link"
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/50 transition hover:text-white"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeLeadVendor(v.id)}
                title="Remove this vendor"
                className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/45 transition hover:border-red-400/40 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addLeadVendor()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-nonstop hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add vendor
          </button>
        </div>
      )}
    </div>
  );
}
