import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import CreationPage from './pages/CreationPage';
import CareerPage from './pages/CareerPage';
import PantheonPage from './pages/PantheonPage';
import PatrimoinePage from './pages/PatrimoinePage';
import BoutiquePage from './pages/BoutiquePage';
import BadgesPage from './pages/BadgesPage';
import StoryModePage from './pages/StoryModePage';
import ChallengesPage from './pages/ChallengesPage';

export default function App() {
  return (
    <HashRouter>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/creation" element={<CreationPage />} />
          <Route path="/carriere" element={<CareerPage />} />
          <Route path="/patrimoine" element={<PatrimoinePage />} />
          <Route path="/pantheon" element={<PantheonPage />} />
          <Route path="/boutique" element={<BoutiquePage />} />
          <Route path="/badges" element={<BadgesPage />} />
          <Route path="/histoire" element={<StoryModePage />} />
          <Route path="/defis" element={<ChallengesPage />} />
        </Routes>
      </main>
      <Footer />
    </HashRouter>
  );
}
