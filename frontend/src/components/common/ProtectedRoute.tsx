import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const userRole = useAuthStore((state) => state.user?.role);

    // If unauthorized, return them to the login page
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If allowedRoles is specified and user's role is not included, redirect to home
    if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
        return <Navigate to="/" replace />;
    }

    // If authorized, render child components (Outlet rendering)
    return <Outlet />;
};

export default ProtectedRoute;
