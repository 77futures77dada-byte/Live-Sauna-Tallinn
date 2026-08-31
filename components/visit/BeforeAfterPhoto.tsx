"use client";

import { Camera, RotateCcw } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { fetchWithTimeout, TimeoutError } from "@/lib/fetch-timeout";
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
  // Keep the picked file so "Retry" can re-send it without the visitor
  // having to re-open the camera after a flaky upload.
  const [file, setFile] = useState<File | null>(null);

  async function upload(toUpload: File) {
    setStatus("uploading");
    setMessage(null);

    const formData = new FormData();
    formData.append("file", toUpload);
    formData.append("visit_id", visitId);
    formData.append("type", type);

    try {
      const res = await fetchWithTimeout("/api/photos", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" ? data.error : dict.uploadFailed);
        return;
      }

      setStatus("done");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof TimeoutError ? dict.uploadTimeout : dict.networkError);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file again later
    if (!picked) return;
    setFile(picked);
    void upload(picked);
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

      {status === "error" && (
        <div className="mt-1 space-y-1">
          {message && <p className="text-xs text-busy">{message}</p>}
          {file && (
            <button
              type="button"
              onClick={() => void upload(file)}
              className="inline-flex items-center gap-1 rounded-lg border border-warm-border px-2 py-1 text-xs text-fjord transition-colors hover:bg-ivory"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              {dict.retry}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
