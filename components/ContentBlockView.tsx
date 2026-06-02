"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { fileToDataUrl, MAX_UPLOAD_BYTES } from "@/lib/file";
import type { ContentBlock, BlockType } from "@/lib/types";
import { QuizEditor, QuizPlayer } from "@/components/QuizBlock";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Play,
  ImageIcon,
  Film,
  Type,
  ListChecks,
  Upload,
  Link2,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";

const TYPE_META: Record<BlockType, { label: string; icon: typeof Play; accept: string }> = {
  video: { label: "VIDEO HERE", icon: Play, accept: "video/*" },
  image: { label: "IMAGE HERE", icon: ImageIcon, accept: "image/*" },
  gif: { label: "GIF HERE", icon: Film, accept: "image/gif,image/*" },
  text: { label: "TEXT BLOCK", icon: Type, accept: "" },
  quiz: { label: "QUIZ", icon: ListChecks, accept: "" },
};

function isEmbed(src: string) {
  return /youtube\.com|youtu\.be|vimeo\.com|player\.|mux\.com\/embed/i.test(src);
}
function embedUrl(src: string) {
  const yt = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = src.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return src;
}

export function ContentBlockView({
  lessonId,
  block,
  editing,
  index = 0,
  total = 1,
}: {
  lessonId: string;
  block: ContentBlock;
  editing: boolean;
  index?: number;
  total?: number;
}) {
  if (editing)
    return (
      <EditableBlock lessonId={lessonId} block={block} index={index} total={total} />
    );
  return <RenderBlock block={block} />;
}

/* ---------- read-only render (what users see) ---------- */
function RenderBlock({ block }: { block: ContentBlock }) {
  const { type, src, caption } = block;

  if (type === "quiz") {
    return <QuizPlayer block={block} />;
  }

  if (type === "text") {
    return (
      <div className="border border-line bg-surface p-6">
        <p className="whitespace-pre-wrap leading-relaxed text-zinc-200">
          {caption || (
            <span className="text-muted-2">Text block — empty.</span>
          )}
        </p>
      </div>
    );
  }

  if (!src) return <Placeholder type={type} caption={caption} />;

  return (
    <figure className="space-y-2">
      <div className="overflow-hidden border border-line bg-black">
        {type === "video" ? (
          isEmbed(src) ? (
            <div className="aspect-video">
              <iframe
                src={embedUrl(src)}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video src={src} controls className="aspect-video w-full bg-black" />
          )
        ) : (
          // image + gif
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={caption} className="w-full object-contain" />
        )}
      </div>
      {caption && (
        <figcaption className="text-sm text-muted">{caption}</figcaption>
      )}
    </figure>
  );
}

/* ---------- empty placeholder box ---------- */
function Placeholder({ type, caption }: { type: BlockType; caption: string }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <div
      className={`flex flex-col items-center justify-center border-2 border-dashed border-line-2 bg-surface/60 text-center ${
        type === "video" ? "aspect-video" : "aspect-[16/10]"
      }`}
    >
      <div className="flex h-16 w-16 items-center justify-center bg-surface-3">
        <Icon className="h-7 w-7 text-zinc-300" />
      </div>
      <p className="mt-4 font-display text-2xl font-bold tracking-wide text-white">
        {meta.label}
      </p>
      {caption && <p className="mt-1 max-w-md px-4 text-sm text-muted-2">{caption}</p>}
      <p className="mt-2 text-xs text-muted-2">
        Turn on{" "}
        <span className="font-semibold text-zinc-300">Edit</span> (admin) to add media
      </p>
    </div>
  );
}

