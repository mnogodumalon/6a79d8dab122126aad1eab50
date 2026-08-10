import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a79d8abfa6a40eb0b31e8a2';
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

export default function PublicFormBeteiligungen() {
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
          <h1 className="text-2xl font-bold text-foreground">Beteiligungen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="beteiligte_personen">Beteiligte Personen</Label>
            <Input
              id="beteiligte_personen"
              value={fields.beteiligte_personen ?? ''}
              onChange={e => setFields(f => ({ ...f, beteiligte_personen: e.target.value }))}
              placeholder="Record URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beteiligungsart">Beteiligungsart</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.beteiligungsart) === 'direkt'}
                onClick={() => setFields(f => ({ ...f, beteiligungsart: (lookupKey(f.beteiligungsart) === 'direkt' ? undefined : 'direkt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.beteiligungsart) === 'direkt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Direkt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.beteiligungsart) === 'indirekt'}
                onClick={() => setFields(f => ({ ...f, beteiligungsart: (lookupKey(f.beteiligungsart) === 'indirekt' ? undefined : 'indirekt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.beteiligungsart) === 'indirekt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Indirekt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.beteiligungsart) === 'fonds'}
                onClick={() => setFields(f => ({ ...f, beteiligungsart: (lookupKey(f.beteiligungsart) === 'fonds' ? undefined : 'fonds') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.beteiligungsart) === 'fonds'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Über Fonds
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.beteiligungsart) === 'wandeldarlehen'}
                onClick={() => setFields(f => ({ ...f, beteiligungsart: (lookupKey(f.beteiligungsart) === 'wandeldarlehen' ? undefined : 'wandeldarlehen') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.beteiligungsart) === 'wandeldarlehen'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Wandeldarlehen
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.beteiligungsart) === 'sonstige'}
                onClick={() => setFields(f => ({ ...f, beteiligungsart: (lookupKey(f.beteiligungsart) === 'sonstige' ? undefined : 'sonstige') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.beteiligungsart) === 'sonstige'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstige
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anteil_prozent">Anteil (%)</Label>
            <Input
              id="anteil_prozent"
              type="number"
              value={fields.anteil_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, anteil_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="investiertes_kapital">Investiertes Kapital (EUR)</Label>
            <Input
              id="investiertes_kapital"
              type="number"
              value={fields.investiertes_kapital ?? ''}
              onChange={e => setFields(f => ({ ...f, investiertes_kapital: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aktueller_wert">Aktueller Wert (EUR)</Label>
            <Input
              id="aktueller_wert"
              type="number"
              value={fields.aktueller_wert ?? ''}
              onChange={e => setFields(f => ({ ...f, aktueller_wert: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eintrittsdatum">Eintrittsdatum</Label>
            <Input
              id="eintrittsdatum"
              type="date"
              value={fields.eintrittsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, eintrittsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exitdatum">Exitdatum</Label>
            <Input
              id="exitdatum"
              type="date"
              value={fields.exitdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, exitdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bewertung">Bewertung / Kommentar</Label>
            <Textarea
              id="bewertung"
              value={fields.bewertung ?? ''}
              onChange={e => setFields(f => ({ ...f, bewertung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen_beteiligung">Notizen</Label>
            <Textarea
              id="notizen_beteiligung"
              value={fields.notizen_beteiligung ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen_beteiligung: e.target.value }))}
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
