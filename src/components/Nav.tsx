"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Gaps" },
  { href: "/health", label: "Health" },
  { href: "/regional", label: "Regional" },
];

export function Nav() {
  const pathname = usePathname();

  if (pathname === "/regional") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 safe-bottom">
      <div className="flex max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 py-3 text-center text-xs ${
                active ? "text-neutral-900 font-medium" : "text-neutral-400"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
