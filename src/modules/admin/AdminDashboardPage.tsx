import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { useFairState } from '../../store/fairStore';
import { useCanEdit } from '../auth/useCanEdit';
import { ActivityFeed } from './ActivityFeed';
import { BulkUpload } from './BulkUpload';
import { DataControls } from './DataControls';
import { EntrepreneursTable } from './EntrepreneursTable';
import { MetricsGrid } from './MetricsGrid';
import { TrainingSettings } from './TrainingSettings';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const canEdit = useCanEdit();
  const { entrepreneurs } = useFairState();
  const existingDocuments = useMemo(() => new Set(entrepreneurs.map((e) => e.document)), [entrepreneurs]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Panel de administración"
        description="Resumen en vivo de la Feria de Emprendimiento."
        actions={
          <Button variant="secondary" icon={FileSpreadsheet} onClick={() => navigate('/admin/reportes')}>
            Reportes
          </Button>
        }
      />

      <MetricsGrid />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          {canEdit && <BulkUpload existingDocuments={existingDocuments} />}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <TrainingSettings />
            {canEdit && <DataControls />}
          </div>
        </div>
        <ActivityFeed />
      </div>

      <EntrepreneursTable />
    </div>
  );
}
