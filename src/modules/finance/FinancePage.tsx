import { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { useFairState } from '../../store/fairStore';
import { useCanEdit } from '../auth/useCanEdit';
import { ReportDownloadButton } from '../reports/ReportDownloadButton';
import { SalesBalance } from './SalesBalance';
import { SalesCapture } from './SalesCapture';

type FinanceTab = 'capture' | 'balance';

export function FinancePage() {
  const canEdit = useCanEdit();
  const { sales } = useFairState();
  const [tab, setTab] = useState<FinanceTab>('capture');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:py-8">
      <PageHeader
        title="Finanzas"
        description="Ventas por sección, recogidas en dos cortes al día."
        actions={
          <ReportDownloadButton report="ventas" disabled={sales.length === 0}>
            Balance en Excel
          </ReportDownloadButton>
        }
      />

      {/* El observador solo ve el balance. */}
      {canEdit && (
        <Tabs
          label="Vista"
          size="lg"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'capture', label: 'Registrar ventas' },
            { id: 'balance', label: 'Balance' },
          ]}
        />
      )}

      {canEdit && tab === 'capture' ? <SalesCapture /> : <SalesBalance />}
    </div>
  );
}
