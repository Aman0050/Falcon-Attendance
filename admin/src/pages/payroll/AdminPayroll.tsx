import React, { useState } from 'react';
import {
  Briefcase,
  Users,
  Settings as SettingsIcon,
  FileBarChart
} from 'lucide-react';
import AdminPayrollWizard from './AdminPayrollWizard';
import AdminSalaryProfiles from './AdminSalaryProfiles';
import AdminPayrollSettings from './AdminPayrollSettings';
import AdminPayrollReports from './AdminPayrollReports';

export default function AdminPayroll() {
  const [activeTab, setActiveTab] = useState<'wizard' | 'profiles' | 'settings' | 'reports'>('wizard');

  const tabs = [
    { id: 'wizard', label: 'Monthly Payroll Wizard', icon: Briefcase, badge: 'Live' },
    { id: 'profiles', label: 'Salary Profiles & CTC', icon: Users },
    { id: 'settings', label: 'Payroll Policy & Rules', icon: SettingsIcon },
    { id: 'reports', label: 'Statutory Reports & Exports', icon: FileBarChart },
  ];

  return (
    <div>
      {/* Executive Page Header */}
      <div className="mb-4">
        <div className="d-flex align-items-center gap-2.5 mb-1">
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
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Payroll Calculation Engine
            </h1>
          </div>
        </div>
        <p className="text-muted mb-0" style={{ fontSize: '13.5px' }}>
          Automated monthly salary calculation powered by Falcon Attendance and Leave records with complete statutory compliance.
        </p>
      </div>

      {/* Navigation Tabs Bar */}
      <div
        className="d-flex align-items-center gap-2 p-1.5 mb-4 rounded-4"
        style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className="btn btn-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3 border-0 transition-all text-nowrap"
              style={{
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#2563EB' : '#64748B',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
                boxShadow: isActive ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
              }}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className="badge"
                  style={{
                    backgroundColor: isActive ? '#EFF6FF' : '#E2E8F0',
                    color: isActive ? '#2563EB' : '#475569',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="tab-content">
        {activeTab === 'wizard' && <AdminPayrollWizard />}
        {activeTab === 'profiles' && <AdminSalaryProfiles />}
        {activeTab === 'settings' && <AdminPayrollSettings />}
        {activeTab === 'reports' && <AdminPayrollReports />}
      </div>
    </div>
  );
}
