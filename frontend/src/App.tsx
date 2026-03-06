import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import XRayAnalysis from './pages/XRayAnalysis';
import LabAnalysis from './pages/LabAnalysis';
import Login from './pages/Login';
import Register from './pages/Register';
import About from './pages/About';
import History from './pages/History';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-background-light dark:bg-background-dark">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<About />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/xray" element={<XRayAnalysis />} />
              <Route path="/lab" element={<LabAnalysis />} />
              <Route path="/history" element={<History />} />
            </Route>
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
