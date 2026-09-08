import { RallyIndicator } from "@/components/rally-court";
/** Both labels participate in layout so a pending action never resizes its button. */
export function PendingContent({ pending, label, children }: { pending: boolean; label: string; children: React.ReactNode }) {
  return <span className="grid place-items-center">
    <span aria-hidden={pending} className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${pending ? "invisible" : ""}`}>{children}</span>
    <span aria-hidden={!pending} className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${pending ? "" : "invisible"}`}>{pending ? <RallyIndicator /> : <span className="rally-compact" />}<span>{label}</span></span>
  </span>;
}
