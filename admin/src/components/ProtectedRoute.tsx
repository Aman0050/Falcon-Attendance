import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Container, Spinner } from 'react-bootstrap';

export default function ProtectedRoute() {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!token || !user || user.role?.toLowerCase() !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
