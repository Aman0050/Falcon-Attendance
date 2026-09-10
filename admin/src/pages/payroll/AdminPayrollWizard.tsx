import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Lock,
  Unlock,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  Download,
  Edit,
  DollarSign,
  Users,
  CheckCircle2,
  CalendarCheck,
  ArrowRight,
  Printer
} from 'lucide-react';
import { Modal, Spinner, Button, Badge } from 'react-bootstrap';

export default function AdminPayrollWizard() {
  const { token } = useAuth();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [cycleData, setCycleData] = useState<any>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [syncInfo, setSyncInfo] = useState<any>(null);

  // Manual Adjustments map for draft items: { [empId]: { bonus, incentive, overtime, advance, other_deductions, notes } }
  const [adjustments, setAdjustments] = useState<Record<number, any>>({});
  
  // Modal for editing adjustments for an employee
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjForm, setAdjForm] = useState({
    bonus: 0,
    incentive: 0,
    overtime: 0,
    advance: 0,
    other_deductions: 0,
    notes: '',
  });

  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/cycles/${selectedYear}/${selectedMonth}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        if (res.data.isFinalized) {
          setIsFinalized(true);
          setCycleData(res.data.cycle);
          setSyncInfo(res.data.syncInfo);
          setPreviewData({
            items: res.data.items,
            cycleMetrics: { workingDays: res.data.cycle.total_working_days },
            totals: {
              totalGross: parseFloat(res.data.cycle.total_gross_pay),
              totalDeductions: parseFloat(res.data.cycle.total_deductions),
              totalNet: parseFloat(res.data.cycle.total_net_pay),
            },
          });
        } else {
          setIsFinalized(false);
          setCycleData(null);
          setSyncInfo(null);
          setPreviewData(res.data.data);
        }
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'danger', text: err.response?.data?.error?.message || 'Failed to load payroll' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPayroll();
  }, [token, selectedYear, selectedMonth]);

  const handleOpenAdj = (emp: any) => {
    setSelectedEmp(emp);
    const existing = isFinalized
      ? {
          bonus: parseFloat(emp.bonus) || 0,
          incentive: parseFloat(emp.incentive) || 0,
          overtime: parseFloat(emp.overtime_pay) || 0,
          advance: parseFloat(emp.advance_deduction) || 0,
          other_deductions: parseFloat(emp.other_deductions) || 0,
          notes: emp.notes || '',
        }
      : adjustments[emp.employee_id] || {
          bonus: emp.bonus || 0,
          incentive: emp.incentive || 0,
          overtime: emp.overtime_pay || 0,
          advance: emp.advance_deduction || 0,
          other_deductions: emp.other_deductions || 0,
          notes: emp.notes || '',
        };

    setAdjForm(existing);
    setShowAdjModal(true);
  };

  const handleSaveAdj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    if (isFinalized) {
      // Direct patch to item
      try {
        setProcessing(true);
        await axios.patch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/items/${selectedEmp.id}`,
          adjForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setShowAdjModal(false);
        fetchPayroll();
      } catch (err: any) {
        setFeedback({ type: 'danger', text: err.response?.data?.error?.message || 'Failed to update item' });
      } finally {
        setProcessing(false);
      }
    } else {
      // Draft mode local state
      const updated = { ...adjustments, [selectedEmp.employee_id]: adjForm };
      setAdjustments(updated);
      setShowAdjModal(false);

      // Re-run calculate preview
      try {
        setProcessing(true);
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/calculate`,
          { year: selectedYear, month: selectedMonth, adjustments: updated },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) {
          setPreviewData(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleFinalizeCycle = async () => {
    if (!window.confirm(`Are you sure you want to finalize & lock payroll for ${monthNames[selectedMonth - 1]} ${selectedYear}? This will generate official PDF salary slips and publish them to all employees.`)) {
      return;
    }

    try {
      setProcessing(true);
      setFeedback(null);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/finalize`,
        { year: selectedYear, month: selectedMonth, adjustments },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setFeedback({ type: 'success', text: res.data.message });
        fetchPayroll();
      }
    } catch (err: any) {
      setFeedback({ type: 'danger', text: err.response?.data?.error?.message || 'Failed to finalize payroll cycle' });
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlockCycle = async () => {
    if (!cycleData) return;
    if (!window.confirm('Are you sure you want to unlock this payroll cycle? The status will revert to DRAFT, enabling changes.')) {
      return;
    }

    try {
      setProcessing(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/cycles/${cycleData.id}/unlock`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setFeedback({ type: 'warning', text: 'Payroll cycle unlocked. You can now re-calculate or make adjustments.' });
        fetchPayroll();
      }
    } catch (err: any) {
      setFeedback({ type: 'danger', text: err.response?.data?.error?.message || 'Failed to unlock cycle' });
    } finally {
      setProcessing(false);
    }
  };

  const items = previewData?.items || [];
  const totals = previewData?.totals || { totalGross: 0, totalDeductions: 0, totalNet: 0 };
  const workingDays = previewData?.cycleMetrics?.workingDays || 0;

  return (
    <div>
      {/* Top Controls: Period Selection & Action Buttons */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Monthly Payroll Wizard & Processing
            </h2>
            {isFinalized ? (
              cycleData?.status === 'OUT_OF_SYNC' ? (
                <span className="badge bg-warning text-dark px-2 py-1" style={{ fontSize: '11.5px', borderRadius: '6px' }}>
                  <AlertTriangle size={12} className="me-1" /> Out of Sync
                </span>
              ) : (
                <span className="badge bg-success px-2 py-1" style={{ fontSize: '11.5px', borderRadius: '6px' }}>
                  <Lock size={12} className="me-1" /> Finalized & Locked
                </span>
              )
            ) : (
              <span className="badge bg-secondary px-2 py-1" style={{ fontSize: '11.5px', borderRadius: '6px' }}>
                Draft / Live Preview
              </span>
            )}
          </div>
          <p className="text-muted mb-0" style={{ fontSize: '13.5px' }}>
            Auto-calculated from official Attendance and Leave records with statutory compliance deductions.
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Month Selector */}
          <select
            className="form-select form-select-sm fw-semibold"
            style={{ width: '135px', borderRadius: '8px' }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {monthNames.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            className="form-select form-select-sm fw-semibold"
            style={{ width: '100px', borderRadius: '8px' }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
            onClick={fetchPayroll}
            disabled={loading || processing}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Sync</span>
          </button>

          {isFinalized ? (
            <button
              className="btn btn-outline-warning btn-sm d-inline-flex align-items-center gap-1.5"
              onClick={handleUnlockCycle}
              disabled={processing}
            >
              <Unlock size={14} />
              <span>Unlock Cycle</span>
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1.5 px-3"
              onClick={handleFinalizeCycle}
              disabled={processing || items.length === 0}
            >
              {processing ? <Spinner size="sm" animation="border" /> : <Lock size={14} />}
              <span>Finalize & Generate Slips</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`alert ${feedback.type === 'success' ? 'alert-success' : feedback.type === 'warning' ? 'alert-warning' : 'alert-danger'} d-flex align-items-center gap-2 mb-4`}
          style={{ borderRadius: '12px' }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Out of Sync Warning Banner */}
      {isFinalized && cycleData?.status === 'OUT_OF_SYNC' && (
        <div
          className="p-3 mb-4 rounded-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="d-flex align-items-center gap-2.5">
            <div className="p-2 rounded-2" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="fw-bold" style={{ color: '#92400E', fontSize: '14px' }}>
                Payroll Cycle Out of Sync with Attendance
              </div>
              <div className="text-muted" style={{ fontSize: '12.5px' }}>
                One or more employee attendance or leave records were modified after this cycle was finalized.
              </div>
            </div>
          </div>
          <button
            className="btn btn-warning btn-sm d-inline-flex align-items-center gap-1.5 fw-semibold flex-shrink-0"
            onClick={handleUnlockCycle}
          >
            <RefreshCw size={14} />
            <span>Unlock & Recalculate</span>
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="card p-3 border-0 h-100" style={{ borderRadius: '14px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
            <span className="text-muted" style={{ fontSize: '12.5px' }}>Standard Working Days</span>
            <div className="d-flex align-items-center justify-content-between mt-1">
              <span className="fw-bold" style={{ fontSize: '24px', color: '#0F172A' }}>{workingDays}</span>
              <div className="p-2 rounded-2 bg-light text-primary"><CalendarCheck size={18} /></div>
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>Excluding Sundays & holidays</div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card p-3 border-0 h-100" style={{ borderRadius: '14px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
            <span className="text-muted" style={{ fontSize: '12.5px' }}>Total Gross Earnings</span>
            <div className="d-flex align-items-center justify-content-between mt-1">
              <span className="fw-bold text-primary" style={{ fontSize: '24px' }}>
                ₹{totals.totalGross.toLocaleString('en-IN')}
              </span>
              <div className="p-2 rounded-2" style={{ background: '#EFF6FF', color: '#2563EB' }}><DollarSign size={18} /></div>
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>Earned components + bonuses</div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card p-3 border-0 h-100" style={{ borderRadius: '14px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
            <span className="text-muted" style={{ fontSize: '12.5px' }}>Total Deductions</span>
            <div className="d-flex align-items-center justify-content-between mt-1">
              <span className="fw-bold" style={{ fontSize: '24px', color: '#DC2626' }}>
                ₹{totals.totalDeductions.toLocaleString('en-IN')}
              </span>
              <div className="p-2 rounded-2" style={{ background: '#FEF2F2', color: '#DC2626' }}><Lock size={18} /></div>
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>PF, ESIC, PT, TDS, advances</div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card p-3 border-0 h-100" style={{ borderRadius: '14px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
            <span className="text-muted" style={{ fontSize: '12.5px' }}>Total Net Payable</span>
            <div className="d-flex align-items-center justify-content-between mt-1">
              <span className="fw-bold" style={{ fontSize: '24px', color: '#16A34A' }}>
                ₹{totals.totalNet.toLocaleString('en-IN')}
              </span>
              <div className="p-2 rounded-2" style={{ background: '#DCFCE7', color: '#15803D' }}><CheckCircle2 size={18} /></div>
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>Actual disbursement across {items.length} staff</div>
          </div>
        </div>
      </div>

      {/* Main Calculation Table */}
      <div className="card p-0 border-0 overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2">Computing payroll from attendance & leaves...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead style={{ background: '#F8FAFC' }}>
                <tr style={{ fontSize: '11.5px', textTransform: 'uppercase', color: '#475569' }}>
                  <th className="ps-4">Employee</th>
                  <th>Attendance & Days</th>
                  <th>Monthly CTC / Daily Rate</th>
                  <th>Gross Pay</th>
                  <th>Deductions</th>
                  <th>Net Payout</th>
                  <th>Slip</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '13px' }}>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      No employee payroll records found for this period.
                    </td>
                  </tr>
                ) : (
                  items.map((item: any) => {
                    const gross = parseFloat(item.gross_pay) || 0;
                    const deductions = parseFloat(item.total_deductions) || 0;
                    const net = parseFloat(item.net_salary) || 0;
                    const ctc = parseFloat(item.base_monthly_salary) || 0;
                    const payable = parseFloat(item.payable_days) || 0;
                    const working = parseFloat(item.working_days) || 0;

                    const slipUrl = item.salary_slip_url
                      ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${item.salary_slip_url}`
                      : null;

                    return (
                      <tr key={item.employee_id}>
                        <td className="ps-4">
                          <div className="fw-semibold text-dark">{item.name}</div>
                          <div className="text-muted" style={{ fontSize: '11.5px' }}>
                            {item.employee_code} • {item.department || 'General'}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <span className="fw-bold text-success" style={{ fontSize: '13.5px' }}>
                              {payable}
                            </span>
                            <span className="text-muted">/ {working} Days</span>
                          </div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            P: {item.present_days} | Lve: {item.paid_leave_days} | LWP: {item.lwp_days} | Late: {item.late_days}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">
                            {ctc > 0 ? `₹${ctc.toLocaleString('en-IN')}` : <span className="text-warning">₹0 (Set CTC)</span>}
                          </div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            Daily: ₹{parseFloat(item.daily_rate).toFixed(1)}
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold text-primary">₹{gross.toLocaleString('en-IN')}</div>
                          {(parseFloat(item.bonus) > 0 || parseFloat(item.incentive) > 0) && (
                            <span className="badge bg-light text-primary" style={{ fontSize: '10px' }}>
                              +₹{(parseFloat(item.bonus || 0) + parseFloat(item.incentive || 0)).toLocaleString('en-IN')} Bonus
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="fw-bold text-danger">₹{deductions.toLocaleString('en-IN')}</div>
                          <div className="text-muted" style={{ fontSize: '10.5px' }}>
                            PF: ₹{item.pf_deduction} | PT: ₹{item.pt_deduction}
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold text-success" style={{ fontSize: '14px' }}>
                            ₹{net.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td>
                          {slipUrl ? (
                            <button
                              className="btn btn-outline-secondary btn-sm p-1.5"
                              onClick={() => window.open(slipUrl, '_blank')}
                              title="Download Salary Slip PDF"
                            >
                              <Download size={14} />
                            </button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '11px' }}>Pending</span>
                          )}
                        </td>
                        <td className="text-end pe-4">
                          <button
                            className="btn btn-light btn-sm text-primary d-inline-flex align-items-center gap-1"
                            onClick={() => handleOpenAdj(item)}
                            title="Adjust bonus, incentive, or deductions"
                          >
                            <Edit size={13} />
                            <span>Adjust</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Variable Adjustments Modal */}
      <Modal show={showAdjModal} onHide={() => setShowAdjModal(false)} centered>
        <form onSubmit={handleSaveAdj}>
          <Modal.Header closeButton style={{ borderBottom: '1px solid #E2E8F0' }}>
            <Modal.Title style={{ fontSize: '16px', fontWeight: 700 }}>
              Adjust Variable Pay & Deductions: {selectedEmp?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="mb-3">
              <label className="form-label text-muted" style={{ fontSize: '12.5px' }}>Performance Bonus (₹)</label>
              <input
                type="number"
                className="form-control"
                value={adjForm.bonus || ''}
                placeholder="0"
                onChange={(e) => setAdjForm({ ...adjForm, bonus: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-muted" style={{ fontSize: '12.5px' }}>Sales Incentive / Commission (₹)</label>
              <input
                type="number"
                className="form-control"
                value={adjForm.incentive || ''}
                placeholder="0"
                onChange={(e) => setAdjForm({ ...adjForm, incentive: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-muted" style={{ fontSize: '12.5px' }}>Overtime Allowance (₹)</label>
              <input
                type="number"
                className="form-control"
                value={adjForm.overtime || ''}
                placeholder="0"
                onChange={(e) => setAdjForm({ ...adjForm, overtime: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-muted" style={{ fontSize: '12.5px' }}>Advance / Loan Recovery (₹)</label>
              <input
                type="number"
                className="form-control"
                value={adjForm.advance || ''}
                placeholder="0"
                onChange={(e) => setAdjForm({ ...adjForm, advance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-muted" style={{ fontSize: '12.5px' }}>Other Miscellaneous Deductions (₹)</label>
              <input
                type="number"
                className="form-control"
                value={adjForm.other_deductions || ''}
                placeholder="0"
                onChange={(e) => setAdjForm({ ...adjForm, other_deductions: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="mb-2">
              <label className="form-label text-muted" style={{ fontSize: '12.5px' }}>Notes / Remarks</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Festival advance recovery"
                value={adjForm.notes || ''}
                onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid #E2E8F0' }}>
            <Button variant="secondary" onClick={() => setShowAdjModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={processing}>
              {processing ? <Spinner size="sm" animation="border" /> : 'Apply Adjustments'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
