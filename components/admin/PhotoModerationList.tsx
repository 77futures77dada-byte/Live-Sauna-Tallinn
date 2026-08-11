"use client";

import { useState } from "react";

export interface PendingPhoto {
  id: string;
  type: string;
  createdAt: string;
  locationName: string;
  username: string;
  url: string | null;
}

export function PhotoModerationList({ photos: initial }: { photos: PendingPhoto[] }) {
  const [photos, setPhotos] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function moderate(photoId: string, action: "approve" | "reject") {
    setBusyId(photoId);
    try {
      const res = await fetch("/api/admin/photos/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_id: photoId, action }),
      });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (photos.length === 0) {
    return <p className="mt-2 text-sm text-zinc-500">No photos waiting for moderation.</p>;
  }

  return (
    <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
      {photos.map((photo) => (
        <li key={photo.id} className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
          {photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL, expires
            <img src={photo.url} alt={`${photo.type} photo`} className="h-32 w-full rounded-lg object-cover" />
          ) : (
            <div className="flex h-32 w-full items-center justify-center rounded-lg bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">
              No preview
            </div>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            {photo.locationName} · {photo.type} · {photo.username}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busyId === photo.id}
              onClick={() => moderate(photo.id, "approve")}
              className="flex-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busyId === photo.id}
              onClick={() => moderate(photo.id, "reject")}
              className="flex-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
