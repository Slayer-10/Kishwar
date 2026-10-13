"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export type RegistrationRouteCategory = "AMBASSADOR" | "NO_AMBASSADOR" | "UNKNOWN";

export type AdminRegistrationRow = {
  id: string;
  eventName: string;
  registrantName: string;
  type: string;
  status: string;
  invoiceStatus: string | null;
  invoiceAmount: string | null;
  registeredAt: string;
  ambassadorId: string | null;
  ambassadorName: string | null;
  routeCategory?: RegistrationRouteCategory;
};

type Category = "ALL" | "AMBASSADOR" | "NO_AMBASSADOR" | "UNKNOWN";

export function AdminRegistrationFilters({
  registrations,
}: {
  registrations: AdminRegistrationRow[];
}) {
  const [category, setCategory] = useState<Category>("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const events = useMemo(
    () => Array.from(new Set(registrations.map((r) => r.eventName))).sort(),
    [registrations]
  );

  const counts = useMemo(() => {
    return {
      ALL: registrations.length,
      AMBASSADOR: registrations.filter((r) =>
        r.routeCategory ? r.routeCategory === "AMBASSADOR" : r.ambassadorId !== null
      ).length,
      NO_AMBASSADOR: registrations.filter((r) =>
        r.routeCategory ? r.routeCategory === "NO_AMBASSADOR" : r.ambassadorId === null
      ).length,
      UNKNOWN: registrations.filter((r) => r.routeCategory === "UNKNOWN").length,
    };
  }, [registrations]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return registrations.filter((r) => {
      const rowCategory: RegistrationRouteCategory =
        r.routeCategory ?? (r.ambassadorId !== null ? "AMBASSADOR" : "NO_AMBASSADOR");

      const categoryMatches =
        category === "ALL" ||
        (category === "AMBASSADOR" && rowCategory === "AMBASSADOR") ||
        (category === "NO_AMBASSADOR" && rowCategory === "NO_AMBASSADOR") ||
        (category === "UNKNOWN" && rowCategory === "UNKNOWN");

      const eventMatches =
        eventFilter === "ALL" || r.eventName === eventFilter;

      const searchMatches =
        !query ||
        r.registrantName.toLowerCase().includes(query) ||
        r.eventName.toLowerCase().includes(query) ||
        (r.ambassadorName ?? "").toLowerCase().includes(query);

      return categoryMatches && eventMatches && searchMatches;
    });
  }, [registrations, category, eventFilter, search]);

  const tabClass = (active: boolean) =>
    `rounded-md border px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
      active
        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
        : "border-[var(--color-divider)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-background)]"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Registration category">
        <button
          type="button"
          className={tabClass(category === "ALL")}
          onClick={() => setCategory("ALL")}
        >
          All Registrations ({counts.ALL})
        </button>

        <button
          type="button"
          className={tabClass(category === "AMBASSADOR")}
          onClick={() => setCategory("AMBASSADOR")}
        >
          Ambassador ({counts.AMBASSADOR})
        </button>

        <button
          type="button"
          className={tabClass(category === "NO_AMBASSADOR")}
          onClick={() => setCategory("NO_AMBASSADOR")}
        >
          No Ambassador ({counts.NO_AMBASSADOR})
        </button>

        {counts.UNKNOWN > 0 && (
          <button
            type="button"
            className={tabClass(category === "UNKNOWN")}
            onClick={() => setCategory("UNKNOWN")}
          >
            Unknown ({counts.UNKNOWN})
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search participant, event, or ambassador..."
          aria-label="Search registrations"
          className="min-w-0 flex-1 rounded-md border border-[var(--color-divider)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          aria-label="Filter by event"
          className="rounded-md border border-[var(--color-divider)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="ALL">All Events</option>
          {events.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr
              style={{
                backgroundColor: "var(--color-secondary)",
                color: "#FFFFFF",
              }}
              className="h-[48px] font-heading text-xs uppercase tracking-wider"
            >
              <th className="px-5 py-3 font-semibold">Event</th>
              <th className="px-5 py-3 font-semibold">Registrant</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Registration Route</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Invoice</th>
              <th className="px-5 py-3 font-semibold">Registered</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--color-divider)]">
            {filtered.map((r) => {
              const rowCategory =
                r.routeCategory ?? (r.ambassadorId !== null ? "AMBASSADOR" : "NO_AMBASSADOR");

              return (
                <tr
                  key={r.id}
                  className="h-[56px] transition-colors hover:bg-[rgba(106,172,220,0.08)]"
                >
                  <td className="px-5 py-3 font-semibold text-[var(--color-text)]">
                    {r.eventName}
                  </td>

                  <td className="px-5 py-3 text-[var(--color-text)]">
                    {r.registrantName}
                  </td>

                  <td className="px-5 py-3 text-[var(--color-text-muted)]">
                    {r.type}
                  </td>

                  <td className="px-5 py-3">
                    {rowCategory === "AMBASSADOR" ? (
                      <div>
                        <span className="font-semibold text-[var(--color-text)]">
                          Ambassador
                        </span>
                        {r.ambassadorName && (
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {r.ambassadorName}
                          </p>
                        )}
                      </div>
                    ) : rowCategory === "NO_AMBASSADOR" ? (
                      <span className="font-medium text-[var(--color-text-muted)]">
                        No Ambassador
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Unknown
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3">
                    <StatusBadge status={r.status as any} />
                  </td>

                  <td className="px-5 py-3 text-[var(--color-text)]">
                    {r.invoiceStatus ? (
                      <span className="flex items-center gap-2">
                        <StatusBadge status={r.invoiceStatus as any} />
                        {r.invoiceAmount ? (
                          <span className="text-xs font-semibold">PKR {r.invoiceAmount}</span>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-5 py-3 text-[var(--color-text-muted)]">
                    {new Date(r.registeredAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-[var(--color-text-muted)]"
                >
                  No registrations match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        Showing {filtered.length} of {registrations.length} registrations
      </p>
    </div>
  );
}
