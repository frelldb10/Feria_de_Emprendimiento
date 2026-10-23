import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg';
  /** Al imprimir se oculta la app y solo sale el contenido del modal (hoja de QR). */
  printable?: boolean;
}

export function Modal({ open, onClose, title, description, children, footer, size = 'sm', printable = false }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Se guarda en una ref para que el efecto no se reinicie (y robe el foco) en cada render del padre.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    if (printable) document.body.dataset.printing = 'modal';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      delete document.body.dataset.printing;
      previouslyFocused?.focus();
    };
  }, [open, printable]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-carbon-950/50 sm:items-center sm:p-6 print:static print:block print:bg-white print:p-0">
      <div className="absolute inset-0 print:hidden" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl',
          size === 'lg' ? 'sm:max-w-4xl' : 'sm:max-w-md',
          'print:max-h-none print:max-w-none print:rounded-none print:shadow-none',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-carbon-100 px-5 py-4 print:hidden">
          <div>
            <h2 id={titleId} className="font-display text-lg font-semibold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-carbon-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-m-1 rounded-lg p-2 text-carbon-500 hover:bg-carbon-100 hover:text-carbon-900"
            aria-label="Cerrar"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4 print:overflow-visible print:p-0">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-carbon-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
