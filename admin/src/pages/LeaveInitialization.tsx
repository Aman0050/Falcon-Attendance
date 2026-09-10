import React, { useState, useEffect } from 'react';
import { Form, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CalendarRange, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LeaveInitialization() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<{ id: number; name: string; employee_id: string; usedPaidLeave: number }[]>([]);
  const [quarter, setQuarter] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (token) checkInit();
  }, [token]);

  const checkInit = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/leave/is-initialized`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.data.initialized) {
        navigate('/leave');
      } else {
        fetchEmployees();
        const month = new Date().getMonth() + 1;
        setQuarter(Math.ceil(month / 3));
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error checking initialization');
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(
        res.data.data.items.map((e: any) => ({
          id: e.id,
          name: e.name,
          employee_id: e.employee_id,
          usedPaidLeave: 0
        }))
      );
      setLoading(false);
    } catch (err: any) {
      setError('Error fetching employees');
      setLoading(false);
    }
  };

  const handleLeaveChange = (id: number, val: string) => {
    const num = parseFloat(val);
    setEmployees((emps) => emps.map((e) => (e.id === id ? { ...e, usedPaidLeave: isNaN(num) ? 0 : num } : e)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/leave/initialize`,
        {
          quarter,
          employees: employees.map((e) => ({ employeeId: e.id, usedPaidLeave: e.usedPaidLeave }))
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSuccess('Leave balances initialized successfully. Redirecting...');
      setTimeout(() => navigate('/leave'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to initialize leaves');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <div className="text-muted mt-2">Checking leave initialization...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="page-title">Leave Initialization Wizard</h1>
        <p className="text-muted">Set up initial leave balances and historical usage for all active employees</p>
      </div>

      <div className="card p-4">
        <Alert variant="info" className="mb-4">
          <strong>One-time Setup:</strong> Select the current fiscal quarter and enter the number of{' '}
          <strong>Paid Leaves</strong> already consumed by each employee this year.
        </Alert>

        {error && (
          <Alert variant="danger" className="mb-4 d-flex align-items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4 d-flex align-items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <div className="mb-4" style={{ maxWidth: '340px' }}>
            <Form.Group>
              <Form.Label>Current Fiscal Quarter</Form.Label>
              <Form.Select value={quarter} onChange={(e) => setQuarter(parseInt(e.target.value))}>
                <option value={1}>Q1 (Jan-Mar) - 4.5 days accrued</option>
                <option value={2}>Q2 (Apr-Jun) - 9.0 days accrued</option>
                <option value={3}>Q3 (Jul-Sep) - 13.5 days accrued</option>
                <option value={4}>Q4 (Oct-Dec) - 18.0 days accrued</option>
              </Form.Select>
            </Form.Group>
          </div>

          <div className="table-responsive mb-4" style={{ border: 'none' }}>
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th style={{ width: '220px' }}>Used Paid Leave (Days)</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <span className="badge bg-secondary font-monospace">{emp.employee_id}</span>
                    </td>
                    <td className="fw-medium text-dark">{emp.name}</td>
                    <td>
                      <Form.Control
                        type="number"
                        step="0.5"
                        min="0"
                        value={emp.usedPaidLeave}
                        onChange={(e) => handleLeaveChange(emp.id, e.target.value)}
                        required
                      />
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-muted">
                      No active employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-end">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting || employees.length === 0}
            >
              {submitting ? (
                <>
                  <Spinner size="sm" animation="border" />
                  <span>Initializing Balances...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Initialize Leaves</span>
                </>
              )}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
