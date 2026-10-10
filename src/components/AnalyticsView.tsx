import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import {
  Assessment,
  MarkRecord,
  SchoolClass,
  Subject,
  UserProfile,
  GapAnalysis,
  Submission,
} from '../types';
import { useAuth } from '../context/AuthContext';

interface AnalyticsViewProps {
  assessments: Assessment[];
  marks: MarkRecord[];
  classes: SchoolClass[];
  subjects: Subject[];
  students: UserProfile[];
  gapAnalyses: GapAnalysis[];
  submissions: Submission[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  assessments,
  marks,
  classes,
  subjects,
  students,
  gapAnalyses,
  submissions,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const isStudent = activeRole === 'student';

  // Filter marks based on role and selected filters
  const filteredMarks = marks.filter((m) => {
    if (isStudent && m.studentId !== currentUser?.uid) return false;
    const asmt = assessments.find((a) => a.id === m.assessmentId);
    if (!asmt) return true;
    if (selectedSubjectId !== 'all' && asmt.subjectId !== selectedSubjectId) return false;
    if (selectedClassId !== 'all' && asmt.classId !== selectedClassId) return false;
    return true;
  });

  // Calculate stats
  const totalConfirmedAssessments = filteredMarks.length;
  const avgPercentage =
    totalConfirmedAssessments > 0
      ? Math.round(
          filteredMarks.reduce((sum, m) => sum + m.percentage, 0) / totalConfirmedAssessments
        )
      : 0;

  const highestScore =
    totalConfirmedAssessments > 0
      ? Math.max(...filteredMarks.map((m) => m.percentage))
      : 0;

  const lowestScore =
    totalConfirmedAssessments > 0
      ? Math.min(...filteredMarks.map((m) => m.percentage))
      : 0;

  // Grade distributions (A: >=80, B: 65-79, C: 50-64, Below: <50)
  const distA = filteredMarks.filter((m) => m.percentage >= 80).length;
  const distB = filteredMarks.filter((m) => m.percentage >= 65 && m.percentage < 80).length;
  const distC = filteredMarks.filter((m) => m.percentage >= 50 && m.percentage < 65).length;
  const distD = filteredMarks.filter((m) => m.percentage < 50).length;

  // CSV Export Function
  const exportMarksToCsv = () => {
    const headers = ['Mark ID', 'Assessment Title', 'Student Name', 'Marks Obtained', 'Max Marks', 'Percentage', 'Status', 'Date'];
    const rows = filteredMarks.map((m) => {
      const asmt = assessments.find((a) => a.id === m.assessmentId);
      return [
        m.id,
        `"${asmt?.title || 'Assessment'}"`,
        `"${m.studentName}"`,
        m.marksObtained,
        m.maxMarks,
        `${m.percentage}%`,
        m.status,
        m.confirmedAt ? m.confirmedAt.split('T')[0] : 'N/A',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `learnlens_assessment_marks_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <BarChart3 className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Institutional Reports & Analytics
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Real performance distributions, class mastery analytics, and verifiable assessment records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Subject Filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>

          {/* Class Filter (For teachers/admins) */}
          {!isStudent && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          )}

          {/* CSV Export Button */}
          <button
            onClick={exportMarksToCsv}
            disabled={filteredMarks.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Assessed Papers
          </span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalConfirmedAssessments}
          </p>
          <span className="mt-1 block text-[11px] text-slate-500">Confirmed verified scores</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Average Score
          </span>
          <p className="mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {avgPercentage}%
          </p>
          <span className="mt-1 block text-[11px] text-slate-500">Across selected filters</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Highest Score
          </span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {highestScore}%
          </p>
          <span className="mt-1 block text-[11px] text-slate-500">Top performance mark</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Pass Rate (≥50%)
          </span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalConfirmedAssessments > 0
              ? Math.round(((distA + distB + distC) / totalConfirmedAssessments) * 100)
              : 0}
            %
          </p>
          <span className="mt-1 block text-[11px] text-slate-500">Meeting proficiency benchmark</span>
        </div>
      </div>

      {/* Visual Distribution Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Score Tier Distribution
        </h3>

        {totalConfirmedAssessments === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No assessment marks available for the selected filters.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700 dark:text-emerald-400">Distinction (80% - 100%)</span>
                <span>{distA} students ({Math.round((distA / totalConfirmedAssessments) * 100)}%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(distA / totalConfirmedAssessments) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-700 dark:text-blue-400">Proficient (65% - 79%)</span>
                <span>{distB} students ({Math.round((distB / totalConfirmedAssessments) * 100)}%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(distB / totalConfirmedAssessments) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700 dark:text-amber-400">Satisfactory (50% - 64%)</span>
                <span>{distC} students ({Math.round((distC / totalConfirmedAssessments) * 100)}%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(distC / totalConfirmedAssessments) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700 dark:text-rose-400">Needs Remediation (&lt;50%)</span>
                <span>{distD} students ({Math.round((distD / totalConfirmedAssessments) * 100)}%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${(distD / totalConfirmedAssessments) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verified Marks Records Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Individual Assessment Result Ledger
        </h3>

        {filteredMarks.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Assessment</th>
                  <th className="p-3">Marks Scored</th>
                  <th className="p-3">Percentage</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMarks.map((m) => {
                  const asmt = assessments.find((a) => a.id === m.assessmentId);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {m.studentName}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {asmt?.title || 'Assessment'}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {m.marksObtained} / {m.maxMarks}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            m.percentage >= 70
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : m.percentage >= 50
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {m.percentage}%
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {m.confirmedAt ? m.confirmedAt.split('T')[0] : 'Today'}
                      </td>
                      <td className="p-3 text-emerald-600 font-semibold uppercase text-[10px]">
                        {m.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
