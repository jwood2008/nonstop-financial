"use client";

import React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { label: string; href: string };

const DEFAULT_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/contact" },
];

/**
 * Top navigation — same uppercase text labels, with the dock's "raise on
 * hover": each item springs up (and scales slightly) as you hover it. The
 * active route stays lit with an orange underline.
 */
function NavHeader({ items = DEFAULT_ITEMS }: { items?: NavItem[] }) {
  const pathname = usePathname();

  return (
    <ul className="flex items-end gap-0.5">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href + "/"));
        return (
          <li key={item.href}>
            <Link href={item.href} className="block">
              <motion.span
                whileHover={{ y: -5, scale: 1.12 }}
                transition={{ type: "spring", stiffness: 400, damping: 14 }}
                className={`relative inline-block origin-bottom cursor-pointer px-3 py-1.5 text-xs uppercase tracking-wide md:text-sm ${
                  active
                    ? "font-semibold text-white"
                    : "text-muted hover:text-white"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 bg-nonstop" />
                )}
              </motion.span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default NavHeader;
