import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a79d8ac29dbb6ecfa9f3968';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormGremienTermine() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Gremien & Termine — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="unternehmen">Unternehmen</Label>
            <Input
              id="unternehmen"
              value={fields.unternehmen ?? ''}
              onChange={e => setFields(f => ({ ...f, unternehmen: e.target.value }))}
              placeholder="Record URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teilnehmer">Teilnehmer</Label>
            <Input
              id="teilnehmer"
              value={fields.teilnehmer ?? ''}
              onChange={e => setFields(f => ({ ...f, teilnehmer: e.target.value }))}
              placeholder="Record URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="titel">Titel</Label>
            <Input
              id="titel"
              value={fields.titel ?? ''}
              onChange={e => setFields(f => ({ ...f, titel: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="terminart">Terminart</Label>
            <Select
              value={lookupKey(fields.terminart) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, terminart: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="terminart"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="aufsichtsrat">Aufsichtsratssitzung</SelectItem>
                <SelectItem value="beirat">Beiratssitzung</SelectItem>
                <SelectItem value="gesellschafterversammlung">Gesellschafterversammlung</SelectItem>
                <SelectItem value="hauptversammlung">Hauptversammlung</SelectItem>
                <SelectItem value="investorengespraech">Investorengespräch</SelectItem>
                <SelectItem value="strategiemeeting">Strategiemeeting</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="datum_uhrzeit">Datum & Uhrzeit</Label>
            <Input
              id="datum_uhrzeit"
              type="datetime-local"
              step="60"
              value={fields.datum_uhrzeit ?? ''}
              onChange={e => setFields(f => ({ ...f, datum_uhrzeit: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ort">Ort / Videokonferenz-Link</Label>
            <Input
              id="ort"
              value={fields.ort ?? ''}
              onChange={e => setFields(f => ({ ...f, ort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiederkehrend">Wiederkehrender Termin</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="wiederkehrend"
                checked={!!fields.wiederkehrend}
                onCheckedChange={(v) => setFields(f => ({ ...f, wiederkehrend: !!v }))}
              />
              <Label htmlFor="wiederkehrend" className="font-normal">Wiederkehrender Termin</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiederholungsintervall">Wiederholungsintervall</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wiederholungsintervall) === 'monatlich'}
                onClick={() => setFields(f => ({ ...f, wiederholungsintervall: (lookupKey(f.wiederholungsintervall) === 'monatlich' ? undefined : 'monatlich') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wiederholungsintervall) === 'monatlich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Monatlich
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wiederholungsintervall) === 'quartalsweise'}
                onClick={() => setFields(f => ({ ...f, wiederholungsintervall: (lookupKey(f.wiederholungsintervall) === 'quartalsweise' ? undefined : 'quartalsweise') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wiederholungsintervall) === 'quartalsweise'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Quartalsweise
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wiederholungsintervall) === 'halbjaehrlich'}
                onClick={() => setFields(f => ({ ...f, wiederholungsintervall: (lookupKey(f.wiederholungsintervall) === 'halbjaehrlich' ? undefined : 'halbjaehrlich') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wiederholungsintervall) === 'halbjaehrlich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Halbjährlich
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wiederholungsintervall) === 'jaehrlich'}
                onClick={() => setFields(f => ({ ...f, wiederholungsintervall: (lookupKey(f.wiederholungsintervall) === 'jaehrlich' ? undefined : 'jaehrlich') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wiederholungsintervall) === 'jaehrlich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Jährlich
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda / Beschreibung</Label>
            <Textarea
              id="agenda"
              value={fields.agenda ?? ''}
              onChange={e => setFields(f => ({ ...f, agenda: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen_termin">Notizen</Label>
            <Textarea
              id="notizen_termin"
              value={fields.notizen_termin ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen_termin: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
