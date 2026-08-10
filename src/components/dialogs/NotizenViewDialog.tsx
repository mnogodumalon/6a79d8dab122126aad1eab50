import type { Notizen, Unternehmen, Beteiligungen, GremienTermine, Dokumente, Personen } from '@/types/app';
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

interface NotizenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Notizen | null;
  onEdit: (record: Notizen) => void;
  unternehmenList: Unternehmen[];
  beteiligungenList: Beteiligungen[];
  gremienTermineList: GremienTermine[];
  dokumenteList: Dokumente[];
  personenList: Personen[];
}

export function NotizenViewDialog({ open, onClose, record, onEdit, unternehmenList, beteiligungenList, gremienTermineList, dokumenteList, personenList }: NotizenViewDialogProps) {
  function getUnternehmenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return unternehmenList.find(r => r.record_id === id)?.fields.unternehmensname ?? '—';
  }

  function getBeteiligungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return beteiligungenList.find(r => r.record_id === id)?.fields.bewertung ?? '—';
  }

  function getGremienTermineDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return gremienTermineList.find(r => r.record_id === id)?.fields.titel ?? '—';
  }

  function getDokumenteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return dokumenteList.find(r => r.record_id === id)?.fields.titel ?? '—';
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
          <DialogTitle>Notizen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Inhalt</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.inhalt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kategorie</Label>
            <Badge variant="secondary">{record.fields.kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erstellt am</Label>
            <p className="text-sm">{formatDate(record.fields.erstellt_am)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unternehmen</Label>
            <p className="text-sm">{getUnternehmenDisplayName(record.fields.unternehmen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beteiligung</Label>
            <p className="text-sm">{getBeteiligungenDisplayName(record.fields.beteiligung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Termin</Label>
            <p className="text-sm">{getGremienTermineDisplayName(record.fields.termin)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titel</Label>
            <p className="text-sm">{record.fields.titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dokument</Label>
            <p className="text-sm">{getDokumenteDisplayName(record.fields.dokument)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Person</Label>
            <p className="text-sm">{getPersonenDisplayName(record.fields.person)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}