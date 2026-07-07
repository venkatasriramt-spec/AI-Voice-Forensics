
import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import PlatformOverviewPage from './pages/PlatformOverviewPage.jsx';
import ThreatAnalysisEnginePage from './pages/ThreatAnalysisEnginePage.jsx';
import TechnicalArchitecturePage from './pages/TechnicalArchitecturePage.jsx';
import MultilingualDatasetIntelligencePage from './pages/MultilingualDatasetIntelligencePage.jsx';
import LegalRecourcePage from './pages/LegalRecourcePage.jsx';
import AnalysisHistoryPage from './pages/AnalysisHistoryPage.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { Toaster } from '@/components/ui/sonner';

function App() {
    return (
        <AuthProvider>
            <Router>
                <ScrollToTop />
                <Routes>
                    <Route path="/" element={<PlatformOverviewPage />} />
                    <Route path="/predict" element={<ThreatAnalysisEnginePage />} />
                    <Route path="/how-it-works" element={<TechnicalArchitecturePage />} />
                    <Route path="/dataset-intelligence" element={<MultilingualDatasetIntelligencePage />} />
                    <Route path="/legal-recourse" element={<LegalRecourcePage />} />
                    <Route path="/analysis-history" element={<AnalysisHistoryPage />} />
                </Routes>
                <Toaster />
            </Router>
        </AuthProvider>
    );
}

export default App;
