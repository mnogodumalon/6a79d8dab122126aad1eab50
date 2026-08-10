import type { Dokumente, Unternehmen, GremienTermine, Personen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface DokumenteViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Dokumente | null;
  onEdit: (record: Dokumente) => void;
  unternehmenList: Unternehmen[];
  gremienTermineList: GremienTermine[];
  personenList: Personen[];
}

export function DokumenteViewDialog({ open, onClose, record, onEdit, unternehmenList, gremienTermineList, personenList }: DokumenteViewDialogProps) {
  function getUnternehmenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return unternehmenList.find(r => r.record_id === id)?.fields.unternehmensname ?? '—';
  }

  function getGremienTermineDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return gremienTermineList.find(r => r.record_id === id)?.fields.titel ?? '—';
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
          <DialogTitle>Dokumente anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titel</Label>
            <p className="text-sm">{record.fields.titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dokumenttyp</Label>
            <Badge variant="secondary">{record.fields.dokumenttyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datei hochladen</Label>
            {record.fields.datei ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.datei} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Externer Link</Label>
            <p className="text-sm">{record.fields.externer_link ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum des Dokuments</Label>
            <p className="text-sm">{formatDate(record.fields.datum_dokument)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_dokument ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unternehmen</Label>
            <p className="text-sm">{getUnternehmenDisplayName(record.fields.unternehmen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zugehöriger Termin</Label>
            <p className="text-sm">{getGremienTermineDisplayName(record.fields.termin)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bereitgestellt von</Label>
            <p className="text-sm">{getPersonenDisplayName(record.fields.bereitgestellt_von)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}