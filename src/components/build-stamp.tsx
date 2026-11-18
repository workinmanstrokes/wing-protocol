import { BUILD_INFO } from "@/lib/build-info";

/** On-screen build/commit stamp (tester fix: title, pause and results screens). */
export function BuildStamp({ className }: { className?: string }) {
  return (
    <p data-testid="build-stamp" className={className ?? "text-center text-[11px] text-muted"}>
      {BUILD_INFO.label}
    </p>
  );
}
