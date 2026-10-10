import React from 'react';
import {
  ScanLine,
  GitFork,
  BookOpenCheck,
  AlertTriangle,
  GraduationCap,
  TrendingUp,
  Award,
  Users,
  Presentation,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
} from 'lucide-react';
import {
  Assessment,
  MarkRecord,
  LessonPlan,
  LearningResource,
  Assignment,
  GapAnalysis,
  UserProfile,
  Subject,
} from '../types';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  assessments: Assessment[];
  marks: MarkRecord[];
  lessonPlans: LessonPlan[];
  resources: LearningResource[];
  assignments: Assignment[];
  gapAnalyses: GapAnalysis[];
  students: UserProfile[];
  subjects: Subject[];
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  assessments,
  marks,
  lessonPlans,
  resources,
  assignments,
  gapAnalyses,
  students,
  subjects,
  onNavigate,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();

  const role = activeRole || 'student';

  // Computed metrics
  const totalAssessed = marks.length;
  const avgScore =
    marks.length > 0
      ? Math.round(marks.reduce((sum, m) => sum + m.percentage, 0) / marks.length)
      : 0;

  // Student specific metrics
  const myMarks = marks.filter((m) => m.studentId === currentUser?.uid);
  const myAvg =
    myMarks.length > 0
      ? Math.round(myMarks.reduce((sum, m) => sum + m.percentage, 0) / myMarks.length)
      : 0;
  const myGaps = gapAnalyses.flatMap((ga) => ga.weakConcepts || []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 p-6 text-white shadow-xl shadow-indigo-600/20">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-indigo-200">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                ✦
              </span>
              <span className="text-xs font-semibold tracking-wide uppercase">
                {role === 'admin'
                  ? 'Administrator Executive View'
                  : role === 'teacher'
                  ? 'Educator Master Workspace'
                  : 'Student Learning Dashboard'}
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight">
              Welcome, {userProfile?.name}!
            </h1>
            <p className="mt-1 max-w-xl text-xs text-indigo-100">
              {role === 'student'
                ? 'Your personal AI tutor is analyzing your assessments to build custom lesson plans and targeted practice.'
                : 'Empowering precision education with Gemini multimodal OCR scanning, concept mapping, and instant remedial lesson generation.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {role !== 'student' ? (
              <button
                onClick={() => onNavigate('assessments')}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-md hover:bg-indigo-50"
              >
                <ScanLine className="h-4 w-4" />
                Scan Assessment Paper
              </button>
            ) : (
              <button
                onClick={() => onNavigate('student-portal')}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-md hover:bg-indigo-50"
              >
                <GraduationCap className="h-4 w-4" />
                Open Learning Hub
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {role === 'student' ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                My Average Score
              </span>
              <p className="mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {myAvg}%
              </p>
              <span className="mt-1 block text-[11px] text-slate-500">
                Based on {myMarks.length} confirmed test(s)
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Target Concepts
              </span>
              <p className="mt-2 text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                {myGaps.length}
              </p>
              <span className="mt-1 block text-[11px] text-slate-500">
                Misconceptions to master
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Lessons
              </span>
              <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {lessonPlans.length}
              </p>
              <span className="mt-1 block text-[11px] text-slate-500">
                Tailored for your pace
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Practice Quizzes
              </span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {assignments.length}
              </p>
              <span className="mt-1 block text-[11px] text-slate-500">
                Available to test skills
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Assessments
              </span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {assessments.length}
              </p>
              <span className="mt-1 block text-[11px] text-slate-500">
                {totalAssessed} student mark sheets
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Class Average Mastery
              </span>
              <p className="mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {avgScore}%
              </p>
              <span className="mt-1 block text-[11px] text-slate-500">
                Calculated across all papers
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Enrolled Students
              </span>
              <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {students.length}
              </p>
              <span className="mt-1 block text-[11px] text-slate-500">Active learners</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Generated Lesson Plans
              </span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {lessonPlans.length}
              </p>
              <span className="mt-1 block text-[11px] text-slate-500">
                Remedial curriculums
              </span>
            </div>
          </>
        )}
      </div>

      {/* QUICK LAUNCH TILES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          onClick={() => onNavigate('concept-map')}
          className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <GitFork className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600">
            Interactive Concept Map
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Inspect the visual knowledge graph, prerequisite pathways, and color-coded mastery tiers.
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <span>Explore Map</span>
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('gap-analysis')}
          className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-rose-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600">
            Learning Gap Analysis
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Diagnostics computed from test marks showing exactly which concepts require intervention.
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
            <span>View Diagnostics</span>
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('resources')}
          className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-amber-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <Presentation className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600">
            PowerPoint & Resource Studio
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Generate and download genuine Microsoft PowerPoint presentations (.pptx) and study cheat sheets.
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>Open Studio</span>
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY & ASSESSMENTS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Confirmed Assessments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Assessment Papers
            </h3>
            <button
              onClick={() => onNavigate('assessments')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              View all ({assessments.length})
            </button>
          </div>

          {assessments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No assessments created yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {assessments.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{a.title}</p>
                    <span className="text-[10px] text-slate-400">
                      {a.assessmentDate} • Max Marks: {a.maxMarks}
                    </span>
                  </div>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {a.questions?.length || 0} Questions
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Lessons / Remedial Roadmap */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              AI Generated Lesson Plans
            </h3>
            <button
              onClick={() => onNavigate('lesson-plans')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              View all ({lessonPlans.length})
            </button>
          </div>

          {lessonPlans.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No lesson plans generated yet. Use the Lesson Plan studio to synthesize targeted plans.
            </div>
          ) : (
            <div className="space-y-2.5">
              {lessonPlans.slice(0, 4).map((lp) => (
                <div
                  key={lp.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{lp.title}</p>
                    <span className="text-[10px] text-slate-400">
                      Level: {lp.level} • {lp.estimatedTime}
                    </span>
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Assigned
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
