import Link from "next/link";
import { CheckCircle2, SlidersHorizontal } from "lucide-react";

export default function PendingBusinessLayout({ businessId, onCheck, disabled }) {
  return <div className="mt-3 space-y-2 border-l-2 border-amber-400 pl-3">
    <p role="status" className="text-sm leading-6 text-amber-800">This reference file needs an approved document layout.</p>
    <div className="flex flex-wrap gap-2"><Link href={"/admin/businesses/" + businessId + "/document-layout"}><a target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded px-2 text-sm font-medium text-primary focus-visible:ring-2 focus-visible:ring-primary"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Configure layout<span className="sr-only"> (new tab)</span></a></Link><button type="button" disabled={disabled} onClick={onCheck} className="inline-flex min-h-[44px] items-center gap-2 rounded px-2 text-sm text-zinc-600 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Check approval</button></div>
  </div>;
}
