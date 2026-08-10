import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import PersonenPage from '@/pages/PersonenPage';
import UnternehmenPage from '@/pages/UnternehmenPage';
import BeteiligungenPage from '@/pages/BeteiligungenPage';
import GremienTerminePage from '@/pages/GremienTerminePage';
import DokumentePage from '@/pages/DokumentePage';
import NotizenPage from '@/pages/NotizenPage';
import PublicFormPersonen from '@/pages/public/PublicForm_Personen';
import PublicFormUnternehmen from '@/pages/public/PublicForm_Unternehmen';
import PublicFormBeteiligungen from '@/pages/public/PublicForm_Beteiligungen';
import PublicFormGremienTermine from '@/pages/public/PublicForm_GremienTermine';
import PublicFormDokumente from '@/pages/public/PublicForm_Dokumente';
import PublicFormNotizen from '@/pages/public/PublicForm_Notizen';
// <public:imports>
// </public:imports>
// <custom:imports>
const NeueBeteiligungPage = lazy(() => import('@/pages/intents/NeueBeteiligungPage'));
const TerminVorbereitenPage = lazy(() => import('@/pages/intents/TerminVorbereitenPage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a79d8a60736c3a4a7d1e59f" element={<PublicFormPersonen />} />
              <Route path="public/6a79d8abade761cee4db4fd8" element={<PublicFormUnternehmen />} />
              <Route path="public/6a79d8abfa6a40eb0b31e8a2" element={<PublicFormBeteiligungen />} />
              <Route path="public/6a79d8ac29dbb6ecfa9f3968" element={<PublicFormGremienTermine />} />
              <Route path="public/6a79d8ac54dfdf327d8f29f9" element={<PublicFormDokumente />} />
              <Route path="public/6a79d8ac812ce284dbd988c6" element={<PublicFormNotizen />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="personen" element={<PersonenPage />} />
                <Route path="unternehmen" element={<UnternehmenPage />} />
                <Route path="beteiligungen" element={<BeteiligungenPage />} />
                <Route path="gremien-&-termine" element={<GremienTerminePage />} />
                <Route path="dokumente" element={<DokumentePage />} />
                <Route path="notizen" element={<NotizenPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/neue-beteiligung" element={<Suspense fallback={null}><NeueBeteiligungPage /></Suspense>} />
                <Route path="intents/termin-vorbereiten" element={<Suspense fallback={null}><TerminVorbereitenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
