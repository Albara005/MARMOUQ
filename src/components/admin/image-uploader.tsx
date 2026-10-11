"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CircleAlert, ImagePlus, RotateCcw, Trash2, X } from "lucide-react";
import type { MediaLike } from "@/components/ui/media-image";
import { cn } from "@/lib/utils";

export type { MediaLike };

/* Mirrors src/lib/media.ts (server-only) so we can reject bad files before uploading. */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];
const MAX_BYTES = 12 * 1024 * 1024;
const CONCURRENCY = 2;

type Upload = {
  key: string;
  name: string;
  file: File;
  preview: string;
  progress: number;
  status: "queued" | "uploading" | "error";
  error?: string;
};

function validate(file: File): string | null {
  const okType = ACCEPTED.includes(file.type) || (!file.type && /\.(heic|heif)$/i.test(file.name));
  if (!okType) return "صيغة غير مدعومة — استخدم JPG أو PNG أو WebP";
  if (file.size > MAX_BYTES) return "الحجم أكبر من 12 ميغابايت";
  if (file.size === 0) return "الملف فارغ";
  return null;
}

function uploadFile(file: File, alt: string | undefined, onProgress: (p: number) => void): Promise<MediaLike> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(0.96, e.loaded / e.total));
    };
    xhr.onload = () => {
      const body = xhr.response as { id?: string; blur?: string; width?: number; height?: number; error?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.id) {
        onProgress(1);
        resolve({ id: body.id, blur: body.blur, width: body.width, height: body.height, alt });
      } else {
        reject(new Error(body?.error ?? (xhr.status === 401 ? "انتهت الجلسة — سجّل الدخول مجدداً" : "تعذّر رفع الصورة")));
      }
    };
    xhr.onerror = () => reject(new Error("انقطع الاتصال أثناء الرفع"));
    const fd = new FormData();
    fd.append("file", file);
    if (alt) fd.append("alt", alt);
    xhr.send(fd);
  });
}

/**
 * Drag-and-drop image manager backed by POST /api/admin/upload.
 * Controlled: `value` is the ordered list (first = cover), `onChange` receives the next list.
 * Pair it with <MediaIdsInput name="images" value={value} /> inside a form.
 */
