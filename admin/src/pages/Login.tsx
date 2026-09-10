import React, { useState } from 'react';
import { Form, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, LogIn, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/login`, {
        identifier,
        password,
      });

      const { token, user } = response.data;

      const role = user.role?.toLowerCase();
      if (role === 'admin' || role === 'employee') {
        login(token, user);
        navigate('/dashboard');
      } else {
        setError('Access denied. Insufficient privileges.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center position-relative overflow-hidden"
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        padding: '40px 20px',
        userSelect: 'none',
      }}
    >
      {/* 1. TOP-RIGHT RADIAL GLOW */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          right: '-10%',
          width: '750px',
          height: '750px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.45) 0%, rgba(96, 165, 250, 0.22) 40%, rgba(191, 219, 254, 0.08) 65%, transparent 80%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 2. BOTTOM-LEFT RADIAL GLOW */}
      <div
        style={{
          position: 'absolute',
          bottom: '-18%',
          left: '-12%',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.38) 0%, rgba(96, 165, 250, 0.18) 45%, rgba(191, 219, 254, 0.05) 70%, transparent 85%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 3. SVG ORBIT CIRCLES & GEOMETRIC ACCENTS */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        {/* Top-Right Large Orbit Arc */}
        <circle
          cx="88%"
          cy="12%"
          r="420"
          fill="none"
          stroke="#93C5FD"
          strokeWidth="1.2"
          strokeOpacity="0.5"
        />

        {/* Bottom-Left Large Orbit Arc */}
        <circle
          cx="12%"
          cy="88%"
          r="460"
          fill="none"
          stroke="#93C5FD"
          strokeWidth="1.2"
          strokeOpacity="0.5"
        />
      </svg>

      {/* 4. DIAGONAL GLOWING PILL CAPSULES */}
      {/* Top-Right Diagonal Capsule 1 */}
      <div
        style={{
          position: 'absolute',
          top: '32%',
          right: '5%',
          width: '80px',
          height: '8px',
          borderRadius: '999px',
          background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6) 0%, rgba(147, 197, 253, 0.2) 100%)',
          transform: 'rotate(-45deg)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      {/* Top-Right Diagonal Capsule 2 */}
      <div
        style={{
          position: 'absolute',
          top: '36%',
          right: '4.2%',
          width: '56px',
          height: '6px',
          borderRadius: '999px',
          background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.45) 0%, rgba(147, 197, 253, 0.15) 100%)',
          transform: 'rotate(-45deg)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Left/Center Diagonal Capsule */}
      <div
        style={{
          position: 'absolute',
          top: '56%',
          left: '17%',
          width: '50px',
          height: '6px',
          borderRadius: '999px',
          background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.65) 0%, rgba(147, 197, 253, 0.2) 100%)',
          transform: 'rotate(-45deg)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Bottom-Left Diagonal Capsule 1 */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '2%',
          width: '90px',
          height: '8px',
          borderRadius: '999px',
          background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.55) 0%, rgba(147, 197, 253, 0.15) 100%)',
          transform: 'rotate(-45deg)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      {/* Bottom-Left Diagonal Capsule 2 */}
      <div
        style={{
          position: 'absolute',
          bottom: '7%',
          left: '3.2%',
          width: '64px',
          height: '6px',
          borderRadius: '999px',
          background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.4) 0%, rgba(147, 197, 253, 0.1) 100%)',
          transform: 'rotate(-45deg)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* 5. FLOATING DOT MATRIXES */}
      {/* Top-Left Dot Matrix */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '4%',
          width: '160px',
          height: '100px',
          backgroundImage: 'radial-gradient(#93C5FD 1.8px, transparent 1.8px)',
          backgroundSize: '20px 20px',
          opacity: 0.75,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Bottom-Right Dot Matrix */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '4%',
          width: '180px',
          height: '120px',
          backgroundImage: 'radial-gradient(#93C5FD 1.8px, transparent 1.8px)',
          backgroundSize: '20px 20px',
          opacity: 0.75,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* 6. MAIN CONTENT CONTAINER */}
      <div style={{ width: '100%', maxWidth: '580px', position: 'relative', zIndex: 10 }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center p-3 mb-3"
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '28px',
              background: '#FFFFFF',
              boxShadow: '0 16px 36px -6px rgba(37, 99, 235, 0.18), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E2E8F0',
            }}
          >
            <img
              src="/logo.png"
              alt="Falcon Logo"
              width="66"
              height="66"
              style={{ objectFit: 'contain' }}
            />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', margin: 0 }}>
            Falcon Info Solutions
          </h1>
          <p className="text-muted mt-2 mb-0" style={{ fontSize: '16px', fontWeight: 400, color: '#64748B' }}>
            Enterprise Attendance & Office Operations
          </p>
        </div>

        {/* Login Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '28px',
            border: '1px solid #EEF2F6',
            boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.08), 0 6px 24px -4px rgba(15, 23, 42, 0.04)',
            padding: '46px 48px',
          }}
        >
          <div className="mb-4 pb-1">
            <h2 style={{ fontSize: '23px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              Sign in to your account
            </h2>
            <p className="text-muted mt-1.5 mb-0" style={{ fontSize: '15px', lineHeight: 1.5, color: '#64748B' }}>
              Enter your corporate credentials to access your portal
            </p>
          </div>

          {error && (
            <Alert
              variant="danger"
              className="mb-4 d-flex align-items-center gap-2.5 py-3 px-3.5"
              style={{
                borderRadius: '14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              <span>{error}</span>
            </Alert>
          )}

          <Form onSubmit={handleLogin}>
            <Form.Group className="mb-4">
              <Form.Label className="d-flex align-items-center gap-2 fw-medium mb-2" style={{ fontSize: '14px', color: '#334155' }}>
                <Mail size={16} style={{ color: '#2563EB' }} />
                <span>Email or Employee ID</span>
              </Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="name@falconinfo.com or EMP-101"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                style={{
                  height: '52px',
                  fontSize: '15px',
                  borderRadius: '12px',
                  border: '1.5px solid #E2E8F0',
                  paddingLeft: '16px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563EB';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </Form.Group>

            <Form.Group className="mb-4 pb-1">
              <Form.Label className="d-flex align-items-center gap-2 fw-medium mb-2" style={{ fontSize: '14px', color: '#334155' }}>
                <Lock size={16} style={{ color: '#2563EB' }} />
                <span>Password</span>
              </Form.Label>
              <div style={{ position: 'relative' }}>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{
                    height: '52px',
                    fontSize: '15px',
                    borderRadius: '12px',
                    border: '1.5px solid #E2E8F0',
                    paddingLeft: '16px',
                    paddingRight: '48px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </Form.Group>

            <button
              className="btn btn-primary w-100"
              type="submit"
              disabled={loading}
              style={{
                height: '52px',
                fontSize: '15.5px',
                fontWeight: 600,
                borderRadius: '12px',
                backgroundColor: '#2563EB',
                borderColor: '#2563EB',
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} className="me-2" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </Form>
        </div>

        {/* Security Footer */}
        <div className="d-flex align-items-center justify-content-center gap-2 mt-4 pt-1 text-muted" style={{ fontSize: '13.5px', color: '#64748B' }}>
          <ShieldCheck size={17} className="text-success" />
          <span>256-bit encrypted enterprise session &bull; GPS-verified geofencing</span>
        </div>
      </div>
    </div>
  );
}
