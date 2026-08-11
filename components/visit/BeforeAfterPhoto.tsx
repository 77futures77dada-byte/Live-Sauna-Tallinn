"use client";

import { useState, type ChangeEvent } from "react";

type Status = "idle" | "uploading" | "done" | "error";

export function BeforeAfterPhoto({
  visitId,
  type,
}: {
  visitId: string;
  type: "before" | "after";
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file again later

    if (!file) return;

    setStatus("uploading");
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("visit_id", visitId);
    formData.append("type", type);

    try {
      const res = await fetch("/api/photos", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" ? data.error : "Upload failed");
        return;
      }

      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  }

  const label = type === "before" ? "Take before photo" : "Take after photo";

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
        📷{" "}
        {status === "done"
          ? "Photo saved ✓"
          : status === "uploading"
            ? "Uploading…"
            : label}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleChange}
          disabled={status === "uploading"}
        />
      </label>
      {message && <p className="mt-1 text-xs text-red-600">{message}</p>}
    </div>
  );
}
