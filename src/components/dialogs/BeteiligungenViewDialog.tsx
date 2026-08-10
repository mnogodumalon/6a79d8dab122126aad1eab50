import type { Beteiligungen, Unternehmen, Personen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface BeteiligungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Beteiligungen | null;
  onEdit: (record: Beteiligungen) => void;
  unternehmenList: Unternehmen[];
  personenList: Personen[];
}

export function BeteiligungenViewDialog({ open, onClose, record, onEdit, unternehmenList, personenList }: BeteiligungenViewDialogProps) {
  function getUnternehmenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return unternehmenList.find(r => r.record_id === id)?.fields.unternehmensname ?? '—';
  }

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
          <DialogTitle>Beteiligungen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unternehmen</Label>
            <p className="text-sm">{getUnternehmenDisplayName(record.fields.unternehmen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beteiligte Personen</Label>
            <p className="text-sm">{getPersonenDisplayName(record.fields.beteiligte_personen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beteiligungsart</Label>
            <Badge variant="secondary">{record.fields.beteiligungsart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anteil (%)</Label>
            <p className="text-sm">{record.fields.anteil_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Investiertes Kapital (EUR)</Label>
            <p className="text-sm">{record.fields.investiertes_kapital ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aktueller Wert (EUR)</Label>
            <p className="text-sm">{record.fields.aktueller_wert ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eintrittsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.eintrittsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Exitdatum</Label>
            <p className="text-sm">{formatDate(record.fields.exitdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bewertung / Kommentar</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bewertung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_beteiligung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}