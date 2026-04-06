import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DoganConsultApp from './components/dogan-consult/DoganConsultApp';
import ShahinAIApp from './shahin-ai-app';
import SaudiBusinessGateApp from './saudi-business-gate-app';
import DoganLabApp from './DoganLabApp';
import DoganHubApp from './DoganHubApp';
import { ScrollToTop } from './components/shared/ScrollToTop';
import { ConversionAgent } from './components/shared/ConversionAgent';
import { ROUTES } from './components/shared/constants';

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <ConversionAgent />
      <Routes>
        <Route path={ROUTES.doganConsult} element={<DoganConsultApp />} />
        <Route path={ROUTES.shahinAI} element={<ShahinAIApp />} />
        <Route path={ROUTES.saudiBusinessGate} element={<SaudiBusinessGateApp />} />
        <Route path={ROUTES.doganLab} element={<DoganLabApp />} />
        <Route path={ROUTES.doganHub} element={<DoganHubApp />} />
      </Routes>
    </Router>
  );
}
