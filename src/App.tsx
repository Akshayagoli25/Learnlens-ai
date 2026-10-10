import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ConceptMap } from './components/ConceptMap';
import { AssessmentList } from './components/AssessmentList';
import { GapAnalysisView } from './components/GapAnalysisView';
import { LessonPlanGenerator } from './components/LessonPlanGenerator';
import { ResourceHub } from './components/ResourceHub';
import { StudentPortal } from './components/StudentPortal';
import { TeacherCopilot } from './components/TeacherCopilot';
import { StudentInterface } from './components/StudentInterface';
import { ReassessmentView } from './components/ReassessmentView';
import { AnalyticsView } from './components/AnalyticsView';
import { AdminUserManagement } from './components/AdminUserManagement';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import {
  Subject,
  Concept,
  SchoolClass,
  Assessment,
  MarkRecord,
  LessonPlan,
  LearningResource,
  Assignment,
  Submission,
  ProgressRecord,
  GapAnalysis,
  UserProfile,
} from './types';
import {
  getSubjects,
  getConcepts,
  getClasses,
  getAssessments,
  getAllMarks,
  getLessonPlans,
  getResources,
  getAssignments,
  getAllUsers,
  getStudentGapAnalyses,
  getSubmissionsByStudent,
  getStudentProgress,
  seedInitialCurriculumIfEmpty,
} from './services/dataService';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  ScanLine,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, loading, activeRole, setActiveRole, loginWithGoogle } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [gapAnalyses, setGapAnalyses] = useState<GapAnalysis[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);

  // Inter-tab pass-through states
  const [lessonGapsPrefill, setLessonGapsPrefill] = useState<any | null>(null);
  const [resourceLessonPrefill, setResourceLessonPrefill] = useState<LessonPlan | null>(null);

  // Load all data
  const loadData = async () => {
    try {
      const [
        subs,
        conc,
        cls,
        asmts,
        mrks,
        lps,
        res,
        asgs,
        allUsers,
      ] = await Promise.all([
        getSubjects(),
        getConcepts(),
        getClasses(),
        getAssessments(),
        getAllMarks(),
        getLessonPlans(),
        getResources(),
        getAssignments(),
        getAllUsers(),
      ]);

      setSubjects(subs);
      setConcepts(conc);
      setClasses(cls);
      setAssessments(asmts);
      setMarks(mrks);
      setLessonPlans(lps);
      setResources(res);
      setAssignments(asgs);
      setStudents(allUsers);

      if (currentUser) {
        const [gaps, subsList, progs] = await Promise.all([
          getStudentGapAnalyses(currentUser.uid),
          getSubmissionsByStudent(currentUser.uid),
          getStudentProgress(currentUser.uid),
        ]);
        setGapAnalyses(gaps);
        setSubmissions(subsList);
        setProgressRecords(progs);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      // Auto seed initial subject/concepts if database is empty on first user login
      seedInitialCurriculumIfEmpty(currentUser.uid).then(() => {
        loadData();
      });
    }
  }, [currentUser]);

  // Loading spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Initializing LearnLens AI...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show educational landing page with Sign In / Sign Up
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-white selection:bg-indigo-500 selection:text-white">
        {/* Top Navbar */}
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/25">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">LearnLens</span>
              <span className="ml-1 rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-xs font-bold text-indigo-400">
                AI
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loginWithGoogle('teacher')}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.16z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.32 7.34 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.26C.46 8.21 0 10.05 0 12s.46 3.79 1.26 5.4l4.02-3.13z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.68 1.26 6.6l4.02 3.13c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Sign In with Google</span>
            </button>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500"
            >
              Email Sign In
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="mx-auto max-w-7xl px-6 pt-12 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Next-Generation Adaptive Learning Engine Powered by Gemini 3.8 Flash
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
            Precision Education From <br />
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Assessment Scan to Lesson Plan
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            LearnLens AI bridges assessment grading and personalized instruction. Scan physical student test sheets with your camera, extract concept marks with vision AI, diagnose learning gaps, and auto-generate tailored PowerPoint slide presentations and interactive quizzes.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => loginWithGoogle('teacher')}
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-xl hover:bg-slate-100"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.16z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.32 7.34 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.26C.46 8.21 0 10.05 0 12s.46 3.79 1.26 5.4l4.02-3.13z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.68 1.26 6.6l4.02 3.13c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continue with Google</span>
            </button>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500"
            >
              Sign In with Email
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-16 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                <ScanLine className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Camera & OCR Scanning</h3>
              <p className="mt-2 text-xs text-slate-400">
                Capture student worksheets directly from your webcam or phone camera. Gemini extracts scores and remarks with zero guesswork.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Interactive Concept Map</h3>
              <p className="mt-2 text-xs text-slate-400">
                Color-coded prerequisite network showing mastered foundations and specific student misconceptions.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">AI Lesson Plans & Slides</h3>
              <p className="mt-2 text-xs text-slate-400">
                Generate differentiated lesson roadmaps and real, downloadable Microsoft PowerPoint (.pptx) slide files.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Reassessment Growth</h3>
              <p className="mt-2 text-xs text-slate-400">
                Automated quiz grading and delta comparisons prove mastery improvement after remedial practice.
              </p>
            </div>
          </div>
        </main>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    );
  }

  // Logged-in App Layout
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100">
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenProfile={() => setProfileModalOpen(true)}
        currentTab={currentTab}
        onOpenCopilot={() => setCurrentTab('teacher-copilot')}
      />

      {/* Main Container with Sidebar + Content */}
      <div className="flex flex-1">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSeedData={() => {
            if (currentUser) {
              seedInitialCurriculumIfEmpty(currentUser.uid).then(() => {
                loadData();
                alert('Curriculum seeded with demo subjects, concepts, and classes!');
              });
            }
          }}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* If student role is active on dashboard, render dedicated StudentInterface */}
          {currentTab === 'dashboard' && activeRole === 'student' && (
            <StudentInterface
              assignedLessons={lessonPlans}
              assignedResources={resources}
              assignedQuizzes={assignments}
              studentSubmissions={submissions}
              studentProgress={progressRecords}
              gapAnalyses={gapAnalyses}
              subjects={subjects}
              onRefresh={loadData}
              onSwitchToTeacherView={() => {
                setActiveRole('teacher');
                setCurrentTab('dashboard');
              }}
            />
          )}

          {/* Teacher / Admin Dashboard */}
          {currentTab === 'dashboard' && activeRole !== 'student' && (
            <DashboardView
              assessments={assessments}
              marks={marks}
              lessonPlans={lessonPlans}
              resources={resources}
              assignments={assignments}
              gapAnalyses={gapAnalyses}
              students={students}
              subjects={subjects}
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}

          {/* Teacher Copilot (AI Instructional Assistant) */}
          {currentTab === 'teacher-copilot' && (
            <TeacherCopilot
              subjects={subjects}
              concepts={concepts}
              classes={classes}
              students={students}
              onNavigateToLessonPlan={(prefill) => {
                setLessonGapsPrefill({
                  subject: prefill.subject,
                  weakConcepts: [prefill.topic],
                  student: userProfile as UserProfile,
                });
                setCurrentTab('lesson-plans');
              }}
            />
          )}

          {currentTab === 'assessments' && (
            <AssessmentList
              assessments={assessments}
              classes={classes}
              subjects={subjects}
              concepts={concepts}
              students={students}
              onRefresh={loadData}
              onNavigateToGaps={() => setCurrentTab('gap-analysis')}
            />
          )}

          {currentTab === 'concept-map' && (
            <ConceptMap
              concepts={concepts}
              subjects={subjects}
              gapAnalyses={gapAnalyses}
              onSelectConceptForLesson={(concept) => {
                const sub = subjects.find((s) => s.id === concept.subjectId) || subjects[0];
                setLessonGapsPrefill({
                  subject: sub,
                  weakConcepts: [concept.name],
                  student: userProfile as UserProfile,
                });
                setCurrentTab('lesson-plans');
              }}
              onRefresh={loadData}
            />
          )}

          {currentTab === 'gap-analysis' && (
            <GapAnalysisView
              students={students}
              subjects={subjects}
              concepts={concepts}
              onGenerateLessonForGaps={(sub, gaps, st) => {
                setLessonGapsPrefill({ subject: sub, weakConcepts: gaps, student: st });
                setCurrentTab('lesson-plans');
              }}
            />
          )}

          {currentTab === 'lesson-plans' && (
            <LessonPlanGenerator
              subjects={subjects}
              concepts={concepts}
              students={students}
              classes={classes}
              lessonPlans={lessonPlans}
              initialGaps={lessonGapsPrefill}
              onRefresh={loadData}
              onNavigateToResources={(lesson) => {
                setResourceLessonPrefill(lesson);
                setCurrentTab('resources');
              }}
            />
          )}

          {currentTab === 'resources' && (
            <ResourceHub
              resources={resources}
              lessonPlans={lessonPlans}
              subjects={subjects}
              students={students}
              initialLesson={resourceLessonPrefill}
              onRefresh={loadData}
            />
          )}

          {currentTab === 'student-portal' && (
            <StudentInterface
              assignedLessons={lessonPlans}
              assignedResources={resources}
              assignedQuizzes={assignments}
              studentSubmissions={submissions}
              studentProgress={progressRecords}
              gapAnalyses={gapAnalyses}
              subjects={subjects}
              onRefresh={loadData}
              onSwitchToTeacherView={() => {
                setActiveRole('teacher');
                setCurrentTab('dashboard');
              }}
            />
          )}

          {currentTab === 'reassessment' && (
            <ReassessmentView
              assignments={assignments}
              submissions={submissions}
              assessments={assessments}
              marks={marks}
              students={students}
              subjects={subjects}
              onRefresh={loadData}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView
              assessments={assessments}
              marks={marks}
              classes={classes}
              subjects={subjects}
              students={students}
              gapAnalyses={gapAnalyses}
              submissions={submissions}
            />
          )}

          {currentTab === 'admin-users' && activeRole === 'admin' && (
            <AdminUserManagement />
          )}
        </main>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
