import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Settings, Save, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { Spinner } from 'react-bootstrap';

export default function AdminPayrollSettings() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const [settings, setSettings] = useState({
    calculation_method: 'WORKING_DAYS',
    fixed_working_days: 26,
    weekly_offs: '0',
    late_deduction_rule: 'THREE_LATE_HALF_DAY',
    pf_enabled: true,
    pf_employee_percent: 12.0,
    pf_employer_percent: 12.0,
    pf_wage_ceiling: 15000,
    esic_enabled: true,
    esic_employee_percent: 0.75,
    esic_employer_percent: 3.25,
    esic_wage_limit: 21000,
    pt_enabled: true,
    default_pt_amount: 200,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.response?.data?.error?.message || 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchSettings();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Payroll calculation policies updated successfully!' });
      }
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.response?.data?.error?.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="text-muted mt-2">Loading payroll settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Payroll Calculation Policy & Statutory Rules
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: '13.5px' }}>
            Configure how working days are derived, statutory deduction thresholds, and attendance penalties.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} d-flex align-items-center gap-2 mb-4`}
          style={{ borderRadius: '12px' }}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Card 1: Salary Calculation Method */}
          <div className="col-lg-6">
            <div className="card h-100 p-4 border-0" style={{ borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
              <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                <Settings size={18} className="text-primary" />
                <h5 className="mb-0 fw-bold" style={{ fontSize: '15.5px', color: '#0F172A' }}>
                  Salary Calculation Formula
                </h5>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>
                  Calculation Method
                </label>
                <select
                  className="form-select"
                  value={settings.calculation_method}
                  onChange={(e: any) => setSettings({ ...settings, calculation_method: e.target.value })}
                >
                  <option value="WORKING_DAYS">Working Days (Calendar Days - Sundays - Company Holidays) [Recommended]</option>
                  <option value="CALENDAR_DAYS">Calendar Days (Total days in month: 28-31)</option>
                  <option value="FIXED_DAYS">Fixed Days per Month (Custom Fixed Working Days)</option>
                </select>
                <div className="form-text" style={{ fontSize: '12px' }}>
                  {settings.calculation_method === 'WORKING_DAYS' &&
                    'Daily rate = CTC ÷ (Calendar Days - Weekly Offs - Active Holidays). Payable days = Present + Paid Leaves.'}
                  {settings.calculation_method === 'CALENDAR_DAYS' &&
                    'Daily rate = CTC ÷ Total Calendar Days. Weekly offs and holidays are paid by default.'}
                  {settings.calculation_method === 'FIXED_DAYS' &&
                    'Daily rate = CTC ÷ Configured Fixed Working Days.'}
                </div>
              </div>

              {settings.calculation_method === 'FIXED_DAYS' && (
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>
                    Fixed Working Days Count
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min="20"
                    max="31"
                    value={settings.fixed_working_days}
                    onChange={(e) => setSettings({ ...settings, fixed_working_days: parseInt(e.target.value) || 26 })}
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>
                  Weekly Off Days
                </label>
                <select
                  className="form-select"
                  value={settings.weekly_offs}
                  onChange={(e) => setSettings({ ...settings, weekly_offs: e.target.value })}
                >
                  <option value="0">Sundays Only (Default)</option>
                  <option value="0,6">Saturday & Sunday (5-Day Work Week)</option>
                  <option value="0,5">Friday & Saturday</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>
                  Late Attendance Deduction Policy
                </label>
                <select
                  className="form-select"
                  value={settings.late_deduction_rule}
                  onChange={(e: any) => setSettings({ ...settings, late_deduction_rule: e.target.value })}
                >
                  <option value="NONE">No Deduction (Grace)</option>
                  <option value="THREE_LATE_HALF_DAY">3 Late Marks = 0.5 Day Salary Deduction</option>
                  <option value="THREE_LATE_FULL_DAY">3 Late Marks = 1.0 Day Salary Deduction</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Statutory Compliance Rules */}
          <div className="col-lg-6">
            <div className="card h-100 p-4 border-0" style={{ borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
              <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                <ShieldAlert size={18} className="text-primary" />
                <h5 className="mb-0 fw-bold" style={{ fontSize: '15.5px', color: '#0F172A' }}>
                  Statutory Compliance Deductions
                </h5>
              </div>

              {/* Provident Fund (PF) */}
              <div className="p-3 mb-3 rounded-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold" style={{ fontSize: '13.5px' }}>Employees Provident Fund (PF)</span>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={settings.pf_enabled}
                      onChange={(e) => setSettings({ ...settings, pf_enabled: e.target.checked })}
                    />
                  </div>
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="text-muted" style={{ fontSize: '11.5px' }}>Employee PF Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm"
                      disabled={!settings.pf_enabled}
                      value={settings.pf_employee_percent}
                      onChange={(e) => setSettings({ ...settings, pf_employee_percent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-muted" style={{ fontSize: '11.5px' }}>PF Wage Ceiling (₹)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      disabled={!settings.pf_enabled}
                      value={settings.pf_wage_ceiling}
                      onChange={(e) => setSettings({ ...settings, pf_wage_ceiling: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* ESIC */}
              <div className="p-3 mb-3 rounded-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold" style={{ fontSize: '13.5px' }}>Employee State Insurance (ESIC)</span>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={settings.esic_enabled}
                      onChange={(e) => setSettings({ ...settings, esic_enabled: e.target.checked })}
                    />
                  </div>
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="text-muted" style={{ fontSize: '11.5px' }}>Employee ESIC Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm"
                      disabled={!settings.esic_enabled}
                      value={settings.esic_employee_percent}
                      onChange={(e) => setSettings({ ...settings, esic_employee_percent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-muted" style={{ fontSize: '11.5px' }}>Wage Ceiling Limit (₹)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      disabled={!settings.esic_enabled}
                      value={settings.esic_wage_limit}
                      onChange={(e) => setSettings({ ...settings, esic_wage_limit: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Professional Tax (PT) */}
              <div className="p-3 rounded-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold" style={{ fontSize: '13.5px' }}>Professional Tax (PT)</span>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={settings.pt_enabled}
                      onChange={(e) => setSettings({ ...settings, pt_enabled: e.target.checked })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '11.5px' }}>Default Monthly PT Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    disabled={!settings.pt_enabled}
                    value={settings.default_pt_amount}
                    onChange={(e) => setSettings({ ...settings, default_pt_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end mt-4">
          <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2 px-4 py-2" disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" /> : <Save size={16} />}
            <span>Save Payroll Policy</span>
          </button>
        </div>
      </form>
    </div>
  );
}
