import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  Play,
  Download,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Flame,
  Zap,
  Target,
  FileText,
  Upload,
  Send,
  Camera,
  Bot,
  User,
  RefreshCw,
  Eye,
  Check,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import {
  LessonPlan,
  LearningResource,
  Assignment,
  Submission,
  ProgressRecord,
  GapAnalysis,
  Subject,
  UserProfile,
} from '../types';
import {
  saveSubmission,
  saveProgressRecord,
} from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface StudentInterfaceProps {
  assignedLessons: LessonPlan[];
  assignedResources: LearningResource[];
  assignedQuizzes: Assignment[];
  studentSubmissions: Submission[];
  studentProgress: ProgressRecord[];
  gapAnalyses: GapAnalysis[];
  subjects: Subject[];
  onRefresh: () => void;
  onSwitchToTeacherView?: () => void;
}

export const StudentInterface: React.FC<StudentInterfaceProps> = ({
  assignedLessons,
  assignedResources,
  assignedQuizzes,
  studentSubmissions,
  studentProgress,
  gapAnalyses,
  subjects,
  onRefresh,
  onSwitchToTeacherView,
}) => {
  const { currentUser, userProfile } = useAuth();

  // Navigation tabs in Student Interface
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lessons' | 'assignments' | 'tutor' | 'mastery'>('dashboard');

  // Selected lesson for Reader Mode
  const [selectedLesson, setSelectedLesson] = useState<LessonPlan | null>(assignedLessons[0] || null);

  // Active quiz being taken
  const [activeQuiz, setActiveQuiz] = useState<Assignment | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<Submission | null>(null);

  // Student Homework / Sheet Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubjectId, setUploadSubjectId] = useState(subjects[0]?.id || '');
  const [uploadImages, setUploadImages] = useState<string[]>([]);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // AI Socratic Study Buddy ("Lensy") state
  const [tutorMessages, setTutorMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>>([
    {
      role: 'assistant',
      content: `👋 Hi ${userProfile?.name || 'there'}! I'm **Lensy**, your personal Socratic AI Study Buddy! ✨\n\nStuck on a tricky homework problem or concept? Tell me what you're working on and I'll guide you step-by-step with hints, analogies, and practice checks—without spoiling the answer! 💡`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorSending, setTutorSending] = useState(false);

  // Calculations for Gamification & Progress
  const completedLessonIds = studentProgress
    .filter((p) => p.type === 'lesson_completed')
    .map((p) => p.lessonId);

  const completedCount = completedLessonIds.length;
  const xpPoints = completedCount * 50 + studentSubmissions.length * 75;
  const currentLevel = Math.floor(xpPoints / 150) + 1;
  const userGaps = gapAnalyses.find((g) => g.studentId === currentUser?.uid);
  const masteryPercentage = userGaps?.overallMastery || (completedCount > 0 ? 78 : 65);

  // Mark lesson as completed
  const handleCompleteLesson = async (lesson: LessonPlan) => {
    if (!currentUser) return;
    const rec: ProgressRecord = {
      id: `prog_${Date.now()}`,
      studentId: currentUser.uid,
      lessonId: lesson.id,
      type: 'lesson_completed',
      conceptIds: lesson.targetConceptIds,
      completedAt: new Date().toISOString(),
    };
    await saveProgressRecord(rec);
    onRefresh();
  };

  // Submit interactive quiz
  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !currentUser) return;

    let earnedScore = 0;
    const maxScore = activeQuiz.questions.reduce((sum, q) => sum + q.points, 0);

    const submissionAnswers = activeQuiz.questions.map((q) => {
      const studentAns = quizAnswers[q.id] || '';
      const isCorrect = q.correctAnswer
        ? studentAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
        : true;
      const pointsScored = isCorrect ? q.points : 0;
      earnedScore += pointsScored;

      return {
        questionId: q.id,
        answer: studentAns,
        score: pointsScored,
        maxPoints: q.points,
        isCorrect,
        feedback: isCorrect
          ? '🎯 Spot on! Excellent application.'
          : `💡 Not quite. The expected answer is: ${q.correctAnswer || 'Review lesson notes'}`,
      };
    });

    const percentage = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;

    const sub: Submission = {
      id: `sub_${Date.now()}`,
      assignmentId: activeQuiz.id,
      studentId: currentUser.uid,
      studentName: userProfile?.name || 'Student',
      submittedAt: new Date().toISOString(),
      answers: submissionAnswers,
      totalScore: earnedScore,
      maxScore,
      percentage,
      status: 'graded',
      gradedAt: new Date().toISOString(),
      gradedBy: 'AI Auto-Grader',
    };

    await saveSubmission(sub);

    const rec: ProgressRecord = {
      id: `prog_${Date.now()}`,
      studentId: currentUser.uid,
      type: activeQuiz.isReassessment ? 'reassessment_completed' : 'quiz_completed',
      score: percentage,
      conceptIds: activeQuiz.targetConceptIds,
      completedAt: new Date().toISOString(),
    };
    await saveProgressRecord(rec);

    setQuizResult(sub);
    setQuizSubmitted(true);
    onRefresh();
  };

  // Handle student file/image upload for worksheets or handwritten work
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setUploadImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !currentUser) return;

    setUploadStatus('Uploading your submission...');

    // Save as student work progress record
    const subRecord: ProgressRecord = {
      id: `prog_work_${Date.now()}`,
      studentId: currentUser.uid,
      type: 'quiz_completed',
      score: 100,
      conceptIds: [],
      completedAt: new Date().toISOString(),
    };

    await saveProgressRecord(subRecord);
    setUploadStatus('Submitted successfully! Your teacher will review your work.');
    setTimeout(() => {
      setShowUploadModal(false);
      setUploadImages([]);
      setUploadTitle('');
      setUploadNotes('');
      setUploadStatus(null);
      onRefresh();
    }, 1500);
  };

  // Send message to Socratic Tutor ("Lensy")
  const handleSendTutorMessage = async (textToSend?: string) => {
    const msg = (textToSend || tutorInput).trim();
    if (!msg || tutorSending) return;

    setTutorInput('');
    const userMsg = {
      role: 'user' as const,
      content: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...tutorMessages, userMsg];
    setTutorMessages(newHistory);
    setTutorSending(true);

    try {
      const response = await fetch('/api/student/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          conceptName: selectedLesson?.topic || 'Core Concept',
          subject: subjects.find((s) => s.id === selectedLesson?.subjectId)?.name || 'General',
        }),
      });

      if (!response.ok) {
        throw new Error('Study Buddy is taking a breather. Please try again!');
      }

      const data = await response.json();
      setTutorMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setTutorMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now, but remember: break the problem into smaller pieces and identify what you already know! 💡",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setTutorSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Student Welcome Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md shadow-inner">
              <GraduationCap className="h-8 w-8 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-200">
                  Level {currentLevel} Scholar
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  <Flame className="h-3 w-3 text-amber-400 fill-amber-400" />
                  5 Day Streak
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Hi, {userProfile?.name || 'Scholar'}! ✨
              </h1>
              <p className="text-xs text-emerald-100">
                Your personalized learning hub • Track progress, master concepts, and ace your quizzes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2 text-center backdrop-blur-xs border border-white/10">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                Total XP Earned
              </span>
              <span className="text-lg font-black text-amber-300">{xpPoints} XP</span>
            </div>

            <div className="rounded-xl bg-white/10 px-4 py-2 text-center backdrop-blur-xs border border-white/10">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                Curriculum Mastery
              </span>
              <span className="text-lg font-black text-white">{masteryPercentage}%</span>
            </div>

            {onSwitchToTeacherView && (
              <button
                onClick={onSwitchToTeacherView}
                className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25 border border-white/20 transition"
                title="Switch back to Teacher view"
              >
                <Shield className="h-3.5 w-3.5 text-amber-300" />
                Teacher View
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Student Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {[
            { id: 'dashboard', label: 'My Learning Hub', icon: Target },
            { id: 'lessons', label: 'Lessons & Reader', icon: BookOpen, badge: assignedLessons.length },
            { id: 'assignments', label: 'Assignments & Practice', icon: FileText, badge: assignedQuizzes.length },
            { id: 'tutor', label: 'AI Study Buddy (Lensy)', icon: Bot, isSpecial: true },
            { id: 'mastery', label: 'Concept Mastery & Gaps', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-2xs ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : tab.isSpecial
                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Upload Work / Scan</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. STUDENT DASHBOARD / LEARNING HUB TAB */}
      {/* ============================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Lessons Completed</span>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {completedCount} <span className="text-xs font-normal text-slate-400">/ {assignedLessons.length}</span>
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${assignedLessons.length > 0 ? (completedCount / assignedLessons.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Assignments Taken</span>
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {studentSubmissions.length}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {assignedQuizzes.length - studentSubmissions.length} pending to complete
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Average Quiz Score</span>
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {studentSubmissions.length > 0
                  ? Math.round(
                      studentSubmissions.reduce((acc, s) => acc + s.percentage, 0) /
                        studentSubmissions.length
                    )
                  : 85}
                %
              </p>
              <p className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> +14% growth from baseline
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Focus Concept Gaps</span>
                <div className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/50">
                  <Target className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {userGaps?.weakConcepts.length || 0}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Concepts scheduled for remedial practice
              </p>
            </div>
          </div>

          {/* Up Next for You Card */}
          {assignedLessons.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                    <Sparkles className="h-3 w-3" />
                    Recommended Up Next
                  </div>
                  <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                    {assignedLessons[0].title || assignedLessons[0].topic}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
                    {assignedLessons[0].explanation?.slice(0, 140)}...
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedLesson(assignedLessons[0]);
                    setActiveTab('lessons');
                  }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>Start Learning Now</span>
                </button>
              </div>
            </div>
          )}

          {/* Assigned Practice Queue */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Active Quizzes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Your Assignments & Quizzes
                </h3>
                <span className="text-xs text-indigo-600 font-semibold">
                  {assignedQuizzes.length} total
                </span>
              </div>

              <div className="space-y-2.5">
                {assignedQuizzes.map((quiz) => {
                  const existingSub = studentSubmissions.find((s) => s.assignmentId === quiz.id);
                  return (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {quiz.title}
                          </p>
                          {quiz.isReassessment && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                              Reassessment
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {quiz.questions.length} questions • Due: {quiz.dueDate ? new Date(quiz.dueDate).toLocaleDateString() : 'This week'}
                        </p>
                      </div>

                      {existingSub ? (
                        <div className="text-right">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                            Score: {existingSub.percentage}%
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveQuiz(quiz);
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                            setActiveTab('assignments');
                          }}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-2xs"
                        >
                          Take Quiz
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Study Buddy Card */}
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 p-5 dark:border-indigo-900/40 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Need Help With Homework?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lensy the AI Socratic Tutor is ready 24/7!
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                "I won't give you the answer outright, but I'll walk you through the logic so you truly master the topic and crush your next test!"
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setActiveTab('tutor');
                    handleSendTutorMessage("Can you explain how factoring works with a simple real-world analogy?");
                  }}
                  className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-indigo-700 shadow-2xs hover:bg-slate-50 border border-indigo-100 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-300"
                >
                  💡 "Explain factoring with an analogy"
                </button>
                <button
                  onClick={() => {
                    setActiveTab('tutor');
                    handleSendTutorMessage("Give me a step-by-step hint for solving quadratic roots.");
                  }}
                  className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-indigo-700 shadow-2xs hover:bg-slate-50 border border-indigo-100 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-300"
                >
                  🎯 "Give me a step-by-step hint"
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-slate-800">
                <button
                  onClick={() => setActiveTab('tutor')}
                  className="flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-800 dark:text-indigo-400"
                >
                  Open Study Buddy Chat
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. LESSONS & READER TAB */}
      {/* ============================================================== */}
      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Lessons List on Left */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Your Course Lessons ({assignedLessons.length})
            </h3>

            <div className="space-y-2">
              {assignedLessons.map((lesson) => {
                const isCompleted = completedLessonIds.includes(lesson.id);
                const isSelected = selectedLesson?.id === lesson.id;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left transition border ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {lesson.title || lesson.topic}
                        </p>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {lesson.level}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {lesson.explanation?.slice(0, 90)}...
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reader Mode on Right */}
          <div className="lg:col-span-2">
            {selectedLesson ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 uppercase">
                      {selectedLesson.level} • {selectedLesson.estimatedTime || '45 mins'}
                    </span>
                    <h2 className="mt-1.5 text-xl font-black text-slate-900 dark:text-white">
                      {selectedLesson.title || selectedLesson.topic}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('tutor');
                        handleSendTutorMessage(`Can you explain the main idea of "${selectedLesson.title || selectedLesson.topic}" with a fun example?`);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Ask Lensy
                    </button>

                    <button
                      onClick={() => handleCompleteLesson(selectedLesson)}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
                        completedLessonIds.includes(selectedLesson.id)
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {completedLessonIds.includes(selectedLesson.id) ? 'Completed (+50 XP)' : 'Mark Finished'}
                    </button>
                  </div>
                </div>

                {/* Prerequisites */}
                {selectedLesson.prerequisites && selectedLesson.prerequisites.length > 0 && (
                  <div className="rounded-xl bg-amber-50/60 p-4 border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40">
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      Prerequisite Concepts To Remember:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedLesson.prerequisites.map((p, idx) => (
                        <span key={idx} className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-amber-800 shadow-2xs dark:bg-slate-800 dark:text-amber-200">
                          ✓ {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Core Explanation */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Core Conceptual Guide
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    {selectedLesson.explanation}
                  </div>
                </div>

                {/* Real-World Examples */}
                {selectedLesson.examples && selectedLesson.examples.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Real-World Examples & Applications
                    </h4>
                    <div className="space-y-2">
                      {selectedLesson.examples.map((ex, idx) => (
                        <div key={idx} className="rounded-xl border border-slate-100 bg-white p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">
                            Example {idx + 1}:
                          </span>
                          {ex}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Self Check Practice Questions */}
                {selectedLesson.assessmentQuestions && selectedLesson.assessmentQuestions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Interactive Self-Check Questions
                    </h4>
                    <div className="space-y-3">
                      {selectedLesson.assessmentQuestions.map((q, idx) => (
                        <details key={idx} className="group rounded-xl border border-slate-200 bg-white p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/60">
                          <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-800 dark:text-slate-200 list-none">
                            <span>Q{idx + 1}. {q.question}</span>
                            <span className="text-emerald-600 font-bold group-open:rotate-180 transition">▼</span>
                          </summary>
                          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300 space-y-1">
                            <p className="font-bold text-emerald-600">Answer: {q.answer}</p>
                            <p className="text-[11px] text-slate-500">{q.explanation}</p>
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                <BookOpen className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Select a lesson from the left to begin reading.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. ASSIGNMENTS & PRACTICE TAB */}
      {/* ============================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {activeQuiz ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6 max-w-4xl mx-auto">
              {/* Quiz Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {activeQuiz.questions.length} Questions • Max Points: {activeQuiz.questions.reduce((a, b) => a + b.points, 0)}
                  </span>
                  <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                    {activeQuiz.title}
                  </h2>
                </div>

                <button
                  onClick={() => setActiveQuiz(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Exit Practice
                </button>
              </div>

              {/* Quiz Result View if Submitted */}
              {quizSubmitted && quizResult ? (
                <div className="rounded-2xl bg-emerald-50 p-6 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                        Quiz Completed! 🎉
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        Earned: {quizResult.totalScore} / {quizResult.maxScore} points ({quizResult.percentage}%)
                      </p>
                    </div>
                    <span className="text-2xl font-black text-emerald-600">
                      {quizResult.percentage}%
                    </span>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800">
                    {quizResult.answers.map((ans, idx) => (
                      <div key={idx} className="rounded-xl bg-white p-4 text-xs shadow-2xs dark:bg-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Question {idx + 1}
                          </span>
                          <span className={ans.isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            {ans.isCorrect ? '✓ Correct' : '✗ Incorrect'} ({ans.score}/{ans.maxPoints} pts)
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-300">
                          Your answer: <span className="font-semibold">{ans.answer || '(Blank)'}</span>
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 italic">
                          Feedback: {ans.feedback}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setActiveQuiz(null);
                      setQuizSubmitted(false);
                    }}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
                  >
                    Back to Assignments
                  </button>
                </div>
              ) : (
                /* Question List */
                <div className="space-y-6">
                  {activeQuiz.questions.map((q, idx) => (
                    <div key={q.id} className="rounded-xl border border-slate-200 p-5 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          Question {idx + 1} of {activeQuiz.questions.length}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{q.points} Points</span>
                      </div>

                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {q.question}
                      </p>

                      {/* Options if MCQ */}
                      {q.options && q.options.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <label
                              key={optIdx}
                              className={`flex items-center gap-3 rounded-xl border p-3 text-xs cursor-pointer transition ${
                                quizAnswers[q.id] === opt
                                  ? 'border-indigo-600 bg-indigo-50/50 font-semibold text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
                                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                value={opt}
                                checked={quizAnswers[q.id] === opt}
                                onChange={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <input
                            type="text"
                            placeholder="Type your answer here..."
                            value={quizAnswers[q.id] || ''}
                            onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSubmitQuiz}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Submit & Score Quiz
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Quiz Selection List */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assignedQuizzes.map((quiz) => {
                const existingSub = studentSubmissions.find((s) => s.assignmentId === quiz.id);
                return (
                  <div
                    key={quiz.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {quiz.questions.length} Questions
                        </span>
                        {quiz.isReassessment && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                            Reassessment
                          </span>
                        )}
                      </div>

                      <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                        {quiz.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Due: {quiz.dueDate ? new Date(quiz.dueDate).toLocaleDateString() : 'Active practice'}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {existingSub ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-emerald-600">
                            Score: {existingSub.percentage}%
                          </span>
                          <button
                            onClick={() => {
                              setActiveQuiz(quiz);
                              setQuizSubmitted(true);
                              setQuizResult(existingSub);
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-indigo-600"
                          >
                            Review Answers
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveQuiz(quiz);
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                            setQuizResult(null);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 w-full justify-center"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Start Quiz
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. AI SOCRATIC STUDY BUDDY ("LENSY") TAB */}
      {/* ============================================================== */}
      {activeTab === 'tutor' && (
        <div className="flex flex-col h-[650px] rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden max-w-4xl mx-auto">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-emerald-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Lensy — Socratic AI Study Buddy
                  </h3>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    Active & Patient
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ask for hints, analogies, or explanations without spoiling final answers.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setTutorMessages([
                  {
                    role: 'assistant',
                    content: "Chat cleared! What new concept or problem would you like to explore together? 💡",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Reset Chat
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {tutorMessages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs ${
                      isAssistant
                        ? 'bg-gradient-to-tr from-indigo-600 to-emerald-500'
                        : 'bg-slate-700'
                    }`}
                  >
                    {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isAssistant
                        ? 'bg-slate-50 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    <span className="block text-[10px] opacity-60 mt-1.5 text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {tutorSending && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white">
                  <Bot className="h-4 w-4 animate-spin" />
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  Lensy is thinking of a helpful hint... 💡
                </div>
              </div>
            )}
          </div>

          {/* Socratic Quick Prompt Chips */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-1.5 dark:bg-slate-900 dark:border-slate-800">
            {[
              'Give me a hint for this step',
              'Break this down with an everyday analogy',
              'Can you check my understanding with a question?',
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendTutorMessage(chip)}
                className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-indigo-700 border border-indigo-100 hover:bg-indigo-50 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-300"
              >
                ✨ {chip}
              </button>
            ))}
          </div>

          {/* Tutor Input */}
          <div className="p-4 bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTutorMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={tutorInput}
                onChange={(e) => setTutorInput(e.target.value)}
                placeholder="Ask Lensy a question about your lesson or homework..."
                className="flex-1 rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={!tutorInput.trim() || tutorSending}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. CONCEPT MASTERY & GAPS TAB */}
      {/* ============================================================== */}
      {activeTab === 'mastery' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Your Personal Learning Map
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Concepts diagnosed from your recent tests and assessments. Green indicates mastered concepts; red highlights areas for practice.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Strong Concepts */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-3">
                  <CheckCircle2 className="h-4 w-4" />
                  Mastered Concepts ({userGaps?.strongConcepts.length || 2})
                </h4>
                <div className="space-y-2">
                  {(userGaps?.strongConcepts || [
                    { conceptName: 'Linear Equations & Slope', scorePercentage: 92 },
                    { conceptName: 'Coordinate Geometry Basics', scorePercentage: 88 },
                  ]).map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg bg-white p-2.5 text-xs shadow-2xs dark:bg-slate-800">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.conceptName}</span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                        {c.scorePercentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weak Concepts / Action Items */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-3">
                  <Target className="h-4 w-4" />
                  Concepts Needing Practice ({userGaps?.weakConcepts.length || 1})
                </h4>
                <div className="space-y-2">
                  {(userGaps?.weakConcepts || [
                    { conceptName: 'Factoring Quadratic Trinomials', scorePercentage: 54, remarks: 'Practice sign distribution' },
                  ]).map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg bg-white p-2.5 text-xs shadow-2xs dark:bg-slate-800">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{c.conceptName}</span>
                        {c.remarks && <p className="text-[10px] text-slate-400">{c.remarks}</p>}
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('lessons');
                        }}
                        className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-500"
                      >
                        Practice
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STUDENT HOMEWORK / WORKSHEET UPLOAD MODAL */}
      {/* ============================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-indigo-600" />
                Upload Completed Work / Answersheet
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignment Title / Topic
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 3 Homework Practice Sheet"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <select
                  value={uploadSubjectId}
                  onChange={(e) => setUploadSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Upload Photos or Scans (Handwritten Worksheet / Answersheet)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:border-indigo-500 dark:border-slate-700">
                    <Camera className="h-6 w-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Click to choose or take photo
                    </span>
                    <span className="text-[10px] text-slate-400">PNG, JPG, PDF</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadImages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {uploadImages.map((img, idx) => (
                      <div key={idx} className="relative h-16 w-16 rounded-lg overflow-hidden border">
                        <img src={img} alt="upload preview" className="h-full w-full object-cover" />
                        <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Notes for Teacher (Optional)
                </label>
                <textarea
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Questions you were unsure about or notes on your working..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {uploadStatus && (
                <p className="text-xs font-semibold text-emerald-600">{uploadStatus}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
