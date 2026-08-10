import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Personen, Unternehmen, Beteiligungen, GremienTermine, Dokumente, Notizen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [personen, setPersonen] = useState<Personen[]>([]);
  const [unternehmen, setUnternehmen] = useState<Unternehmen[]>([]);
  const [beteiligungen, setBeteiligungen] = useState<Beteiligungen[]>([]);
  const [gremienTermine, setGremienTermine] = useState<GremienTermine[]>([]);
  const [dokumente, setDokumente] = useState<Dokumente[]>([]);
  const [notizen, setNotizen] = useState<Notizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [personenData, unternehmenData, beteiligungenData, gremienTermineData, dokumenteData, notizenData] = await Promise.all([
        LivingAppsService.getPersonen(),
        LivingAppsService.getUnternehmen(),
        LivingAppsService.getBeteiligungen(),
        LivingAppsService.getGremienTermine(),
        LivingAppsService.getDokumente(),
        LivingAppsService.getNotizen(),
      ]);
      setPersonen(personenData);
      setUnternehmen(unternehmenData);
      setBeteiligungen(beteiligungenData);
      setGremienTermine(gremienTermineData);
      setDokumente(dokumenteData);
      setNotizen(notizenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [personenData, unternehmenData, beteiligungenData, gremienTermineData, dokumenteData, notizenData] = await Promise.all([
          LivingAppsService.getPersonen(),
          LivingAppsService.getUnternehmen(),
          LivingAppsService.getBeteiligungen(),
          LivingAppsService.getGremienTermine(),
          LivingAppsService.getDokumente(),
          LivingAppsService.getNotizen(),
        ]);
        setPersonen(personenData);
        setUnternehmen(unternehmenData);
        setBeteiligungen(beteiligungenData);
        setGremienTermine(gremienTermineData);
        setDokumente(dokumenteData);
        setNotizen(notizenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const personenMap = useMemo(() => {
    const m = new Map<string, Personen>();
    personen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [personen]);

  const unternehmenMap = useMemo(() => {
    const m = new Map<string, Unternehmen>();
    unternehmen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [unternehmen]);

  const beteiligungenMap = useMemo(() => {
    const m = new Map<string, Beteiligungen>();
    beteiligungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [beteiligungen]);

  const gremienTermineMap = useMemo(() => {
    const m = new Map<string, GremienTermine>();
    gremienTermine.forEach(r => m.set(r.record_id, r));
    return m;
  }, [gremienTermine]);

  const dokumenteMap = useMemo(() => {
    const m = new Map<string, Dokumente>();
    dokumente.forEach(r => m.set(r.record_id, r));
    return m;
  }, [dokumente]);

  return { personen, setPersonen, unternehmen, setUnternehmen, beteiligungen, setBeteiligungen, gremienTermine, setGremienTermine, dokumente, setDokumente, notizen, setNotizen, loading, error, fetchAll, personenMap, unternehmenMap, beteiligungenMap, gremienTermineMap, dokumenteMap };
}