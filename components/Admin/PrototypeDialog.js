import { useEffect, useRef } from "react";

export default function PrototypeDialog({ open, onClose, labelledBy, children, className = "", dismissible = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={labelledBy} aria-modal="true" onClose={onClose} onCancel={(event) => { if (!dismissible) event.preventDefault(); }} onClick={(event) => { if (dismissible && event.target === event.currentTarget) onClose(); }} className={"max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white-500 p-0 text-zinc-900 shadow-xl [&::backdrop]:bg-zinc-900/40 " + className}>
      {children}
    </dialog>
  );
}
