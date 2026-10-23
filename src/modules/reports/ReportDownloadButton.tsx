import { Download, FileText } from 'lucide-react';
import { AsyncButton } from '../../components/ui/AsyncButton';
import type { ButtonProps } from '../../components/ui/Button';
import { getState } from '../../store/fairStore';
import { useAuth } from '../auth/AuthContext';
import { downloadKitReport } from '../logistics/kitReport';
import { downloadReport, type ReportId } from './reportDefinitions';

type Props = Pick<ButtonProps, 'variant' | 'disabled' | 'fullWidth'> & { children?: string };

export function ReportDownloadButton({ report, children = 'Descargar Excel', variant = 'secondary', ...props }: Props & { report: ReportId }) {
  return (
    <AsyncButton variant={variant} icon={Download} onRun={() => downloadReport(report, getState())} {...props}>
      {children}
    </AsyncButton>
  );
}

export function KitWordButton({ children = 'Informe en Word', variant = 'secondary', ...props }: Props) {
  const { operator } = useAuth();
  return (
    <AsyncButton variant={variant} icon={FileText} onRun={() => downloadKitReport(getState(), operator)} {...props}>
      {children}
    </AsyncButton>
  );
}
