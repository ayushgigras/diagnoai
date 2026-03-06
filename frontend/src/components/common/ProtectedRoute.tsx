import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

const ProtectedRoute = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // If unauthorized, return them to the login page
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If authorized, render child components (Outlet rendering)
    return <Outlet />;
};

export default ProtectedRoute;
