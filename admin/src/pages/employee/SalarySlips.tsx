import React, { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import axios from 'axios';
import { FileText, Download, Calendar, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SalarySlips() {
  const { token } = useAuth();
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlips = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/employee/salary-slips`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSlips(response.data);
      } catch (err) {
        console.error('Failed to load salary slips');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchSlips();
  }, [token]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="page-title">Salary Slips</h1>
        <p className="text-muted">Access and download your monthly compensation slips</p>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="text-muted mt-2">Loading salary slips...</div>
          </div>
        ) : (
          <div className="table-responsive" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table table-hover mb-0 align-middle">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Payable Days</th>
                  <th>Net Payout</th>
                  <th>Status</th>
                  <th>Generated Date</th>
                  <th className="text-end">Document</th>
                </tr>
              </thead>
              <tbody>
                {slips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      No salary slips currently available for your profile.
                    </td>
                  </tr>
                ) : (
                  slips.map((s) => {
                    const fullUrl = s.file_url
                      ? s.file_url.startsWith('http')
                        ? s.file_url
                        : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${s.file_url}`
                      : null;

                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="p-2 rounded-3 bg-light text-primary">
                              <FileText size={16} />
                            </div>
                            <div>
                              <div className="fw-semibold text-dark">
                                {new Date(0, s.month - 1).toLocaleString('default', { month: 'long' })} {s.year}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {s.payable_days !== undefined ? (
                            <span className="fw-medium text-dark">
                              {parseFloat(s.payable_days)} / {parseFloat(s.working_days || 26)} Days
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {s.net_salary !== undefined ? (
                            <span className="fw-bold text-success" style={{ fontSize: '14px' }}>
                              ₹{parseFloat(s.net_salary).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${s.status === 'GENERATED' ? 'bg-success' : 'bg-secondary'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', color: '#475569' }}>
                          {new Date(s.generated_date).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1.5"
                            disabled={!fullUrl}
                            onClick={() => fullUrl && window.open(fullUrl, '_blank')}
                          >
                            <Download size={14} />
                            <span>Download PDF</span>
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
    </div>
  );
}
