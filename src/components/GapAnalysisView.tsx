import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  RefreshCw,
  BookOpen,
  ArrowRight,
  User,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import { GapAnalysis, UserProfile, Subject, Concept } from '../types';
import {
  getStudentGapAnalyses,
  computeAndSaveGapAnalysis,
  getSubjects,
} from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface GapAnalysisViewProps {
  students: UserProfile[];
  subjects: Subject[];
  concepts: Concept[];
  onGenerateLessonForGaps?: (subject: Subject, weakConceptNames: string[], student: UserProfile) => void;
}

export const GapAnalysisView: React.FC<GapAnalysisViewProps> = ({
  students,
  subjects,
  concepts,
  onGenerateLessonForGaps,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();

  const isStudent = activeRole === 'student';

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    isStudent ? currentUser?.uid || '' : students[0]?.id || currentUser?.uid || ''
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [analyses, setAnalyses] = useState<GapAnalysis[]>([]);
  const [loading, setLoading] = useState(false);

  // Load analyses whenever student changes
  useEffect(() => {
    if (selectedStudentId) {
      loadAnalyses();
    }
  }, [selectedStudentId]);

  const loadAnalyses = async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    try {
      const data = await getStudentGapAnalyses(selectedStudentId);
      setAnalyses(data);
    } finally {
      setLoading(false);
    }
  };

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activeStudent = students.find((s) => s.id === selectedStudentId) || (userProfile as UserProfile);

  // Find analysis for currently selected subject
  const currentAnalysis = analyses.find((a) => a.subjectId === selectedSubjectId);

  const handleRecalculate = async () => {
    if (!selectedStudentId || !selectedSubjectId) return;
    setLoading(true);
    try {
      const updated = await computeAndSaveGapAnalysis(
        selectedStudentId,
        selectedSubjectId,
        currentUser?.uid || 'teacher'
      );
      setAnalyses((prev) => [
        ...prev.filter((a) => a.subjectId !== selectedSubjectId),
        updated,
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Learning Gap Diagnostics & Mastery
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Real-time analytics computed strictly from confirmed student assessment marks. Highlights strengths and targeted misconceptions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Student Selector (If teacher or admin) */}
          {!isStudent && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden dark:text-slate-200"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject Selector */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleRecalculate}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        </div>
      </div>

      {currentAnalysis ? (
        <div className="space-y-6">
          {/* Mastery Score Card */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Overall Subject Mastery
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {currentAnalysis.overallMastery}%
                </span>
                <span className="text-xs text-slate-500">
                  {currentAnalysis.overallMastery >= 75
                    ? 'Proficient'
                    : currentAnalysis.overallMastery >= 50
                    ? 'Developing'
                    : 'Needs Intervention'}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentAnalysis.overallMastery >= 75
                      ? 'bg-emerald-500'
                      : currentAnalysis.overallMastery >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${currentAnalysis.overallMastery}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Mastered Concepts
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {currentAnalysis.strongConcepts?.length || 0}
                </span>
                <span className="text-xs text-slate-500">Concepts with ≥70% score</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Solid foundational grasp verified through assessment evidence.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Learning Gaps Identified
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                  {currentAnalysis.weakConcepts?.length || 0}
                </span>
                <span className="text-xs text-slate-500">Concepts requiring practice</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Targeted for personalized lesson plans and revision quizzes.
              </p>
            </div>
          </div>

          {/* Action Banner: Generate Lesson Plan for these gaps */}
          {currentAnalysis.weakConcepts?.length > 0 && onGenerateLessonForGaps && (
            <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 p-6 text-white shadow-lg shadow-indigo-600/20 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  <h3 className="text-base font-bold">
                    Generate AI Remedial Lesson Plan for {activeStudent?.name}
                  </h3>
                </div>
                <p className="mt-1 max-w-xl text-xs text-indigo-100">
                  Gemini will synthesize step-by-step explanations, real-world analogies, and customized practice targeting:
                  {' '}
                  <strong>{currentAnalysis.weakConcepts.map((w) => w.conceptName).join(', ')}</strong>.
                </p>
              </div>
              <button
                onClick={() =>
                  onGenerateLessonForGaps(
                    activeSubject,
                    currentAnalysis.weakConcepts.map((w) => w.conceptName),
                    activeStudent
                  )
                }
                className="shrink-0 flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-indigo-700 shadow-md hover:bg-indigo-50"
              >
                Generate Tailored Lesson
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Detailed Lists: Weak Concepts vs Strong Concepts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Weak Concepts / Misconceptions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Learning Gaps Requiring Remediation
                  </h3>
                </div>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  {currentAnalysis.weakConcepts?.length || 0} Gaps
                </span>
              </div>

              {currentAnalysis.weakConcepts?.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500 dark:bg-slate-800/50">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-1" />
                  No learning gaps detected! Student has passed all tested concepts.
                </div>
              ) : (
                <div className="space-y-3">
                  {currentAnalysis.weakConcepts.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 dark:border-rose-900/40 dark:bg-rose-950/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {item.conceptName}
                        </span>
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                          {item.scorePercentage}% Score
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {item.remarks}
                      </p>
                      <div className="mt-2 text-[11px] text-slate-400">
                        Based on {item.totalQuestions} assessment question(s) tested.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mastered Strengths */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Verified Conceptual Strengths
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  {currentAnalysis.strongConcepts?.length || 0} Mastered
                </span>
              </div>

              {currentAnalysis.strongConcepts?.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500 dark:bg-slate-800/50">
                  Assessment results pending to demonstrate mastery.
                </div>
              ) : (
                <div className="space-y-3">
                  {currentAnalysis.strongConcepts.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {item.conceptName}
                        </span>
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                          {item.scorePercentage}% Score
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {item.remarks}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Simple Language Actionable Recommendations */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Next Pedagogical Steps (Simple Language Recommendations)
              </h3>
            </div>
            <ul className="space-y-2">
              {currentAnalysis.recommendations?.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {i + 1}
                  </span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <BookOpen className="h-8 w-8 text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Assessment Evidence Recorded Yet
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            LearnLens AI will not claim mastery without actual test data. Record or scan student marks in Assessments to calculate learning diagnostics.
          </p>
          <button
            onClick={handleRecalculate}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Compute Analysis Now
          </button>
        </div>
      )}
    </div>
  );
};
