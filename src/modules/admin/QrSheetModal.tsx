import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { Escudo, FeriaLogo } from '../../components/brand/Logos';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { Entrepreneur } from '../../store/types';

interface QrSheetModalProps {
  entrepreneurs: Entrepreneur[] | null;
  title: string;
  onClose: () => void;
}

/** Hoja imprimible: tres códigos por fila en carta o A4, con nombre y stand para repartirlos. */
export function QrSheetModal({ entrepreneurs, title, onClose }: QrSheetModalProps) {
  const list = (entrepreneurs ?? []).filter((e) => e.qrCode);

  return (
    <Modal
      open={entrepreneurs !== null}
      onClose={onClose}
      title={title}
      description="Imprime la hoja, recorta cada código y entrégalo a su emprendedor."
      size="lg"
      printable
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button icon={Printer} onClick={() => window.print()} disabled={list.length === 0}>
            Imprimir {list.length} códigos
          </Button>
        </>
      }
    >
      <div className="mb-4 hidden items-center gap-4 border-b border-carbon-200 pb-3 print:flex">
        <Escudo className="h-12" />
        <FeriaLogo className="h-12" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-4">
        {list.map((entrepreneur) => (
          <div
            key={entrepreneur.id}
            className="flex break-inside-avoid flex-col items-center rounded-lg border border-carbon-200 p-3 text-center"
          >
            <QRCodeSVG value={entrepreneur.qrCode!} size={132} level="M" marginSize={1} title={`QR de ${entrepreneur.businessName}`} />
            <p className="mt-2 font-mono text-xs font-semibold tracking-wide">{entrepreneur.qrCode}</p>
            <p className="mt-1 text-sm leading-tight font-semibold text-carbon-900">{entrepreneur.businessName}</p>
            <p className="text-xs text-carbon-500">
              {entrepreneur.ownerName}
              {entrepreneur.stand && ` · Stand ${entrepreneur.stand}`}
            </p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
