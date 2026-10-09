'use client';

import Link from 'next/link';
import { ArrowLeft, Construction, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const workerNames: Record<string, string> = {
  admissions: 'Admissions Staff',
  finance: 'Finance Staff',
  academic: 'Academic Administration',
  pddikti: 'PDDikti Operator',
  'it-helpdesk': 'IT Helpdesk',
  quality: 'Quality Assurance',
  career: 'Career Center',
  archive: 'Digital Archive',
};

export default function WorkerPage({ params }: { params: { worker: string } }) {
  const workerName = workerNames[params.worker] ?? 'Campus Worker';
  const isHelpdesk = params.worker === 'it-helpdesk';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-textSecondary hover:text-textPrimary">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Command Center
      </Link>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex gap-2">
            <Badge variant={isHelpdesk ? 'success' : 'secondary'}>
              {isHelpdesk ? 'IMPLEMENTED' : 'PLANNED'}
            </Badge>
            <Badge variant="info">Campus Worker</Badge>
          </div>
          <h1 className="text-3xl font-semibold text-textPrimary">{workerName}</h1>
          <p className="mt-2 text-textSecondary">
            {isHelpdesk
              ? 'Investigation workflow untuk triase incident IT dan evidence perangkat.'
              : 'Workflow role ini belum terhubung ke backend pada MVP saat ini.'}
          </p>
        </div>
        {isHelpdesk && <Button onClick={() => window.location.assign('/')}>Buat incident</Button>}
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-4">
          {isHelpdesk ? (
            <ShieldCheck className="mt-1 h-6 w-6 text-green-600" />
          ) : (
            <Construction className="mt-1 h-6 w-6 text-amber-600" />
          )}
          <div>
            <h2 className="font-semibold text-textPrimary">
              {isHelpdesk ? 'Workflow tersedia' : 'Capability belum tersedia'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              {isHelpdesk
                ? 'Gunakan Command Center untuk membuat laporan, menjalankan investigation, dan melihat evidence operasional.'
                : 'Halaman ini disediakan agar navigasi tidak berakhir pada 404. Jangan gunakan data atau status pada halaman ini sebagai klaim integrasi live.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
