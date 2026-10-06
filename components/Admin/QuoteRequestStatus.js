import { CheckCircle2, CircleDot, TriangleAlert } from "lucide-react";

export function NewQuoteBadge({ count }) {
  if (!Number.isSafeInteger(count) || count <= 0) return null;
  return <span aria-label={`${count} unreviewed quote ${count === 1 ? "request" : "requests"}`} title={`${count} unreviewed requests`} className="inline-flex min-w-[1.5rem] shrink-0 items-center justify-center rounded bg-primary px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-primary-foreground">{count > 99 ? "99+" : count}</span>;
}

export default function QuoteRequestStatus({ request, showLabel = false }) {
  const reviewed = Boolean(request.reviewed_at);
  const label = request.cleanup_action ? "Cleanup pending" : reviewed ? "Reviewed" : "New";
  const Icon = request.cleanup_action ? TriangleAlert : reviewed ? CheckCircle2 : CircleDot;
  const title = request.cleanup_action ? "Cleanup needs to finish or be retried" : reviewed ? "Reviewed on " + new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(request.reviewed_at)) : "Not reviewed yet";
  return <span title={title} className={"inline-flex items-center gap-1.5 text-xs " + (request.cleanup_action ? "text-amber-700" : reviewed ? "text-emerald-700" : "text-primary")}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className={showLabel ? "" : "sr-only"}>{label}</span></span>;
}
