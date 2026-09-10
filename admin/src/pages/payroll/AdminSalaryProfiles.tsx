import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Edit,
  History,
  Calculator
} from 'lucide-react';
import { Modal, Spinner, Button } from 'react-bootstrap';

export default function AdminSalaryProfiles() {
  const { token } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    monthly_ctc: 0,
    basic_salary: 0,
    hra: 0,
    da: 0,
    conveyance_allowance: 0,
    medical_allowance: 0,
    special_allowance: 0,
    pf_applicable: true,
    esic_applicable: false,
    pt_applicable: true,
    tds_percent: 0,
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    pan_number: '',
    uan_number: '',
    esic_number: '',
    effective_date: new Date().toISOString().split('T')[0],
    revision_reason: '',
  });

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setProfiles(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProfiles();
  }, [token]);

  const handleOpenEdit = (p: any) => {
    setSelectedProfile(p);
    setForm({
      monthly_ctc: parseFloat(p.monthly_ctc) || 0,
      basic_salary: parseFloat(p.basic_salary) || 0,
      hra: parseFloat(p.hra) || 0,
      da: parseFloat(p.da) || 0,
      conveyance_allowance: parseFloat(p.conveyance_allowance) || 0,
      medical_allowance: parseFloat(p.medical_allowance) || 0,
      special_allowance: parseFloat(p.special_allowance) || 0,
      pf_applicable: p.pf_applicable !== false,
      esic_applicable: p.esic_applicable === true,
      pt_applicable: p.pt_applicable !== false,
      tds_percent: parseFloat(p.tds_percent) || 0,
      bank_name: p.bank_name || '',
      account_number: p.account_number || '',
      ifsc_code: p.ifsc_code || '',
      pan_number: p.pan_number || '',
      uan_number: p.uan_number || '',
      esic_number: p.esic_number || '',
      effective_date: new Date().toISOString().split('T')[0],
      revision_reason: '',
    });
    setFeedback(null);
    setShowEditModal(true);
  };

  const handleOpenHistory = async (p: any) => {
    setSelectedProfile(p);
    setShowHistoryModal(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/profiles/${p.id}/revisions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setHistoryList(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Standard Indian Salary Structure auto-calculation formula helper
  const handleAutoCalculate = () => {
    const ctc = parseFloat(String(form.monthly_ctc)) || 0;
    if (ctc <= 0) return;

    // Basic = 50% of CTC
    const basic = Math.round(ctc * 0.5);
    // HRA = 50% of Basic (Metropolitan standard)
    const hra = Math.round(basic * 0.5);
    // DA = 10% of Basic
    const da = Math.round(basic * 0.1);
    // Fixed allowances
    const conv = 1600;
    const med = 1250;
    // Special = remainder
    const subtotal = basic + hra + da + conv + med;
    const special = Math.max(0, ctc - subtotal);

    setForm({
      ...form,
      basic_salary: basic,
      hra,
      da,
      conveyance_allowance: conv,
      medical_allowance: med,
      special_allowance: special,
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;

    try {
      setSaving(true);
      setFeedback(null);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/profiles/${selectedProfile.id}`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setFeedback({ type: 'success', text: 'Salary profile saved successfully!' });
        fetchProfiles();
        setTimeout(() => setShowEditModal(false), 1200);
      }
    } catch (err: any) {
      setFeedback({ type: 'danger', text: err.response?.data?.error?.message || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.employee_id?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header & Search */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Employee Salary Profiles & Compensation
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: '13.5px' }}>
            Configure fixed CTC components, statutory deductibility, and employee banking records.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2" style={{ maxWidth: '320px', width: '100%' }}>
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <Search size={16} className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Search staff, code, dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="card p-0 border-0 overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2">Loading salary profiles...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead style={{ background: '#F8FAFC' }}>
                <tr style={{ fontSize: '12px', textTransform: 'uppercase', color: '#475569' }}>
                  <th className="ps-4">Employee</th>
                  <th>Department / Role</th>
                  <th>Monthly CTC</th>
                  <th>Basic Salary</th>
                  <th>Compliance</th>
                  <th>Bank Account</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '13.5px' }}>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No employee salary profiles found matching your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const ctc = parseFloat(p.monthly_ctc) || 0;
                    const basic = parseFloat(p.basic_salary) || 0;
                    return (
                      <tr key={p.id}>
                        <td className="ps-4">
                          <div className="fw-semibold text-dark">{p.name}</div>
                          <div className="text-muted" style={{ fontSize: '12px' }}>
                            {p.employee_id} • {p.email}
                          </div>
                        </td>
                        <td>
                          <div className="fw-medium text-dark">{p.department || 'General'}</div>
                          <div className="text-muted" style={{ fontSize: '12px' }}>{p.designation || 'Staff'}</div>
                        </td>
                        <td>
                          <div className="fw-bold" style={{ color: ctc > 0 ? '#0F172A' : '#94A3B8' }}>
                            {ctc > 0 ? `₹${ctc.toLocaleString('en-IN')}` : 'Not Set'}
                          </div>
                        </td>
                        <td>
                          <div className="fw-medium text-dark">
                            {basic > 0 ? `₹${basic.toLocaleString('en-IN')}` : '-'}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <span className={`badge ${p.pf_applicable ? 'bg-primary' : 'bg-light text-muted'}`} style={{ fontSize: '10px' }}>
                              PF
                            </span>
                            <span className={`badge ${p.esic_applicable ? 'bg-info' : 'bg-light text-muted'}`} style={{ fontSize: '10px' }}>
                              ESIC
                            </span>
                            <span className={`badge ${p.pt_applicable ? 'bg-success' : 'bg-light text-muted'}`} style={{ fontSize: '10px' }}>
                              PT
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="text-dark" style={{ fontSize: '12.5px' }}>
                            {p.bank_name ? `${p.bank_name}` : <span className="text-muted">Not Configured</span>}
                          </div>
                          {p.account_number && (
                            <div className="text-muted font-monospace" style={{ fontSize: '11.5px' }}>
                              A/C: ••••{p.account_number.slice(-4)}
                            </div>
                          )}
                        </td>
                        <td className="text-end pe-4">
                          <div className="d-inline-flex align-items-center gap-1.5">
                            <button
                              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                              onClick={() => handleOpenEdit(p)}
                              title="Edit Salary Structure"
                            >
                              <Edit size={14} />
                              <span>Configure</span>
                            </button>
                            <button
                              className="btn btn-light btn-sm text-muted"
                              onClick={() => handleOpenHistory(p)}
                              title="Revision History"
                            >
                              <History size={14} />
                            </button>
                          </div>
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

      {/* Edit Salary Structure Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <form onSubmit={handleSaveProfile}>
          <Modal.Header closeButton style={{ borderBottom: '1px solid #E2E8F0' }}>
            <Modal.Title style={{ fontSize: '17px', fontWeight: 700 }}>
              Configure Salary Profile: {selectedProfile?.name} ({selectedProfile?.employee_id})
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {feedback && (
              <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'} py-2 mb-3`} style={{ borderRadius: '10px', fontSize: '13px' }}>
                {feedback.text}
              </div>
            )}

            {/* CTC Input & Quick Calculator Banner */}
            <div className="p-3 mb-4 rounded-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <div style={{ flex: 1 }}>
                  <label className="fw-bold text-primary mb-1" style={{ fontSize: '13px' }}>
                    Monthly Total CTC (INR)
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-lg fw-bold"
                    style={{ fontSize: '18px', color: '#1E3A8A' }}
                    placeholder="e.g. 50000"
                    value={form.monthly_ctc || ''}
                    onChange={(e) => setForm({ ...form, monthly_ctc: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="d-flex flex-column justify-content-end">
                  <button
                    type="button"
                    className="btn btn-primary d-inline-flex align-items-center gap-1.5 px-3 py-2"
                    onClick={handleAutoCalculate}
                    title="Auto split into Basic, HRA, DA, Allowances"
                  >
                    <Calculator size={16} />
                    <span>Auto-Split Components</span>
                  </button>
                </div>
              </div>
              <div className="text-muted mt-2" style={{ fontSize: '11.5px' }}>
                Auto-split applies standard Indian structure: Basic (50%), HRA (50% of Basic), DA (10%), Conveyance ₹1,600, Medical ₹1,250, and Special Allowance (Remainder).
              </div>
            </div>

            {/* Component Breakdown */}
            <h6 className="fw-bold mb-3" style={{ fontSize: '14px', color: '#0F172A' }}>Monthly Component Breakdown</h6>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>Basic Salary (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.basic_salary || ''}
                  onChange={(e) => setForm({ ...form, basic_salary: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>House Rent Allowance (HRA)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.hra || ''}
                  onChange={(e) => setForm({ ...form, hra: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>Dearness Allowance (DA)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.da || ''}
                  onChange={(e) => setForm({ ...form, da: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>Conveyance Allowance</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.conveyance_allowance || ''}
                  onChange={(e) => setForm({ ...form, conveyance_allowance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>Medical Allowance</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.medical_allowance || ''}
                  onChange={(e) => setForm({ ...form, medical_allowance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>Special Allowance</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.special_allowance || ''}
                  onChange={(e) => setForm({ ...form, special_allowance: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Statutory Compliance Toggles */}
            <h6 className="fw-bold mb-3" style={{ fontSize: '14px', color: '#0F172A' }}>Statutory Applicability & Tax</h6>
            <div className="row g-3 p-3 mb-4 rounded-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="col-md-3">
                <div className="form-check form-switch pt-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="pfCheck"
                    checked={form.pf_applicable}
                    onChange={(e) => setForm({ ...form, pf_applicable: e.target.checked })}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="pfCheck" style={{ fontSize: '12.5px' }}>
                    PF Deductible
                  </label>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-check form-switch pt-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="esicCheck"
                    checked={form.esic_applicable}
                    onChange={(e) => setForm({ ...form, esic_applicable: e.target.checked })}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="esicCheck" style={{ fontSize: '12.5px' }}>
                    ESIC Covered
                  </label>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-check form-switch pt-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="ptCheck"
                    checked={form.pt_applicable}
                    onChange={(e) => setForm({ ...form, pt_applicable: e.target.checked })}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="ptCheck" style={{ fontSize: '12.5px' }}>
                    PT Applicable
                  </label>
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label text-muted mb-1" style={{ fontSize: '11px' }}>TDS Withholding (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control form-control-sm"
                  value={form.tds_percent || ''}
                  placeholder="0.0"
                  onChange={(e) => setForm({ ...form, tds_percent: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Bank & Identification Information */}
            <h6 className="fw-bold mb-3" style={{ fontSize: '14px', color: '#0F172A' }}>Banking & Statutory IDs</h6>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>Bank Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. HDFC Bank"
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>Account Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="A/C Number"
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>IFSC Code</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. HDFC0001234"
                  value={form.ifsc_code}
                  onChange={(e) => setForm({ ...form, ifsc_code: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>PAN Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ABCDE1234F"
                  value={form.pan_number}
                  onChange={(e) => setForm({ ...form, pan_number: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>UAN Number (PF)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="12-digit UAN"
                  value={form.uan_number}
                  onChange={(e) => setForm({ ...form, uan_number: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted" style={{ fontSize: '12px' }}>ESIC IP Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ESIC IP No"
                  value={form.esic_number}
                  onChange={(e) => setForm({ ...form, esic_number: e.target.value })}
                />
              </div>
            </div>

            {/* Revision Reason if changing */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '12.5px' }}>
                Revision Reason / Remarks (For Audit Trail)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Annual Appraisal, Increment, Correction"
                value={form.revision_reason}
                onChange={(e) => setForm({ ...form, revision_reason: e.target.value })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid #E2E8F0' }}>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" animation="border" /> : 'Save Profile'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Salary Revision History Modal */}
      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #E2E8F0' }}>
          <Modal.Title style={{ fontSize: '16px', fontWeight: 700 }}>
            Compensation Revision History: {selectedProfile?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          {historyList.length === 0 ? (
            <div className="text-center py-4 text-muted" style={{ fontSize: '13px' }}>
              No recorded CTC revisions for this employee.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr style={{ fontSize: '11.5px', color: '#64748B' }}>
                    <th>Date</th>
                    <th>Previous CTC</th>
                    <th>New CTC</th>
                    <th>Reason</th>
                    <th>Changed By</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '12.5px' }}>
                  {historyList.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.effective_date).toLocaleDateString()}</td>
                      <td className="text-muted">₹{parseFloat(h.previous_ctc).toLocaleString('en-IN')}</td>
                      <td className="fw-bold text-success">₹{parseFloat(h.new_ctc).toLocaleString('en-IN')}</td>
                      <td>{h.reason || '-'}</td>
                      <td>{h.revised_by_name || 'Admin'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
