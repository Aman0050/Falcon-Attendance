import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Alert, Spinner } from 'react-bootstrap';
import {
  Settings,
  Clock,
  Calendar,
  Trash2,
  Plus,
  Save,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BellRing
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminSettings() {
  const { token } = useAuth();

  const [settings, setSettings] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // New holiday form
  const [newHolDate, setNewHolDate] = useState('');
  const [newHolName, setNewHolName] = useState('');

  const loadData = async () => {
    try {
      const [setRes, holRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/settings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/holidays`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const setJson = await setRes.json();
      const holJson = await holRes.json();

      if (setJson.success) {
        setSettings({
          officeStart: setJson.data.office_start,
          officeEnd: setJson.data.office_end,
          lateThreshold: setJson.data.late_threshold,
          absenceCutoff: setJson.data.absence_cutoff,
          halfDayMinutes: setJson.data.half_day_minutes,
          fullDayMinutes: setJson.data.full_day_minutes,
          checkoutReminderTime: setJson.data.checkout_reminder_time
        });
      }
      if (holJson.success) setHolidays(holJson.data);
    } catch (e: any) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setMsg('System settings updated successfully.');
      } else {
        setError(data.error?.message || data.error || 'Update failed');
      }
    } catch (e) {
      setError('Network error saving settings');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ holidayDate: newHolDate, name: newHolName })
      });
      const data = await res.json();
      if (data.success) {
        setNewHolDate('');
        setNewHolName('');
        setMsg('Holiday added successfully.');
        loadData();
      } else {
        setError(data.error?.message || data.error || 'Failed to add holiday');
      }
    } catch (e) {
      setError('Network error adding holiday');
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!window.confirm('Delete this official holiday?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/holidays/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMsg('Holiday removed.');
        loadData();
      }
    } catch (e) {
      setError('Network error deleting holiday');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <div className="text-muted mt-2" style={{ fontSize: '14px' }}>Loading system settings...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="page-title">System Settings & Rules</h1>
          <p className="text-muted mb-0">Configure attendance policies, shift timings, and official company holidays</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4 d-flex align-items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </Alert>
      )}

      {msg && (
        <Alert variant="success" className="mb-4 d-flex align-items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{msg}</span>
        </Alert>
      )}

      <Row className="g-4">
        {/* Attendance Rules Form Card */}
        <Col lg={7}>
          <div className="card p-4 border-0" style={{ boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)', borderRadius: '20px' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-4 border-bottom" style={{ borderColor: '#F1F5F9' }}>
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #DBEAFE',
                  }}
                >
                  <Clock size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Shift Timings & Rules</h3>
                  <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Define default office working hours, grace periods, and work policies</p>
                </div>
              </div>
            </div>

            {settings ? (
              <Form onSubmit={handleSaveSettings}>
                {/* Timing Blocks */}
                <div className="mb-4">
                  <span className="text-uppercase fw-bold text-muted d-block mb-3" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
                    Standard Daily Working Hours
                  </span>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-medium text-dark" style={{ fontSize: '13.5px' }}>Office Start Time</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.officeStart}
                          onChange={(e) => setSettings({ ...settings, officeStart: e.target.value })}
                          placeholder="10:00:00"
                          style={{ height: '44px', borderRadius: '10px', fontSize: '14px' }}
                          required
                        />
                        <span className="text-muted mt-1 d-block" style={{ fontSize: '12px' }}>Formal office start time</span>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-medium text-dark" style={{ fontSize: '13.5px' }}>Office End Time</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.officeEnd}
                          onChange={(e) => setSettings({ ...settings, officeEnd: e.target.value })}
                          placeholder="18:30:00"
                          style={{ height: '44px', borderRadius: '10px', fontSize: '14px' }}
                          required
                        />
                        <span className="text-muted mt-1 d-block" style={{ fontSize: '12px' }}>Standard shift conclusion</span>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Grace & Cutoff Blocks */}
                <div className="mb-4 pt-3 border-top" style={{ borderColor: '#F8FAFC' }}>
                  <span className="text-uppercase fw-bold text-muted d-block mb-3" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
                    Grace Periods & Thresholds
                  </span>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-medium text-dark" style={{ fontSize: '13.5px' }}>Late Threshold</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.lateThreshold}
                          onChange={(e) => setSettings({ ...settings, lateThreshold: e.target.value })}
                          placeholder="10:15:00"
                          style={{ height: '44px', borderRadius: '10px', fontSize: '14px' }}
                          required
                        />
                        <span className="text-muted mt-1 d-block" style={{ fontSize: '12px' }}>Check-in after this is flagged Late</span>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-medium text-dark" style={{ fontSize: '13.5px' }}>Absence Cutoff</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.absenceCutoff}
                          onChange={(e) => setSettings({ ...settings, absenceCutoff: e.target.value })}
                          placeholder="11:00:00"
                          style={{ height: '44px', borderRadius: '10px', fontSize: '14px' }}
                          required
                        />
                        <span className="text-muted mt-1 d-block" style={{ fontSize: '12px' }}>No check-in by this time is marked Absent</span>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Working Minutes & Reminder */}
                <div className="mb-4 pt-3 border-top" style={{ borderColor: '#F8FAFC' }}>
                  <span className="text-uppercase fw-bold text-muted d-block mb-3" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
                    Duration Requirements & Automation
                  </span>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-medium text-dark" style={{ fontSize: '13.5px' }}>Half Day Requirement (Min)</Form.Label>
                        <Form.Control
                          type="number"
                          value={settings.halfDayMinutes}
                          onChange={(e) => setSettings({ ...settings, halfDayMinutes: Number(e.target.value) })}
                          style={{ height: '44px', borderRadius: '10px', fontSize: '14px' }}
                          required
                        />
                        <span className="text-muted mt-1 d-block" style={{ fontSize: '12px' }}>E.g. 240 mins (4 hours)</span>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-medium text-dark" style={{ fontSize: '13.5px' }}>Full Day Requirement (Min)</Form.Label>
                        <Form.Control
                          type="number"
                          value={settings.fullDayMinutes}
                          onChange={(e) => setSettings({ ...settings, fullDayMinutes: Number(e.target.value) })}
                          style={{ height: '44px', borderRadius: '10px', fontSize: '14px' }}
                          required
                        />
                        <span className="text-muted mt-1 d-block" style={{ fontSize: '12px' }}>E.g. 480 mins (8 hours)</span>
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="fw-medium text-dark d-flex align-items-center gap-2" style={{ fontSize: '13.5px' }}>
                          <BellRing size={14} className="text-primary" />
                          <span>Checkout Reminder Time</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.checkoutReminderTime}
                          onChange={(e) => setSettings({ ...settings, checkoutReminderTime: e.target.value })}
                          placeholder="18:45:00"
                          style={{ height: '44px', borderRadius: '10px', fontSize: '14px' }}
                          required
                        />
                        <span className="text-muted mt-1 d-block" style={{ fontSize: '12px' }}>
                          Automated push notification prompt sent to employees who haven't checked out
                        </span>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                <div className="pt-2 d-flex justify-content-end">
                  <button
                    className="btn btn-primary px-4"
                    type="submit"
                    disabled={saveLoading}
                    style={{ height: '44px', borderRadius: '10px', fontWeight: 600 }}
                  >
                    {saveLoading ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} className="me-2" />
                        <span>Save Rules & Policies</span>
                      </>
                    )}
                  </button>
                </div>
              </Form>
            ) : (
              <div className="text-muted py-4 text-center">No settings configuration available.</div>
            )}
          </div>
        </Col>

        {/* Holidays Card */}
        <Col lg={5}>
          <div className="card p-4 border-0" style={{ boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)', borderRadius: '20px' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-4 border-bottom" style={{ borderColor: '#F1F5F9' }}>
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #DBEAFE',
                  }}
                >
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Official Holidays</h3>
                  <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Manage paid annual holidays</p>
                </div>
              </div>
              <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 600 }}>
                {holidays.length} configured
              </span>
            </div>

            {/* Add Holiday Form */}
            <div className="p-3 mb-4 rounded-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span className="fw-semibold text-dark d-block mb-2.5" style={{ fontSize: '13px' }}>
                Add New Holiday
              </span>
              <Form onSubmit={handleAddHoliday}>
                <Row className="g-2">
                  <Col sm={6}>
                    <Form.Control
                      type="date"
                      value={newHolDate}
                      onChange={(e) => setNewHolDate(e.target.value)}
                      style={{ height: '40px', fontSize: '13.5px', borderRadius: '8px' }}
                      required
                    />
                  </Col>
                  <Col sm={6}>
                    <Form.Control
                      type="text"
                      placeholder="e.g. Diwali, Christmas"
                      value={newHolName}
                      onChange={(e) => setNewHolName(e.target.value)}
                      style={{ height: '40px', fontSize: '13.5px', borderRadius: '8px' }}
                      required
                    />
                  </Col>
                  <Col sm={12}>
                    <button type="submit" className="btn btn-primary w-100" style={{ height: '40px', fontSize: '13.5px', borderRadius: '8px' }}>
                      <Plus size={15} />
                      <span>Add to Calendar</span>
                    </button>
                  </Col>
                </Row>
              </Form>
            </div>

            {/* Holidays List */}
            <div className="table-responsive" style={{ maxHeight: '360px', overflowY: 'auto', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <table className="table table-hover mb-0">
                <thead style={{ background: '#F8FAFC' }}>
                  <tr>
                    <th style={{ fontSize: '11.5px', padding: '12px 14px' }}>Date</th>
                    <th style={{ fontSize: '11.5px', padding: '12px 14px' }}>Holiday Name</th>
                    <th className="text-end" style={{ fontSize: '11.5px', padding: '12px 14px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-muted" style={{ fontSize: '13.5px' }}>
                        No official holidays configured yet.
                      </td>
                    </tr>
                  ) : (
                    holidays.map((h) => (
                      <tr key={h.id}>
                        <td style={{ padding: '12px 14px' }}>
                          <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#1E293B', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>
                            {h.holidayDate}
                          </span>
                        </td>
                        <td className="fw-medium text-dark" style={{ padding: '12px 14px', fontSize: '13.5px' }}>{h.name}</td>
                        <td className="text-end" style={{ padding: '12px 14px' }}>
                          <button
                            className="btn btn-outline-danger btn-sm p-1"
                            onClick={() => handleDeleteHoliday(h.id)}
                            title="Delete holiday"
                            style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
