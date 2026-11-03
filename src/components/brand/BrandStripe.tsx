import { cn } from '../../lib/cn';

/** La barra verde, roja y amarilla del logo de la Alcaldía, con sus mismas proporciones. */
export function BrandStripe({ className, rounded = false }: { className?: string; rounded?: boolean }) {
  // 4 px de alto, salvo que className traiga su propia altura (cn no resuelve clases que chocan).
  const height = /(^|\s)h-/.test(className ?? '') ? undefined : 'h-1';
  return (
    <div aria-hidden className={cn('flex w-full overflow-hidden', height, rounded && 'rounded-full', className)}>
      <span className="w-[53%] bg-verde-600" />
      <span className="w-[27%] bg-rojo-600" />
      <span className="w-[20%] bg-amarillo-300" />
    </div>
  );
}
