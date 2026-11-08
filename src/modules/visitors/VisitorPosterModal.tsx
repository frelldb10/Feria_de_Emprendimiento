import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { BrandStripe } from '../../components/brand/BrandStripe';
import { Escudo, FeriaLogo } from '../../components/brand/Logos';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

/** Cartel para pegar en la entrada: el público escanea el QR y llega al formulario de visitantes. */
export function VisitorPosterModal({ open, onClose, url }: { open: boolean; onClose: () => void; url: string }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cartel con el QR de visitantes"
      description="Imprímelo y pégalo en la entrada o en las mesas de información."
      size="lg"
      printable
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button icon={Printer} onClick={() => window.print()}>
            Imprimir cartel
          </Button>
        </>
      }
    >
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-lg border border-carbon-200 px-6 py-8 text-center print:max-w-none print:border-0 print:py-4">
        <div className="flex items-center gap-5">
          <Escudo className="h-20 print:h-24" />
          <span aria-hidden className="h-14 w-px bg-carbon-200" />
          <FeriaLogo className="h-20 print:h-24" />
        </div>
        <BrandStripe rounded className="mt-6 h-1.5 max-w-64" />
        <h2 className="mt-6 text-4xl font-bold tracking-tight text-carbon-900 print:text-5xl">Registra tu visita</h2>
        <p className="mt-2 text-lg text-carbon-600 print:text-xl">Escanea el código con la cámara de tu celular</p>
        <div className="mt-6 rounded-xl border-4 border-carbon-900 bg-white p-4">
          {/* En papel, más grande para que se lea desde lejos. */}
          <QRCodeSVG value={url} size={280} level="M" marginSize={2} title="QR para registrar la visita" className="print:size-[22rem]" />
        </div>
        <p className="mt-4 font-mono text-sm break-all text-carbon-600">{url}</p>
        <p className="mt-6 text-sm text-carbon-500">Feria de Emprendimiento · Alcaldía Municipal de Astrea</p>
      </div>
    </Modal>
  );
}
