"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { EventPlanningWorkspace } from "./EventPlanningWorkspace";
import { IncidentOperations } from "./IncidentOperations";

export function OperationsWorkspace() {
  const searchParams = useSearchParams();
  const incidents = searchParams.get("view") === "incidents";

  return (
    <div className="space-y-6">
      <nav
        aria-label="Modul Operations"
        className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-2"
      >
        {[
          {
            active: !incidents,
            href: "/workspace/operations",
            label: "Event planning",
            icon: CalendarDays,
          },
          {
            active: incidents,
            href: "/workspace/operations?view=incidents",
            label: "Investigasi IT",
            icon: ShieldCheck,
          },
        ].map(({ active, href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "bg-primary text-white" : "text-textSecondary hover:bg-surfaceHover"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      {incidents ? <IncidentOperations /> : <EventPlanningWorkspace />}
    </div>
  );
}
