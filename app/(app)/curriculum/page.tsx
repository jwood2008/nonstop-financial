import Link from "next/link";
import { CURRICULUM, moduleTitle } from "@/lib/curriculum";
import { FileText, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Curriculum — NonStop Financial",
};

/**
 * Read-only program overview built from the canonical curriculum spec
 * (lib/curriculum.ts). The interactive version — with video, progress, files
 * and the AI coach — lives at /learn.
 */
export default function CurriculumPage() {
  const lessonCount = CURRICULUM.reduce((n, m) => n + m.lessons.length, 0);
  const pdfCount = CURRICULUM.reduce(
    (n, m) => n + m.lessons.reduce((k, l) => k + (l.pdfs?.length ?? 0), 0),
    0
  );

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* header */}
        <p className="text-xs font-bold uppercase tracking-widest text-nonstop">
          NonStop Financial
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold">
          Platform Curriculum
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          The full producer development path — {CURRICULUM.length} modules,{" "}
          {lessonCount} lessons, {pdfCount} downloadable resources. This is the
          program outline; start the interactive training to track your
          progress.
        </p>
        <Link
          href="/learn"
          className="mt-5 inline-flex items-center gap-2 bg-nonstop px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
        >
          Start training <ArrowRight className="h-4 w-4" />
        </Link>

        {/* modules */}
        <div className="mt-10 space-y-5">
          {CURRICULUM.map((m) => (
            <section
              key={m.id}
              className="border border-line bg-surface/40 p-6"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-nonstop text-sm font-bold text-white">
                  {m.id}
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold text-white">
                    {moduleTitle(m)}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{m.summary}</p>
                </div>
              </div>

              <ul className="mt-5 space-y-2.5 pl-1">
                {m.lessons.map((l) => (
                  <li key={l.key} className="text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="text-nonstop">•</span>
                      <span className="font-medium text-white">{l.title}</span>
                    </div>
                    {l.pdfs && l.pdfs.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-2 pl-4">
                        {l.pdfs.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1.5 border border-line-2 bg-surface-2 px-2 py-1 text-[11px] text-muted"
                          >
                            <FileText className="h-3 w-3 text-nonstop" />
                            {p.replace(/^\s*PDF:\s*/i, "")}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
