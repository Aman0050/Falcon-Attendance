import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Spinner } from 'react-bootstrap';

export default function AdminPayrollReports() {
  const { token } = useAuth();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/cycles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setCycles(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCycles();
  }, [token]);

  // Find if a finalized cycle exists for the selected month & year
  const activeCycle = cycles.find((c) => c.month === selectedMonth && c.year === selectedYear);

  const handleDownload = async (type: 'salary-register' | 'pf' | 'esic' | 'summary-pdf', filename: string) => {
    try {
      setDownloading(type);
      const queryParams = new URLSearchParams();
      queryParams.append('month', String(selectedMonth));
      queryParams.append('year', String(selectedYear));
      if (activeCycle) {
        queryParams.append('cycleId', String(activeCycle.id));
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/payroll/reports/${type}?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate report. Please verify that payroll data exists for this period.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      {/* Header & Controls Strip */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Payroll Reports & Statutory Compliance Exports
            </h2>
            {activeCycle ? (
              <span className="badge bg-success px-2 py-1" style={{ fontSize: '11px', borderRadius: '6px' }}>
                <CheckCircle2 size={12} className="me-1" />
                {activeCycle.status === 'FINALIZED' ? 'Finalized Cycle' : activeCycle.status}
              </span>
            ) : (
              <span className="badge bg-primary px-2 py-1" style={{ fontSize: '11px', borderRadius: '6px' }}>
                <Clock size={12} className="me-1" />
                Live Calculation Preview
              </span>
            )}
          </div>
          <p className="text-muted mb-0" style={{ fontSize: '13.5px' }}>
            Generate and export official Salary Registers, PF/ESIC statutory compliance spreadsheets, and executive PDF summaries.
          </p>
        </div>

        {/* Period Selector (Month & Year) */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Calendar size={18} className="text-primary" />
          
          <select
            className="form-select form-select-sm fw-semibold"
            style={{ minWidth: '140px', borderRadius: '8px' }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {monthNames.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

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
            className="btn btn-outline-secondary btn-sm p-1.5"
            onClick={fetchCycles}
            title="Refresh status"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Mode Information Banner */}
      <div
        className="p-3 mb-4 rounded-3 d-flex align-items-center gap-2.5"
        style={{
          background: activeCycle ? '#F0FDF4' : '#EFF6FF',
          border: `1px solid ${activeCycle ? '#BBF7D0' : '#BFDBFE'}`,
          fontSize: '13px',
          color: activeCycle ? '#166534' : '#1E40AF',
        }}
      >
        {activeCycle ? <CheckCircle2 size={18} className="flex-shrink-0 text-success" /> : <AlertCircle size={18} className="flex-shrink-0 text-primary" />}
        <div>
          {activeCycle ? (
            <span>
              Exporting finalized payroll cycle records for <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong> (Cycle #{activeCycle.id}, Status: {activeCycle.status}).
            </span>
          ) : (
            <span>
              Exporting live computed payroll metrics for <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong> directly from real-time Attendance and Leave records.
            </span>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="row g-4">
        {/* Report 1: Salary Register */}
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 p-4 border-0 d-flex flex-column" style={{ borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
            <div className="p-3 rounded-3 d-inline-flex mb-3" style={{ background: '#EFF6FF', color: '#2563EB', width: 'fit-content' }}>
              <FileSpreadsheet size={24} />
            </div>
            <h5 className="fw-bold text-dark mb-1" style={{ fontSize: '16px' }}>Salary Register</h5>
            <p className="text-muted mb-4" style={{ fontSize: '12.5px', flexGrow: 1, lineHeight: 1.5 }}>
              Comprehensive master sheet containing employee details, payable days, component breakdown, deductions, and net payouts.
            </p>
            <button
              className="btn btn-primary d-flex align-items-center justify-content-center gap-2 w-100 py-2"
              style={{ fontWeight: 600, borderRadius: '10px' }}
              disabled={downloading === 'salary-register'}
              onClick={() => handleDownload('salary-register', `Salary_Register_${selectedMonth}_${selectedYear}.xlsx`)}
            >
              {downloading === 'salary-register' ? <Spinner size="sm" animation="border" /> : <Download size={15} />}
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Report 2: PF Statutory Report */}
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 p-4 border-0 d-flex flex-column" style={{ borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
            <div className="p-3 rounded-3 d-inline-flex mb-3" style={{ background: '#CCFBF1', color: '#0D9488', width: 'fit-content' }}>
              <ShieldCheck size={24} />
            </div>
            <h5 className="fw-bold text-dark mb-1" style={{ fontSize: '16px' }}>EPF Compliance</h5>
            <p className="text-muted mb-4" style={{ fontSize: '12.5px', flexGrow: 1, lineHeight: 1.5 }}>
              Monthly Employees' Provident Fund filing format with UANs, basic wages, employee 12% contribution, and matching employer share.
            </p>
            <button
              className="btn btn-success d-flex align-items-center justify-content-center gap-2 w-100 py-2"
              style={{ fontWeight: 600, borderRadius: '10px', backgroundColor: '#0D9488', borderColor: '#0D9488' }}
              disabled={downloading === 'pf'}
              onClick={() => handleDownload('pf', `PF_Report_${selectedMonth}_${selectedYear}.xlsx`)}
            >
              {downloading === 'pf' ? <Spinner size="sm" animation="border" /> : <Download size={15} />}
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Report 3: ESIC Statutory Report */}
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 p-4 border-0 d-flex flex-column" style={{ borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
            <div className="p-3 rounded-3 d-inline-flex mb-3" style={{ background: '#FAE8FF', color: '#A21CAF', width: 'fit-content' }}>
              <Building size={24} />
            </div>
            <h5 className="fw-bold text-dark mb-1" style={{ fontSize: '16px' }}>ESIC Compliance</h5>
            <p className="text-muted mb-4" style={{ fontSize: '12.5px', flexGrow: 1, lineHeight: 1.5 }}>
              Employee State Insurance monthly challan report detailing IP numbers, gross wages, employee 0.75% and employer 3.25% share.
            </p>
            <button
              className="btn d-flex align-items-center justify-content-center gap-2 w-100 py-2 text-white"
              style={{ fontWeight: 600, borderRadius: '10px', backgroundColor: '#9333EA', borderColor: '#9333EA' }}
              disabled={downloading === 'esic'}
              onClick={() => handleDownload('esic', `ESIC_Report_${selectedMonth}_${selectedYear}.xlsx`)}
            >
              {downloading === 'esic' ? <Spinner size="sm" animation="border" /> : <Download size={15} />}
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Report 4: Executive PDF Summary */}
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 p-4 border-0 d-flex flex-column" style={{ borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
            <div className="p-3 rounded-3 d-inline-flex mb-3" style={{ background: '#FEF2F2', color: '#DC2626', width: 'fit-content' }}>
              <FileText size={24} />
            </div>
            <h5 className="fw-bold text-dark mb-1" style={{ fontSize: '16px' }}>Executive Summary</h5>
            <p className="text-muted mb-4" style={{ fontSize: '12.5px', flexGrow: 1, lineHeight: 1.5 }}>
              Formal landscape PDF executive summary ready for management sign-off, board review, and internal auditing records.
            </p>
            <button
              className="btn btn-danger d-flex align-items-center justify-content-center gap-2 w-100 py-2"
              style={{ fontWeight: 600, borderRadius: '10px' }}
              disabled={downloading === 'summary-pdf'}
              onClick={() => handleDownload('summary-pdf', `Payroll_Summary_${selectedMonth}_${selectedYear}.pdf`)}
            >
              {downloading === 'summary-pdf' ? <Spinner size="sm" animation="border" /> : <Download size={15} />}
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
