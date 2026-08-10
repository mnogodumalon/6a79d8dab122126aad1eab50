import type { Unternehmen, Personen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface UnternehmenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Unternehmen | null;
  onEdit: (record: Unternehmen) => void;
  personenList: Personen[];
}

export function UnternehmenViewDialog({ open, onClose, record, onEdit, personenList }: UnternehmenViewDialogProps) {
  function getPersonenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return personenList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Unternehmen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ansprechpartner</Label>
            <p className="text-sm">{getPersonenDisplayName(record.fields.ansprechpartner)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unternehmensname</Label>
            <p className="text-sm">{record.fields.unternehmensname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Branche</Label>
            <Badge variant="secondary">{record.fields.branche?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rechtsform</Label>
            <Badge variant="secondary">{record.fields.rechtsform?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gründungsjahr</Label>
            <p className="text-sm">{record.fields.gruendungsjahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Website</Label>
            <p className="text-sm">{record.fields.website ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stadt</Label>
            <p className="text-sm">{record.fields.stadt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Land</Label>
            <p className="text-sm">{record.fields.land ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kurzprofil / Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.kurzprofil ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_unternehmen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}