/* ---------- admin editor ---------- */
function EditableBlock({
  lessonId,
  block,
  index,
  total,
}: {
  lessonId: string;
  block: ContentBlock;
  index: number;
  total: number;
}) {
  const { updateBlock, removeBlock, moveBlock } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const meta = TYPE_META[block.type];

  const onPick = async (file?: File) => {
    if (!file) return;
    setErr(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setErr("File too large for browser storage (~4.5MB max). Paste a URL instead.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    updateBlock(lessonId, block.id, { src: dataUrl });
  };

  return (
    <div className="border border-line-2 bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-2">
          Block {index + 1} of {total}
        </span>

        {/* reorder */}
        <div className="flex items-center">
          <button
            onClick={() => moveBlock(lessonId, block.id, -1)}
            disabled={index === 0}
            className="p-1.5 text-muted-2 transition hover:text-white disabled:opacity-30"
            title="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => moveBlock(lessonId, block.id, 1)}
            disabled={index === total - 1}
            className="p-1.5 text-muted-2 transition hover:text-white disabled:opacity-30"
            title="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* type switcher */}
        <div className="ml-auto flex items-center gap-1 border border-line-2 bg-surface-2 p-0.5">
          {(Object.keys(TYPE_META) as BlockType[]).map((t) => {
            const Icon = TYPE_META[t].icon;
            return (
              <button
                key={t}
                onClick={() => updateBlock(lessonId, block.id, { type: t })}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold capitalize transition ${
                  block.type === t
                    ? "bg-nonstop text-white"
                    : "text-muted hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => removeBlock(lessonId, block.id)}
          className="p-1.5 text-muted-2 transition hover:bg-red-500/10 hover:text-red-400"
          title="Remove block"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* preview / quiz editor */}
      <div className="mb-3">
        {block.type === "quiz" ? (
          <QuizEditor lessonId={lessonId} block={block} />
        ) : block.type === "text" ? (
          <textarea
            value={block.caption}
            onChange={(e) => updateBlock(lessonId, block.id, { caption: e.target.value })}
            placeholder="Write the text content agents will read…"
            className="min-h-28 w-full resize-y border border-line-2 bg-surface-2 p-3 text-sm text-zinc-200 outline-none focus:border-nonstop"
          />
        ) : block.type === "video" ? (
          <RenderBlock block={block} />
        ) : null}
      </div>

      {block.type !== "text" && block.type !== "quiz" && (
        <>
          {(block.type === "image" || block.type === "gif") && (
            <div className="mb-2">
              <ImageUpload
                value={block.src}
                onChange={(src) => updateBlock(lessonId, block.id, { src })}
                accept={meta.accept}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={meta.accept}
              hidden
              onChange={(e) => onPick(e.target.files?.[0])}
            />
            {block.type === "video" && (
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 bg-nonstop px-3 py-2 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
              >
                <Upload className="h-4 w-4" /> Upload {block.type}
              </button>
            )}
            <button
              onClick={() => setShowUrl((s) => !s)}
              className="inline-flex items-center gap-1.5 border border-line-2 px-3 py-2 text-sm font-semibold text-white transition hover:border-zinc-500"
            >
              <Link2 className="h-4 w-4" /> Paste URL
            </button>
            {block.src && (
              <button
                onClick={() => updateBlock(lessonId, block.id, { src: "" })}
                className="inline-flex items-center gap-1.5 border border-line-2 px-3 py-2 text-sm text-muted transition hover:text-white"
              >
                <X className="h-4 w-4" /> Clear
              </button>
            )}
          </div>

          {showUrl && (
            <input
              value={block.src.startsWith("data:") ? "" : block.src}
              onChange={(e) => updateBlock(lessonId, block.id, { src: e.target.value })}
              placeholder={
                block.type === "video"
                  ? "YouTube / Vimeo / Mux / .mp4 URL"
                  : "Image or GIF URL"
              }
              className="mt-2 w-full border border-line-2 bg-surface-2 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-nonstop"
            />
          )}

          <input
            value={block.caption}
            onChange={(e) => updateBlock(lessonId, block.id, { caption: e.target.value })}
            placeholder="Caption (optional)"
            className="mt-2 w-full border border-line-2 bg-surface-2 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-nonstop"
          />
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
        </>
      )}
    </div>
  );
}
