import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyInfoTab } from './CompanyInfoTab';
import { ClientBriefTab } from './ClientBriefTab';
import { ClientNotesTab } from './ClientNotesTab';
import { Building2, FileText, StickyNote, Layers } from 'lucide-react';
import type { Company } from '@/hooks/useCompanies';

interface InformationTabProps {
  company: Company;
  companyId: string;
  onUpdate: () => void;
}

export function InformationTab({ company, companyId, onUpdate }: InformationTabProps) {
  return (
    <Tabs defaultValue="all" className="space-y-4">
      <TabsList className="h-8 p-0.5 gap-0.5">
        <TabsTrigger value="all" className="h-7 px-3 text-xs gap-1">
          <Layers className="h-3 w-3" />
          All
        </TabsTrigger>
        <TabsTrigger value="info" className="h-7 px-3 text-xs gap-1">
          <Building2 className="h-3 w-3" />
          Info
        </TabsTrigger>
        <TabsTrigger value="brief" className="h-7 px-3 text-xs gap-1">
          <FileText className="h-3 w-3" />
          Brief
        </TabsTrigger>
        <TabsTrigger value="notes" className="h-7 px-3 text-xs gap-1">
          <StickyNote className="h-3 w-3" />
          Notes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="space-y-6">
        <CompanyInfoTab company={company} onUpdate={onUpdate} />
        <ClientBriefTab company={company} />
        <ClientNotesTab companyId={companyId} />
      </TabsContent>

      <TabsContent value="info">
        <CompanyInfoTab company={company} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="brief">
        <ClientBriefTab company={company} />
      </TabsContent>

      <TabsContent value="notes">
        <ClientNotesTab companyId={companyId} />
      </TabsContent>
    </Tabs>
  );
}
