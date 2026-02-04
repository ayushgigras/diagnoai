import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import XRayAnalysis from './pages/XRayAnalysis';
import LabAnalysis from './pages/LabAnalysis';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-background-light dark:bg-background-dark">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/xray" element={<XRayAnalysis />} />
            <Route path="/lab" element={<LabAnalysis />} />
            <Route path="*" element={
              <div className="flex items-center justify-center h-full min-h-[50vh]">
                <h1 className="text-2xl text-slate-500">404 - Page Not Found</h1>
              </div>
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
