import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  Sparkles,
  Plus,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  Filter,
  User,
  Layers,
  ArrowRight,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  Assignment,
  Submission,
  Assessment,
  MarkRecord,
  UserProfile,
  Subject,
} from '../types';
import { saveAssignment, computeAndSaveGapAnalysis } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface ReassessmentViewProps {
  assignments: Assignment[];
  submissions: Submission[];
  assessments: Assessment[];
  marks: MarkRecord[];
  students: UserProfile[];
  subjects: Subject[];
  onRefresh: () => void;
}

export const ReassessmentView: React.FC<ReassessmentViewProps> = ({
  assignments,
  submissions,
  assessments,
  marks,
  students,
  subjects,
  onRefresh,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();

  const isTeacherOrAdmin = activeRole === 'teacher' || activeRole === 'admin';
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    activeRole === 'student' ? currentUser?.uid || '' : students[0]?.id || ''
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Reassessment creation form
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [originalAssessmentId, setOriginalAssessmentId] = useState(
    assessments[0]?.id || ''
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  // Compute Comparison Deltas: Original vs Reassessment
  const studentMarks = marks.filter((m) => m.studentId === selectedStudentId);
  const studentSubs = submissions.filter((s) => s.studentId === selectedStudentId);

  // Reassessment items
  const reassessments = assignments.filter((a) => a.isReassessment);

  const comparisons = reassessments.map((rass) => {
    const originalAsmt = assessments.find((a) => a.id === rass.originalAssessmentId);
    const origMark = studentMarks.find((m) => m.assessmentId === rass.originalAssessmentId);
    const reassessSub = studentSubs.find((s) => s.assignmentId === rass.id);

    const origPct = origMark ? origMark.percentage : 0;
    const newPct = reassessSub ? reassessSub.percentage : 0;
    const delta = newPct - origPct;

    return {
      title: rass.title,
      originalTitle: originalAsmt?.title || 'Initial Diagnostic Assessment',
      subject: subjects.find((s) => s.id === rass.subjectId)?.name || 'Curriculum',
      origScore: origMark ? `${origMark.marksObtained} / ${origMark.maxMarks}` : 'Pending',
      origPct,
      newScore: reassessSub ? `${reassessSub.totalScore} / ${reassessSub.maxScore}` : 'Not taken',
      newPct,
      delta,
      hasReassessed: Boolean(reassessSub),
      conceptTarget: rass.targetConceptIds?.[0] || 'Core Skills',
    };
  });

  const handleCreateReassessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId) return;

    const originalAsmt = assessments.find((a) => a.id === originalAssessmentId);

    const newReassessment: Assignment = {
      id: `reassess_${Date.now()}`,
      title: title.trim(),
      subjectId,
      originalAssessmentId,
      teacherId: currentUser?.uid || userProfile?.id || 'teacher',
      targetConceptIds: originalAsmt?.conceptIds || ['Core Review'],
      dueDate,
      isReassessment: true,
      questions: [
        {
          id: 'rq1',
          type: 'mcq',
          question: 'Solve for x: x^2 - 8x + 15 = 0',
          options: ['x = 3, 5', 'x = -3, -5', 'x = 2, 7', 'x = 0, 8'],
          correctAnswer: 'x = 3, 5',
          points: 10,
          conceptId: 'c_alg_quad',
        },
        {
          id: 'rq2',
          type: 'mcq',
          question: 'What is the nature of the roots if the discriminant is greater than zero?',
          options: ['Two distinct real roots', 'One repeated real root', 'No real roots', 'Undefined'],
          correctAnswer: 'Two distinct real roots',
          points: 10,
          conceptId: 'c_alg_quad',
        },
        {
          id: 'rq3',
          type: 'mcq',
          question: 'Which factoring method is most appropriate for: 3x^2 + 10x + 8?',
          options: ['Grouping with factors (3x + 4)(x + 2)', 'Difference of squares', 'Common factor', 'None'],
          correctAnswer: 'Grouping with factors (3x + 4)(x + 2)',
          points: 10,
          conceptId: 'c_alg_quad',
        },
      ],
      assignedToStudentIds: selectedStudentId ? [selectedStudentId] : students.map((s) => s.id),
      createdAt: new Date().toISOString(),
    };

    await saveAssignment(newReassessment);
    setCreateModalOpen(false);
    setTitle('');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Assignments & Reassessment Growth
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Measure learning delta between initial test scores and targeted post-remediation assessments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Student Selector */}
          {isTeacherOrAdmin && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isTeacherOrAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              New Reassessment Task
            </button>
          )}
        </div>
      </div>

      {/* Comparison Growth Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Learning Growth Delta Trackers
        </h2>

        {comparisons.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            No reassessments created yet. Use "New Reassessment Task" to test student improvement after practice.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {comparisons.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {c.subject}
                  </span>
                  <span className="text-[11px] text-slate-400">Target: {c.conceptTarget}</span>
                </div>

                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-500">Linked to: {c.originalTitle}</p>

                {/* Score Comparison Display */}
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Initial Score
                    </span>
                    <p className="mt-0.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {c.origPct}%
                    </p>
                    <span className="text-[10px] text-slate-400">({c.origScore})</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Reassessment
                    </span>
                    <p className="mt-0.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {c.hasReassessed ? `${c.newPct}%` : 'Pending'}
                    </p>
                    <span className="text-[10px] text-slate-400">({c.newScore})</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Growth Delta
                    </span>
                    <p
                      className={`mt-0.5 text-sm font-extrabold flex items-center justify-center gap-0.5 ${
                        c.delta > 0
                          ? 'text-emerald-600'
                          : c.delta < 0
                          ? 'text-rose-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {c.delta > 0 && <ArrowUpRight className="h-4 w-4" />}
                      {c.delta > 0 ? `+${c.delta}%` : `${c.delta}%`}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {c.delta >= 15 ? 'Significant Growth' : 'Steady Progress'}
                    </span>
                  </div>
                </div>

                {c.delta > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Evidence of learning gap closure confirmed! Diagnostics updated.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Reassessment Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Create Reassessment Assignment
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Target previously missed questions with fresh equivalent problem variations.
            </p>

            <form onSubmit={handleCreateReassessment} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reassessment Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unit 3 Quadratics - Post-Remediation Check"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Original Prior Assessment (for Baseline Comparison)
                </label>
                <select
                  value={originalAssessmentId}
                  onChange={(e) => setOriginalAssessmentId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.assessmentDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Publish Reassessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
