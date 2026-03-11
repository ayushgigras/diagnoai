import { useEffect } from 'react';
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
import Profile from './pages/Profile';
import ProtectedRoute from './components/common/ProtectedRoute';
import NotificationsHelper from './components/common/NotificationsHelper';
import api from './services/api';

function App() {
  useEffect(() => {
    // Fetch a CSRF token from the API upon app initialization to make sure login POST requests succeed
    api.get('/health').catch(console.error);
  }, []);

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
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={
              <div className="flex items-center justify-center h-full min-h-[50vh]">
                <h1 className="text-2xl text-slate-500">404 - Page Not Found</h1>
              </div>
            } />
          </Routes>
        </main>
        <NotificationsHelper />
        <Footer />
      </div>
    </Router>
  );
}

export default App;
