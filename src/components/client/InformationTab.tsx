import { CompanyInfoCards } from './CompanyInfoTab';
import { ClientBriefCard } from './ClientBriefTab';
import { ClientNotesCard } from './ClientNotesTab';
import type { Company } from '@/hooks/useCompanies';

interface InformationTabProps {
  company: Company;
  companyId: string;
  onUpdate: () => void;
}

export function InformationTab({ company, companyId, onUpdate }: InformationTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:h-[calc(100vh-320px)] lg:min-h-[400px]">
      <CompanyInfoCards company={company} onUpdate={onUpdate} />
      <ClientBriefCard company={company} />
      <ClientNotesCard companyId={companyId} />
    </div>
  );
}
