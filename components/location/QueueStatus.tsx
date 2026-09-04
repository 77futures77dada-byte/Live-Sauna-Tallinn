"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { OpenQueueEntry, QueueLive } from "@/lib/queue";

async function fetchMyEntry(): Promise<MyEntry | null> {
  try {
    const res = await fetch("/api/queue");
    if (!res.ok) return null;
    const data: { entry: MyEntry | null } = await res.json();
    return data.entry;
  } catch {
    return null;
  }
}

type MyEntry = {
  id: string;
  location_id: string;
  joined_at: string;
  groups_ahead: number;
};

// "Elav järjekord" — the live queue block on the location detail card
// (mockup screen 3). Viewing needs no account; only joining does (mockup
// screen 4). The numbers themselves are the aggregate from
// /api/queue/live (polled in MapScreen, passed in as `queue`); when the
// viewer is in this sauna's queue, their own "N ahead of you" replaces the
// generic count, fetched from /api/queue.
//
// The join / leave button is a genuinely new action (POST/DELETE
// /api/queue). "Report status" and "I'm here" stay where they were on the
// card, over their existing endpoints — this block doesn't duplicate them.
export function QueueStatus({
  locationId,
  locale,
  userId,
  queue,
  openQueueEntry,
  onQueueChanged,
}: {
  locationId: string;
  locale: Locale;
  userId: string | null;
  queue: QueueLive | undefined;
  openQueueEntry: OpenQueueEntry | null;
  onQueueChanged: (entry: OpenQueueEntry | null) => void;
}) {
  const t = getDictionary(locale).queue;
  const [myEntry, setMyEntry] = useState<MyEntry | null>(null);
  const [busy, setBusy] = useState<"idle" | "joining" | "leaving">("idle");
  const [error, setError] = useState<string | null>(null);

  // Mirrors a freshly fetched entry into local state and up to MapScreen
  // (so the SSR-seeded openQueueEntry stays in sync after a join/leave).
  const applyEntry = useCallback(
    (entry: MyEntry | null) => {
      setMyEntry(entry);
      onQueueChanged(
        entry
          ? { id: entry.id, locationId: entry.location_id, joinedAt: entry.joined_at }
          : null,
      );
    },
    [onQueueChanged],
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchMyEntry().then((entry) => {
      if (!cancelled) applyEntry(entry);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, applyEntry]);

  const activeLocationId = myEntry?.location_id ?? openQueueEntry?.locationId ?? null;
  const inQueueHere = activeLocationId === locationId;
  const inQueueElsewhere = activeLocationId !== null && !inQueueHere;

  const aggregateGroups = queue?.groupsAhead ?? 0;
  const wait = queue?.estimatedWaitMinutes ?? null;

  async function join() {
    setBusy("joining");
    setError(null);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : t.joinFailed);
      } else {
        applyEntry(await fetchMyEntry());
      }
    } catch {
      setError(t.joinFailed);
    }
    setBusy("idle");
  }

  async function leave() {
    setBusy("leaving");
    setError(null);
    try {
      await fetch("/api/queue", { method: "DELETE" });
      applyEntry(await fetchMyEntry());
    } catch {
      // Best-effort; the next queue read reconciles.
    }
    setBusy("idle");
  }

  return (
    <div className="mt-5 rounded-lg border border-warm-border bg-lake-soft/60 p-3">
      <h3 className="font-display text-sm font-semibold text-fjord">{t.sectionTitle}</h3>

      {inQueueHere && myEntry ? (
        <p className="mt-1.5 text-sm text-fjord">
          <span className="font-semibold text-lake">{t.youInQueue}</span> ·{" "}
          {t.yourPosition.replace("{n}", String(myEntry.groups_ahead))}
          {wait !== null && ` · ${t.listWait.replace("{n}", String(wait))}`}
        </p>
      ) : aggregateGroups > 0 ? (
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-steam">
          <span className="text-2xl font-bold text-fjord">{aggregateGroups}</span>
          <span>{t.groupsAhead}</span>
          {wait !== null && (
            <>
              <span className="ml-1 text-2xl font-bold text-ember">
                {t.listWait.replace("{n}", String(wait))}
              </span>
              <span>{t.estimatedWait}</span>
            </>
          )}
        </p>
      ) : (
        <p className="mt-1 text-sm text-steam">{t.empty}</p>
      )}

      <p className="mt-2 text-xs leading-relaxed text-steam">{t.estimateNote}</p>

      <div className="mt-3">
        {!userId ? (
          <Link href="/login" className="text-xs font-medium text-fjord underline">
            {t.loginToJoin}
          </Link>
        ) : inQueueElsewhere ? (
          <p className="text-xs text-steam">{t.inQueueElsewhere}</p>
        ) : inQueueHere ? (
          <button
            type="button"
            onClick={leave}
            disabled={busy !== "idle"}
            className="rounded-lg border border-warm-border bg-ivory px-3 py-1.5 text-sm font-medium text-fjord transition hover:bg-ivory-shade disabled:opacity-50"
          >
            {busy === "leaving" ? t.leaving : t.leave}
          </button>
        ) : (
          <button
            type="button"
            onClick={join}
            disabled={busy !== "idle"}
            className="rounded-lg bg-ember px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy === "joining" ? t.joining : t.join}
          </button>
        )}
        {error && <p className="mt-1 text-xs text-busy">{error}</p>}
      </div>
    </div>
  );
}