export function ImageUploader({
  value,
  onChange,
  multiple = true,
  max,
  label,
  hint,
  alt,
  className,
  disabled,
}: {
  value: MediaLike[];
  onChange: (next: MediaLike[]) => void;
  multiple?: boolean;
  max?: number;
  label?: string;
  hint?: string;
  /** alt text stored with every uploaded image (e.g. the product name) */
  alt?: string;
  className?: string;
  disabled?: boolean;
}) {
  const limit = multiple ? (max ?? 12) : 1;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // latest props for async callbacks
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const queueRef = useRef<Upload[]>([]);
  const activeRef = useRef(0);

  const patch = useCallback((key: string, p: Partial<Upload>) => {
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...p } : u)));
  }, []);

  const pump = useCallback(() => {
    while (activeRef.current < CONCURRENCY && queueRef.current.length) {
      const job = queueRef.current.shift()!;
      activeRef.current += 1;
      patch(job.key, { status: "uploading", progress: 0.02, error: undefined });
      uploadFile(job.file, alt, (p) => patch(job.key, { progress: p }))
        .then((media) => {
          const next = multiple ? [...valueRef.current, media].slice(0, limit) : [media];
          valueRef.current = next;
          onChangeRef.current(next);
          setUploads((list) => {
            const done = list.find((u) => u.key === job.key);
            if (done) URL.revokeObjectURL(done.preview);
            return list.filter((u) => u.key !== job.key);
          });
          setAnnounce(`تم رفع ${job.name}`);
        })
        .catch((err: Error) => {
          patch(job.key, { status: "error", error: err.message });
          setAnnounce(`فشل رفع ${job.name}: ${err.message}`);
        })
        .finally(() => {
          activeRef.current -= 1;
          pump();
        });
    }
  }, [alt, limit, multiple, patch]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setNotice(null);
      const list = Array.from(files);
      if (!list.length) return;
      const busy = uploads.filter((u) => u.status !== "error").length;
      const room = multiple ? Math.max(0, limit - valueRef.current.length - busy) : 1;
      if (room === 0) {
        setNotice(`الحد الأقصى ${limit} صور — احذف صورة لإضافة أخرى.`);
        return;
      }
      const accepted = list.slice(0, room);
      if (list.length > room) setNotice(`أُضيفت ${room} فقط — الحد الأقصى ${limit} صور.`);
      const created: Upload[] = accepted.map((file) => {
        const error = validate(file);
        return {
          key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          file,
          preview: URL.createObjectURL(file),
          progress: 0,
          status: error ? "error" : "queued",
          error: error ?? undefined,
        };
      });
      setUploads((prev) => (multiple ? [...prev, ...created] : created));
      queueRef.current.push(...created.filter((u) => u.status === "queued"));
      pump();
    },
    [limit, multiple, pump, uploads],
  );

  // revoke previews on unmount
  const uploadsRef = useRef(uploads);
  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);
  useEffect(() => () => uploadsRef.current.forEach((u) => URL.revokeObjectURL(u.preview)), []);

  const retry = (u: Upload) => {
    if (validate(u.file)) return;
    patch(u.key, { status: "queued", error: undefined, progress: 0 });
    queueRef.current.push(u);
    pump();
  };

  const dismiss = (u: Upload) => {
    URL.revokeObjectURL(u.preview);
    setUploads((list) => list.filter((x) => x.key !== u.key));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setAnnounce(`نُقلت الصورة إلى الموضع ${to + 1}`);
  };

  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
    setAnnounce("حُذفت الصورة");
  };

  const busyCount = uploads.filter((u) => u.status !== "error").length;
  const full = multiple ? value.length + busyCount >= limit : busyCount > 0;
  const isEmpty = value.length === 0 && uploads.length === 0;

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const dropzone = (
    <button
      type="button"
      onClick={openPicker}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center transition-colors duration-200 focus-visible:outline-copper disabled:cursor-not-allowed disabled:opacity-60",
        isEmpty ? "min-h-48 w-full px-6 py-8" : "aspect-[4/5] w-full px-3",
        dragOver ? "border-copper bg-copper/[0.06]" : "border-sand bg-ivory/60 hover:border-copper/60 hover:bg-bone/60",
      )}
      aria-describedby={`${inputId}-hint`}
    >
      <span className={cn("grid place-items-center rounded-full bg-paper text-copper-deep ring-1 ring-line transition-transform duration-300 group-hover:-translate-y-0.5", isEmpty ? "size-12" : "size-9")}>
        <ImagePlus className={isEmpty ? "size-5" : "size-4"} aria-hidden />
      </span>
      <span className={cn("font-medium text-espresso", isEmpty ? "text-sm" : "text-xs")}>
        {isEmpty ? (multiple ? "اسحب الصور هنا أو اختر من جهازك" : "اسحب الصورة هنا أو اختر من جهازك") : multiple ? "إضافة" : "استبدال"}
      </span>
      {isEmpty && <span className="text-xs text-taupe">JPG · PNG · WebP · HEIC — حتى 12 ميغابايت للصورة</span>}
    </button>
  );

  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-sm font-medium text-umber">{label}</p>}
      <div
        onDragOver={(e) => {
          if (disabled || !e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragOver(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        className={cn("rounded-2xl transition-colors", dragOver && !isEmpty && "bg-copper/[0.04] ring-2 ring-copper/30 ring-offset-4 ring-offset-paper")}
      >
        {isEmpty ? (
          dropzone
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5" aria-label="الصور">
            {value.map((m, i) => (
              <li
                key={m.id}
                draggable={!disabled}
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", m.id);
                }}
                onDragOver={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  move(dragIndex, i);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={cn(
                  "group studio-frame relative aspect-[4/5] cursor-grab overflow-hidden rounded-xl ring-1 ring-line transition-[transform,opacity,box-shadow] duration-200 active:cursor-grabbing",
                  dragIndex === i && "opacity-40",
                  overIndex === i && dragIndex !== null && dragIndex !== i && "ring-2 ring-copper",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/media/${m.id}/sm`}
                  alt={m.alt || `صورة ${i + 1}`}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={m.blur ? { backgroundImage: `url(${m.blur})`, backgroundSize: "cover" } : undefined}
                  draggable={false}
                  loading="lazy"
                />
                {i === 0 && multiple && (
                  <span className="absolute start-2 top-2 rounded-full bg-espresso/85 px-2 py-0.5 text-[0.65rem] font-medium text-paper backdrop-blur">الغلاف</span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-espresso/75 to-transparent p-1.5 pt-6 transition-opacity duration-200 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  {multiple ? (
                    <span className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(i, i - 1)}
                        disabled={i === 0 || disabled}
                        className="grid size-7 place-items-center rounded-full text-paper hover:bg-white/15 disabled:opacity-30"
                        aria-label={`تقديم الصورة ${i + 1}`}
                      >
                        <ChevronRight className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, i + 1)}
                        disabled={i === value.length - 1 || disabled}
                        className="grid size-7 place-items-center rounded-full text-paper hover:bg-white/15 disabled:opacity-30"
                        aria-label={`تأخير الصورة ${i + 1}`}
                      >
                        <ChevronLeft className="size-4" aria-hidden />
                      </button>
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={disabled}
                    className="grid size-7 place-items-center rounded-full text-paper hover:bg-danger/80"
                    aria-label={`حذف الصورة ${i + 1}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}

            {uploads.map((u) => (
              <li key={u.key} className="studio-frame relative aspect-[4/5] overflow-hidden rounded-xl ring-1 ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.preview} alt="" className={cn("absolute inset-0 h-full w-full object-cover", u.status === "error" ? "opacity-25 grayscale" : "opacity-60")} />
                {u.status === "error" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/70 p-2 text-center">
                    <CircleAlert className="size-5 text-danger" aria-hidden />
                    <p className="line-clamp-3 text-[0.68rem] leading-4 text-danger">{u.error}</p>
                    <div className="flex items-center gap-1">
                      {!validate(u.file) && (
                        <button type="button" onClick={() => retry(u)} className="grid size-7 place-items-center rounded-full bg-paper text-espresso ring-1 ring-line hover:bg-bone" aria-label={`إعادة رفع ${u.name}`}>
                          <RotateCcw className="size-3.5" aria-hidden />
                        </button>
                      )}
                      <button type="button" onClick={() => dismiss(u)} className="grid size-7 place-items-center rounded-full bg-paper text-espresso ring-1 ring-line hover:bg-bone" aria-label={`إزالة ${u.name}`}>
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-x-2 bottom-2">
                    <div className="mb-1 flex items-center justify-between text-[0.65rem] font-medium text-espresso">
                      <span>{u.status === "queued" ? "بالانتظار" : u.progress >= 0.96 ? "معالجة…" : "جارٍ الرفع"}</span>
                      <span className="tabular-nums">{Math.round(u.progress * 100)}%</span>
                    </div>
                    <div
                      className="h-1 overflow-hidden rounded-full bg-paper/80"
                      role="progressbar"
                      aria-label={`رفع ${u.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(u.progress * 100)}
                    >
                      <div className="h-full rounded-full bg-copper transition-[width] duration-300" style={{ width: `${Math.max(4, u.progress * 100)}%` }} />
                    </div>
                  </div>
                )}
              </li>
            ))}

            {!full && <li>{dropzone}</li>}
          </ul>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p id={`${inputId}-hint`} className="mt-2 text-xs leading-relaxed text-taupe">
        {notice ? <span className="text-warning">{notice}</span> : (hint ?? (multiple ? "الصورة الأولى هي الغلاف — اسحب الصور لإعادة ترتيبها. يُفضّل تصوير بنسبة 4:5." : "يُفضّل صورة بنسبة 4:5 وبدقة عالية."))}
      </p>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

/** Hidden input carrying the ordered media ids as JSON (parse on the server with `parseMediaIds`). */
export function MediaIdsInput({ name, value }: { name: string; value: MediaLike[] }) {
  return <input type="hidden" name={name} value={JSON.stringify(value.map((m) => m.id))} />;
}
