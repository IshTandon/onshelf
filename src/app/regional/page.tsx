"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { generateRegionalStores } from "@/lib/regional";
import type { RegionalStore } from "@/types";

type SortKey = "completionRate7d" | "rupeesAtRiskPerHour" | "openTasks";

function formatPct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function RegionalPage() {
  const stores = useMemo(() => generateRegionalStores(), []);
  const [sortKey, setSortKey] = useState<SortKey>("completionRate7d");
  const [ascending, setAscending] = useState(true);

  const sorted = useMemo(() => {
    return [...stores].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return ascending ? diff : -diff;
    });
  }, [stores, sortKey, ascending]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setAscending(!ascending);
    } else {
      setSortKey(key);
      setAscending(key === "completionRate7d");
    }
  }

  function SortHeader({
    label,
    sortKeyName,
    align = "left",
  }: {
    label: string;
    sortKeyName: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === sortKeyName;
    return (
      <th
        className={`px-4 py-3 text-xs font-medium text-neutral-500 cursor-pointer select-none ${
          align === "right" ? "text-right" : "text-left"
        } ${active ? "text-neutral-900" : ""}`}
        onClick={() => handleSort(sortKeyName)}
      >
        {label}
        {active && (ascending ? " ↑" : " ↓")}
      </th>
    );
  }

  return (
    <div className="regional-layout min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900 mb-4 inline-block">
          ← Store view
        </Link>
        <h1 className="text-2xl font-medium mb-1">Regional overview</h1>
        <p className="text-neutral-500 mb-6">12 stores · Bangalore region</p>

        <div className="overflow-x-auto border border-neutral-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">
                  Store
                </th>
                <SortHeader label="Open tasks" sortKeyName="openTasks" align="right" />
                <SortHeader
                  label="₹/hr at risk"
                  sortKeyName="rupeesAtRiskPerHour"
                  align="right"
                />
                <SortHeader
                  label="7d completion"
                  sortKeyName="completionRate7d"
                  align="right"
                />
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500">
                  Phantom rate
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500">
                  Coverage
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((store) => (
                <StoreRow key={store.id} store={store} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StoreRow({ store }: { store: RegionalStore }) {
  const isLowAdoption = store.completionRate7d < 0.2;

  return (
    <tr
      className={`border-b border-neutral-100 ${
        isLowAdoption ? "bg-red-50/40" : ""
      }`}
    >
      <td className="px-4 py-3 font-medium">
        {store.name}
        {isLowAdoption && (
          <span className="ml-2 text-xs text-urgent font-normal">
            Low adoption
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{store.openTasks}</td>
      <td className="px-4 py-3 text-right tabular-nums font-medium">
        {formatRupee(store.rupeesAtRiskPerHour)}
      </td>
      <td
        className={`px-4 py-3 text-right tabular-nums ${
          isLowAdoption ? "text-urgent font-medium" : ""
        }`}
      >
        {formatPct(store.completionRate7d)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
        {formatPct(store.phantomRate)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
        {formatPct(store.cameraCoverage)}
      </td>
    </tr>
  );
}
