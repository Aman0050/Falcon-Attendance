import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, getUserRoles } from '../context/AuthContext';
import { Container, Spinner } from 'react-bootstrap';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = getUserRoles(user);
    const hasAccess = allowedRoles.some((role) => userRoles.includes(role.toLowerCase()));
    if (!hasAccess) {
      // If authenticated but unauthorized role, send to their respective dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}
