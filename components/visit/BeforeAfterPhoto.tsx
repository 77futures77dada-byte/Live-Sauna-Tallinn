"use client";

import { Camera } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";

type Status = "idle" | "uploading" | "done" | "error";

export function BeforeAfterPhoto({
  visitId,
  type,
  locale,
}: {
  visitId: string;
  type: "before" | "after";
  locale: Locale;
}) {
  const dict = getDictionary(locale).visit;
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
        setMessage(typeof data.error === "string" ? data.error : dict.uploadFailed);
        return;
      }

      setStatus("done");
    } catch {
      setStatus("error");
      setMessage(dict.networkError);
    }
  }

  const label = type === "before" ? dict.takeBeforePhoto : dict.takeAfterPhoto;

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-warm-border px-3 py-1.5 text-sm text-fjord transition-colors hover:bg-ivory">
        <Camera className="h-4 w-4 text-steam" aria-hidden />
        {status === "done" ? dict.photoSaved : status === "uploading" ? dict.uploading : label}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleChange}
          disabled={status === "uploading"}
        />
      </label>
      {message && <p className="mt-1 text-xs text-busy">{message}</p>}
    </div>
  );
}
