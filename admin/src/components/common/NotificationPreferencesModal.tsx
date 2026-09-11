import React, { useState, useEffect } from 'react';
import { Modal, Form, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { Bell, Smartphone, Mail, CheckCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface PreferencesData {
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  attendance_alerts: boolean;
  leave_alerts: boolean;
  payroll_alerts: boolean;
  announcements: boolean;
}

interface NotificationPreferencesModalProps {
  show: boolean;
  onHide: () => void;
}

export default function NotificationPreferencesModal({ show, onHide }: NotificationPreferencesModalProps) {
  const { token } = useAuth();
  const [preferences, setPreferences] = useState<PreferencesData>({
    in_app_enabled: true,
    push_enabled: true,
    email_enabled: true,
    attendance_alerts: true,
    leave_alerts: true,
    payroll_alerts: true,
    announcements: true
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Fetch preferences whenever modal opens
  useEffect(() => {
    if (!show || !token) return;

    const fetchPreferences = async () => {
      try {
        setLoading(true);
        setSavedSuccess(false);
        const res = await axios.get(`${API_BASE}/api/notifications/preferences`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success && res.data?.data) {
          setPreferences({
            in_app_enabled: res.data.data.in_app_enabled ?? true,
            push_enabled: res.data.data.push_enabled ?? true,
            email_enabled: res.data.data.email_enabled ?? false,
            attendance_alerts: res.data.data.attendance_alerts ?? true,
            leave_alerts: res.data.data.leave_alerts ?? true,
            payroll_alerts: res.data.data.payroll_alerts ?? true,
            announcements: res.data.data.announcements ?? true
          });
        }
      } catch (err) {
        console.error('Failed to fetch preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [show, token]);

  const handleSave = async () => {
    if (!token) return;
    try {
      setSaving(true);
      await axios.patch(`${API_BASE}/api/notifications/preferences`, preferences, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ borderBottom: '1px solid #E2E8F0' }}>
        <Modal.Title style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
          Notification Preferences
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <p className="text-muted small mb-4">
          Customize which alerts and channels you wish to receive notifications from.
        </p>

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" variant="primary" />
            <div className="text-muted small mt-2">Loading preferences...</div>
          </div>
        ) : (
          <>
            {/* Delivery Channels */}
            <div className="mb-4">
              <h3
                className="text-uppercase text-muted fw-bold mb-2.5"
                style={{ fontSize: '11px', letterSpacing: '0.06em' }}
              >
                DELIVERY CHANNELS
              </h3>
              <div
                className="d-flex flex-column gap-3 p-3 rounded-3"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <Bell size={16} className="text-primary" />
                    <div>
                      <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                        In-App Notifications
                      </div>
                      <div className="text-muted" style={{ fontSize: '11.5px' }}>
                        Desktop bell alerts and indicator badges
                      </div>
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    checked={preferences.in_app_enabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, in_app_enabled: e.target.checked })
                    }
                  />
                </div>

                <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                  <div className="d-flex align-items-center gap-2">
                    <Smartphone size={16} className="text-success" />
                    <div>
                      <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                        Push Notifications
                      </div>
                      <div className="text-muted" style={{ fontSize: '11.5px' }}>
                        Mobile push alerts on connected devices
                      </div>
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    checked={preferences.push_enabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, push_enabled: e.target.checked })
                    }
                  />
                </div>

                <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                  <div className="d-flex align-items-center gap-2">
                    <Mail size={16} className="text-info" />
                    <div>
                      <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                        Email Notifications
                      </div>
                      <div className="text-muted" style={{ fontSize: '11.5px' }}>
                        Important announcements & summaries via email
                      </div>
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    checked={preferences.email_enabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, email_enabled: e.target.checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Alert Categories */}
            <div>
              <h3
                className="text-uppercase text-muted fw-bold mb-2.5"
                style={{ fontSize: '11px', letterSpacing: '0.06em' }}
              >
                ALERT CATEGORIES
              </h3>
              <div
                className="d-flex flex-column gap-3 p-3 rounded-3"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                      Attendance Alerts
                    </div>
                    <div className="text-muted" style={{ fontSize: '11.5px' }}>
                      Late check-in, checkout reminders, marked absent
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    checked={preferences.attendance_alerts}
                    onChange={(e) =>
                      setPreferences({ ...preferences, attendance_alerts: e.target.checked })
                    }
                  />
                </div>

                <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                  <div>
                    <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                      Leave Management
                    </div>
                    <div className="text-muted" style={{ fontSize: '11.5px' }}>
                      Leave applications, approvals, and rejections
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    checked={preferences.leave_alerts}
                    onChange={(e) =>
                      setPreferences({ ...preferences, leave_alerts: e.target.checked })
                    }
                  />
                </div>

                <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                  <div>
                    <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                      Payroll & Salary
                    </div>
                    <div className="text-muted" style={{ fontSize: '11.5px' }}>
                      Monthly salary slip releases and deductions
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    checked={preferences.payroll_alerts}
                    onChange={(e) =>
                      setPreferences({ ...preferences, payroll_alerts: e.target.checked })
                    }
                  />
                </div>

                <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                  <div>
                    <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                      Company Announcements
                    </div>
                    <div className="text-muted" style={{ fontSize: '11.5px' }}>
                      General circulars, holidays, and broadcasts
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    checked={preferences.announcements}
                    onChange={(e) =>
                      setPreferences({ ...preferences, announcements: e.target.checked })
                    }
                  />
                </div>
              </div>
            </div>

            {savedSuccess && (
              <div
                className="alert alert-success d-flex align-items-center gap-2 mt-3 mb-0 p-2.5"
                style={{ fontSize: '12.5px' }}
              >
                <CheckCircle2 size={16} />
                <span>Preferences updated successfully!</span>
              </div>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer style={{ borderTop: '1px solid #E2E8F0' }}>
        <button
          type="button"
          onClick={onHide}
          className="btn btn-light"
          style={{ borderRadius: '8px', fontSize: '13px' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="btn btn-primary d-flex align-items-center gap-1.5"
          style={{ borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
        >
          {saving ? <Spinner animation="border" size="sm" /> : <CheckCheck size={15} />}
          <span>Save Preferences</span>
        </button>
      </Modal.Footer>
    </Modal>
  );
}
