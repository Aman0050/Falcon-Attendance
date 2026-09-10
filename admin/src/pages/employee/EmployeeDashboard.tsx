import React, { useEffect, useState } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import {
  CalendarCheck,
  Clock,
  CalendarRange,
  Bell,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DashboardData {
  today_status: any;
  leave_balances: any[];
  recent_notifications: any[];
}

export default function EmployeeDashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/employee/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <Spinner animation="border" variant="primary" style={{ width: '2.5rem', height: '2.5rem' }} />
        <span className="text-muted mt-3" style={{ fontSize: '14px' }}>Loading your dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header Banner */}
      <div className="mb-4">
        <h1 className="page-title">Welcome, {user?.name || 'Employee'}</h1>
        <p className="text-muted">Here is your daily attendance summary and leave balances overview</p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4 d-flex align-items-center gap-2">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{error}</span>
        </Alert>
      )}

      {/* Main Grid */}
      <div className="row g-4 mb-4">
        {/* Today's Status Card */}
        <div className="col-lg-4">
          <div
            className="card card-interactive h-100 p-4"
            style={{
              background: data?.today_status
                ? 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)'
                : 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
              color: '#FFFFFF',
              border: 'none',
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <span className="badge bg-light text-dark" style={{ fontSize: '12px' }}>
                TODAY'S STATUS
              </span>
              <div
                className="p-2 rounded-circle"
                style={{ background: 'rgba(255, 255, 255, 0.2)' }}
              >
                {data?.today_status ? <CheckCircle2 size={20} /> : <Clock size={20} />}
              </div>
            </div>

            <h3 className="text-white fw-bold mb-1" style={{ fontSize: '24px' }}>
              {data?.today_status ? 'Marked Present' : 'Not Checked In'}
            </h3>
            <p className="text-white-50 mb-4" style={{ fontSize: '14px' }}>
              {data?.today_status
                ? 'Your attendance has been recorded for today.'
                : 'Use your Falcon Office mobile app to check in at office.'}
            </p>

            <div
              className="mt-auto p-3 rounded-3"
              style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(4px)' }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-white-50" style={{ fontSize: '13px' }}>Recorded Check-In</span>
                <span className="fw-semibold text-white" style={{ fontSize: '14px' }}>
                  {data?.today_status?.check_in
                    ? new Date(data.today_status.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Balances Card */}
        <div className="col-lg-8">
          <div className="card h-100 p-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h2 className="card-title mb-1">Leave Balances</h2>
                <div className="caption-text">Annual leave quotas and utilization</div>
              </div>
              <div className="p-2 rounded-3 bg-light text-primary">
                <CalendarRange size={20} />
              </div>
            </div>

            <div className="row g-3">
              {data?.leave_balances && data.leave_balances.length > 0 ? (
                data.leave_balances.map((lb) => {
                  const remaining = lb.allocated_days - lb.used_days;
                  return (
                    <div key={lb.name} className="col-sm-6">
                      <div
                        className="p-3 rounded-3"
                        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="fw-semibold text-dark" style={{ fontSize: '14px' }}>{lb.name}</span>
                          <span className="badge bg-info">{remaining} Days Left</span>
                        </div>
                        <div className="d-flex align-items-baseline gap-2 mb-2">
                          <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                            {remaining}
                          </span>
                          <span className="text-muted" style={{ fontSize: '13px' }}>
                            / {lb.allocated_days} allocated
                          </span>
                        </div>
                        <div className="d-flex justify-content-between text-muted" style={{ fontSize: '12px' }}>
                          <span>Used: {lb.used_days} days</span>
                          <span>Quota: {lb.allocated_days} days</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-12 text-center py-4 text-muted">
                  No leave balances currently initialized.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Row */}
      <div className="card p-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h2 className="card-title mb-1">Recent Notifications</h2>
            <div className="caption-text">Recent attendance and leave updates</div>
          </div>
          <div className="p-2 rounded-3 bg-light text-primary">
            <Bell size={20} />
          </div>
        </div>

        {!data?.recent_notifications || data.recent_notifications.length === 0 ? (
          <div className="text-center py-4 text-muted" style={{ fontSize: '14px' }}>
            No recent notifications at this time.
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {data.recent_notifications.map((n) => (
              <div
                key={n.id}
                className="d-flex align-items-start gap-3 p-3 rounded-3"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
              >
                <div className="p-2 rounded-circle bg-white text-primary border flex-shrink-0 mt-1">
                  <Bell size={14} />
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <div className="fw-semibold text-dark" style={{ fontSize: '14px' }}>
                      {n.title || n.type.replace('_', ' ')}
                    </div>
                    {n.sent_at && (
                      <span className="text-muted flex-shrink-0" style={{ fontSize: '12px' }}>
                        {new Date(n.sent_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-muted mb-0 mt-1" style={{ fontSize: '13.5px' }}>
                    {n.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
