// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary.jsx';

import Navbar from '@/components/Navbar'; // navbar tunggal
import NotificationGate from '@/components/NotificationGate';
import IosA2HSBanner from '@/components/IosA2HSBanner';

import Home from '@/pages/Home';
import Contact from '@/pages/Contact';
import IrigasiTetes from '@/pages/IrigasiTetes';
import Hidroponik from '@/pages/Hidroponik';
import BerandaIrigasi from '@/pages/BerandaIrigasi';
import Monitoring from '@/pages/Monitoring';
import Tentang from '@/pages/Tentang';

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Navbar />
        <IosA2HSBanner />
        <NotificationGate />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/irigasitetes" element={<IrigasiTetes />} />
          <Route path="/hidroponik" element={<Hidroponik />} />
          <Route path="/tentang" element={<Tentang />} />
          <Route path="/berandairigasi" element={<BerandaIrigasi />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
