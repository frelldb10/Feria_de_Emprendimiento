import { cn } from '../../lib/cn';

/** La barra verde, roja y amarilla del logo de la Alcaldía, con sus mismas proporciones. */
export function BrandStripe({ className, rounded = false }: { className?: string; rounded?: boolean }) {
  return (
    <div aria-hidden className={cn('flex h-1 w-full overflow-hidden', rounded && 'rounded-full', className)}>
      <span className="w-[53%] bg-verde-600" />
      <span className="w-[27%] bg-rojo-600" />
      <span className="w-[20%] bg-amarillo-300" />
    </div>
  );
}
