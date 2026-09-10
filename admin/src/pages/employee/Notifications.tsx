import React, { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import axios from 'axios';
import { Bell, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Notifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/employee/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(response.data);
      } catch (err) {
        console.error('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchNotifs();
  }, [token]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="page-title">Notifications</h1>
        <p className="text-muted">Stay updated on your attendance logs, approvals, and reminders</p>
      </div>

      <div className="card p-4">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="text-muted mt-2">Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div className="d-inline-flex p-3 rounded-circle bg-light text-muted mb-2">
              <Bell size={24} />
            </div>
            <div className="fw-medium">No notifications yet</div>
            <div className="small text-muted">You're all caught up!</div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="d-flex align-items-start gap-3 p-3 rounded-3"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
              >
                <div
                  className="p-2 rounded-circle bg-white text-primary flex-shrink-0 mt-1"
                  style={{ border: '1px solid #E2E8F0' }}
                >
                  <Bell size={16} />
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="d-flex flex-column flex-sm-row sm:align-items-center justify-content-between gap-1">
                    <h3 className="fw-semibold text-dark mb-0" style={{ fontSize: '14.5px' }}>
                      {n.title || n.type?.replace(/_/g, ' ')}
                    </h3>
                    {n.sent_at && (
                      <span className="text-muted small">
                        {new Date(n.sent_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-muted mb-0 mt-1" style={{ fontSize: '13.5px', lineHeight: 1.5 }}>
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
