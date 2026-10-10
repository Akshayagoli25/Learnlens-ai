import React, { useState } from 'react';
import {
  BookOpenCheck,
  Sparkles,
  Plus,
  Send,
  Clock,
  Target,
  FileText,
  HelpCircle,
  Users,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Bookmark,
  Layers,
  Edit3,
  Trash2,
  Check,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { LessonPlan, Subject, Concept, UserProfile, SchoolClass } from '../types';
import { saveLessonPlan } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface LessonPlanGeneratorProps {
  subjects: Subject[];
  concepts: Concept[];
  students: UserProfile[];
  classes: SchoolClass[];
  lessonPlans: LessonPlan[];
  initialGaps?: { subject: Subject; weakConcepts: string[]; student: UserProfile } | null;
  onRefresh: () => void;
  onNavigateToResources?: (lesson: LessonPlan) => void;
}

interface FormativeQuestionDraft {
  question: string;
  answer: string;
  explanation: string;
}

interface LessonPlanDraft {
  title: string;
  overview: string;
  estimatedTime: string;
  learningObjectives: string[];
  prerequisiteConcepts: string[];
  explanation: string;
  realWorldExamples: string[];
  activities: string[];
  practiceQuestions: FormativeQuestionDraft[];
  teacherNotes?: string;
}

export const LessonPlanGenerator: React.FC<LessonPlanGeneratorProps> = ({
  subjects,
  concepts,
  students,
  classes,
  lessonPlans,
  initialGaps,
  onRefresh,
  onNavigateToResources,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();

  // All 6 required criteria preserved in state:
  // 1. subjectId, 2. topic, 3. student level, 4. learning goals, 5. learning pace, 6. duration
  const [subjectId, setSubjectId] = useState<string>(
    initialGaps?.subject.id || subjects[0]?.id || ''
  );
  const [topic, setTopic] = useState<string>(
    initialGaps?.weakConcepts?.[0] || 'Quadratic Equations & Roots'
  );
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [duration, setDuration] = useState<string>('45 minutes');
  const [pace, setPace] = useState<'gentle' | 'standard' | 'accelerated'>('standard');
  const [learningGoals, setLearningGoals] = useState<string>(
    'Master key definitions, resolve common algebraic misconceptions, and build step-by-step problem intuition.'
  );

  // Student and gap target context
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialGaps?.student.id || students[0]?.id || ''
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [learningGapsInput, setLearningGapsInput] = useState<string>(
    initialGaps?.weakConcepts?.join(', ') || 'Factoring negative coefficients, using quadratic formula'
  );

  // Generation & error states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; isHighDemand: boolean } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active Lesson Plan (AI generated or manually drafted)
  const [activePlan, setActivePlan] = useState<LessonPlanDraft | null>(null);
  const [modelUsedInfo, setModelUsedInfo] = useState<string | null>(null);

  // Manual Editor Mode
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [isEditingDraft, setIsEditingDraft] = useState<boolean>(false);

  const activeSubject = subjects.find((s) => s.id === subjectId) || subjects[0];
  const activeStudent = students.find((s) => s.id === selectedStudentId);

  /**
   * Helper to initialize a clean draft template for Manual Plan Builder
   */
  const initializeBlankTemplate = () => {
    setActivePlan({
      title: `${topic || 'New Lesson'} - Comprehensive Mastery Plan`,
      overview: `A structured ${duration} lesson plan focused on ${topic || 'core concepts'} for ${difficultyLevel} level students.`,
      estimatedTime: duration,
      learningObjectives: [
        `Understand the foundational definition and principles of ${topic || 'this topic'}.`,
        'Apply step-by-step methods to solve foundational and intermediate problems.',
        'Diagnose and correct common misconceptions encountered in practice.',
      ],
      prerequisiteConcepts: [
        activeSubject?.name ? `Prior ${activeSubject.name} prerequisites` : 'Foundational arithmetic and definitions',
      ],
      explanation: `Step 1: Conceptual Introduction\nExplain the core intuition behind ${topic}.\n\nStep 2: Guided Methodology\nWalk through the problem-solving steps systematically.\n\nStep 3: Common Pitfalls\nHighlight what students typically miss.`,
      realWorldExamples: [
        'Real-world application 1: How this concept appears in daily life and technology.',
        'Real-world application 2: Industry or scientific use case.',
      ],
      activities: [
        'Think-Pair-Share: Students diagnose a sample problem together.',
        'Guided Practice: Small group problem sets with immediate feedback.',
      ],
      practiceQuestions: [
        {
          question: `Sample Question 1: What is the primary rule when analyzing ${topic}?`,
          answer: 'The primary rule is following the step-by-step structured order.',
          explanation: 'Careful step-by-step execution avoids sign and calculation errors.',
        },
        {
          question: 'Sample Question 2: Solve a standard problem using the learned method.',
          answer: 'Solution derived correctly.',
          explanation: 'Shows complete working and justification of every step.',
        },
      ],
      teacherNotes: 'Observe student confidence during the practice questions. Provide differentiated support for learners requiring extra scaffolding.',
    });
    setIsEditingDraft(true);
    setManualMode(true);
    setErrorInfo(null);
  };

  /**
   * Generate Lesson Plan via Server-Side Gemini API
   */
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!subjectId || !topic) return;

    setIsGenerating(true);
    setErrorInfo(null);
    setSaveSuccessMsg(null);

    try {
      const gapsArray = learningGapsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        subject: activeSubject?.name || 'Mathematics',
        topic,
        level: difficultyLevel,
        duration,
        learningGaps: gapsArray,
        studentName: activeStudent?.name || 'Student Cohort',
        pace,
        learningGoals: learningGoals || `Overcome conceptual gaps in ${topic} and build step-by-step problem intuition.`,
      };

      const res = await fetch('/api/lessons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let responseJson: any = null;
      try {
        responseJson = await res.json();
      } catch {
        throw new Error('Unable to parse server response. Please verify connection and retry.');
      }

      if (!res.ok) {
        let errMessage = responseJson?.error || 'Failed to generate lesson plan.';
        // If the error message was raw stringified JSON, parse it
        if (typeof errMessage === 'string' && errMessage.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(errMessage.trim());
            if (parsed?.error?.message) {
              errMessage = parsed.error.message;
            }
          } catch {
            // Keep original
          }
        }

        const is503OrOverloaded =
          res.status === 503 ||
          responseJson?.isOverloaded ||
          errMessage.includes('503') ||
          errMessage.includes('high demand') ||
          errMessage.includes('UNAVAILABLE') ||
          errMessage.includes('RESOURCE_EXHAUSTED');

        setErrorInfo({
          message: is503OrOverloaded
            ? 'The AI model is currently experiencing high demand. Spikes in demand are usually temporary. Please click "Retry Generation" or switch to the Manual Plan Builder.'
            : errMessage,
          isHighDemand: is503OrOverloaded,
        });
        return;
      }

      setActivePlan(responseJson.data);
      setModelUsedInfo(responseJson.modelUsed || 'Gemini');
      setManualMode(false);
      setIsEditingDraft(false);
    } catch (err: any) {
      console.error('Lesson plan generation error:', err);
      const raw = err?.message || String(err);
      let cleanMsg = raw;
      if (typeof raw === 'string' && raw.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(raw.trim());
          if (parsed?.error?.message) cleanMsg = parsed.error.message;
        } catch {}
      }
      const isTransient = cleanMsg.includes('503') || cleanMsg.includes('high demand') || cleanMsg.includes('UNAVAILABLE');
      setErrorInfo({
        message: isTransient
          ? 'The AI model is currently experiencing high demand. Spikes in demand are usually temporary. Please click "Retry Generation" or switch to the Manual Plan Builder.'
          : cleanMsg || 'Error communicating with AI service.',
        isHighDemand: isTransient,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Save Plan to Cloud Firestore
   */
  const handleSaveToFirestore = async (assignToStudent = false) => {
    if (!activePlan) return;

    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const newLesson: LessonPlan = {
        id: `lesson_${Date.now()}`,
        title: activePlan.title || `${topic} Mastery Plan`,
        subjectId,
        topic,
        studentId: assignToStudent && selectedStudentId ? selectedStudentId : undefined,
        classId: selectedClassId || undefined,
        targetConceptIds: concepts
          .filter((c) => c.subjectId === subjectId)
          .map((c) => c.id)
          .slice(0, 3),
        level: difficultyLevel,
        learningObjectives: activePlan.learningObjectives || [],
        prerequisites: activePlan.prerequisiteConcepts || [],
        explanation: activePlan.explanation || '',
        examples: activePlan.realWorldExamples || [],
        activities: activePlan.activities || [],
        estimatedTime: activePlan.estimatedTime || duration || '45 minutes',
        assessmentQuestions: activePlan.practiceQuestions || [],
        teacherId: currentUser?.uid || userProfile?.id || 'teacher',
        status: assignToStudent ? 'assigned' : 'draft',
        assignedToStudentIds: assignToStudent
          ? selectedStudentId
            ? [selectedStudentId]
            : students.map((s) => s.id)
          : [],
        createdAt: new Date().toISOString(),
      };

      await saveLessonPlan(newLesson);
      setSaveSuccessMsg(
        assignToStudent
          ? `Lesson plan "${newLesson.title}" saved & assigned to ${activeStudent ? activeStudent.name : 'cohort'} in Firestore!`
          : `Lesson plan "${newLesson.title}" saved successfully in Firestore!`
      );
      onRefresh();

      if (assignToStudent && onNavigateToResources) {
        setTimeout(() => onNavigateToResources(newLesson), 1200);
      }
    } catch (err: any) {
      console.error('Error saving lesson plan to Firestore:', err);
      setErrorInfo({
        message: `Failed to save plan to database: ${err.message || String(err)}`,
        isHighDemand: false,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isTeacherOrAdmin = activeRole === 'teacher' || activeRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <BookOpenCheck className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Personalized AI Lesson Plan Studio
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Synthesize differentiated instruction, pedagogical examples, and formative questions targeting verified learning gaps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!manualMode) {
                if (!activePlan) initializeBlankTemplate();
                setManualMode(true);
                setIsEditingDraft(true);
              } else {
                setManualMode(false);
              }
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            {manualMode ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>Switch to AI Generator</span>
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                <span>Manual Plan Builder</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner with Retry and Manual Mode Buttons */}
      {errorInfo && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/40">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  {errorInfo.isHighDemand ? 'AI Service High Demand (503 / Spike)' : 'Lesson Plan Generation Issue'}
                </h3>
                {errorInfo.isHighDemand && (
                  <span className="rounded-full bg-rose-200/80 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-900/80 dark:text-rose-200">
                    Temporary Spike
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                {errorInfo.message}
              </p>
              <p className="mt-1 text-[11px] text-rose-600/80 dark:text-rose-400">
                All your inputs (Subject: <strong>{activeSubject?.name}</strong>, Topic: <strong>{topic}</strong>, Level: <strong>{difficultyLevel}</strong>, Duration: <strong>{duration}</strong>) remain preserved below.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-lg bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-800 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Retrying Generation...' : 'Retry Generation'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    initializeBlankTemplate();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 shadow-xs hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Switch to Manual Plan Builder</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {saveSuccessMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Grid: Form / Builder on Left, Plan View / Editor on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Panel: Inputs (Criteria) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {manualMode ? 'Manual Plan Configuration' : 'Lesson Generation Criteria'}
              </h2>
              <span className="text-[11px] text-slate-400">
                {manualMode ? 'Custom Mode' : 'AI-Assisted'}
              </span>
            </div>

            <form onSubmit={handleGenerate} className="mt-4 space-y-3.5">
              {/* 1. Subject */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Subject *
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

              {/* 2. Topic */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Core Topic / Unit *
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Quadratic Factoring & Word Problems"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* 3. Student Level & 4. Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Student Level
                  </label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="beginner">Beginner (Foundational)</option>
                    <option value="intermediate">Intermediate (Standard)</option>
                    <option value="advanced">Advanced (Deep Dive)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="30 minutes">30 minutes</option>
                    <option value="45 minutes">45 minutes</option>
                    <option value="60 minutes">60 minutes</option>
                    <option value="90 minutes">90 minutes</option>
                  </select>
                </div>
              </div>

              {/* 5. Learning Goals */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Learning Goals & Objectives
                </label>
                <textarea
                  rows={2}
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  placeholder="e.g. Master quadratic factoring, develop intuition for negative signs, and solve word problems"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* 6. Learning Pace & Target Class */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Learning Pace
                  </label>
                  <select
                    value={pace}
                    onChange={(e) => setPace(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="gentle">Gentle / Step-by-Step</option>
                    <option value="standard">Standard Curriculum</option>
                    <option value="accelerated">Accelerated</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Target Class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Student */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">All Students (Class-wide)</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Learning Gaps */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Learning Gaps (Comma-separated)
                </label>
                <textarea
                  rows={2}
                  value={learningGapsInput}
                  onChange={(e) => setLearningGapsInput(e.target.value)}
                  placeholder="Identified gaps from assessment scanning..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {!manualMode ? (
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Generating Pedagogical Plan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Generate Tailored Lesson Plan</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={initializeBlankTemplate}
                      className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
                    >
                      Initialize Manual Template
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerate()}
                      disabled={isGenerating}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Or Try AI Generation</span>
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel: Generated Plan Preview OR Manual Plan Builder Editor */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {activePlan ? (
            <div className="space-y-5">
              {/* Top Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      {difficultyLevel.toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {activePlan.estimatedTime || duration}
                    </span>
                    {modelUsedInfo && !manualMode && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                        Generated by {modelUsedInfo}
                      </span>
                    )}
                  </div>
                  {!isEditingDraft ? (
                    <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                      {activePlan.title}
                    </h2>
                  ) : (
                    <input
                      type="text"
                      value={activePlan.title}
                      onChange={(e) => setActivePlan({ ...activePlan, title: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  )}
                </div>

                {isTeacherOrAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDraft(!isEditingDraft)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{isEditingDraft ? 'Preview' : 'Edit Plan'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveToFirestore(false)}
                      className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-xs hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save to Firestore'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveToFirestore(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Assign to Student</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mode: EDITING DRAFT (Manual Plan Builder or In-Place AI Plan Editor) */}
              {isEditingDraft ? (
                <div className="space-y-4">
                  {/* Overview */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Lesson Overview / Summary
                    </label>
                    <textarea
                      rows={2}
                      value={activePlan.overview}
                      onChange={(e) => setActivePlan({ ...activePlan, overview: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Learning Objectives */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Learning Objectives
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setActivePlan({
                            ...activePlan,
                            learningObjectives: [...(activePlan.learningObjectives || []), 'New objective'],
                          })
                        }
                        className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        + Add Objective
                      </button>
                    </div>
                    <div className="mt-1 space-y-1.5">
                      {activePlan.learningObjectives?.map((obj, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={obj}
                            onChange={(e) => {
                              const updated = [...activePlan.learningObjectives];
                              updated[i] = e.target.value;
                              setActivePlan({ ...activePlan, learningObjectives: updated });
                            }}
                            className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = activePlan.learningObjectives.filter((_, idx) => idx !== i);
                              setActivePlan({ ...activePlan, learningObjectives: updated });
                            }}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Core Explanation */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Core Concept Explanation & Step-by-Step Logic
                    </label>
                    <textarea
                      rows={6}
                      value={activePlan.explanation}
                      onChange={(e) => setActivePlan({ ...activePlan, explanation: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Real World Examples */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Real-World Intuition & Examples
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setActivePlan({
                            ...activePlan,
                            realWorldExamples: [...(activePlan.realWorldExamples || []), 'New real-world example'],
                          })
                        }
                        className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        + Add Example
                      </button>
                    </div>
                    <div className="mt-1 space-y-1.5">
                      {activePlan.realWorldExamples?.map((ex, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={ex}
                            onChange={(e) => {
                              const updated = [...activePlan.realWorldExamples];
                              updated[i] = e.target.value;
                              setActivePlan({ ...activePlan, realWorldExamples: updated });
                            }}
                            className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = activePlan.realWorldExamples.filter((_, idx) => idx !== i);
                              setActivePlan({ ...activePlan, realWorldExamples: updated });
                            }}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Formative Practice Questions */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Formative Practice Questions ({activePlan.practiceQuestions?.length || 0})
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setActivePlan({
                            ...activePlan,
                            practiceQuestions: [
                              ...(activePlan.practiceQuestions || []),
                              { question: 'New Question', answer: 'Answer', explanation: 'Step-by-step reasoning' },
                            ],
                          })
                        }
                        className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        + Add Question
                      </button>
                    </div>
                    <div className="mt-2 space-y-3">
                      {activePlan.practiceQuestions?.map((pq, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-600">Question #{i + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = activePlan.practiceQuestions.filter((_, idx) => idx !== i);
                                setActivePlan({ ...activePlan, practiceQuestions: updated });
                              }}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Question text"
                            value={pq.question}
                            onChange={(e) => {
                              const updated = [...activePlan.practiceQuestions];
                              updated[i].question = e.target.value;
                              setActivePlan({ ...activePlan, practiceQuestions: updated });
                            }}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="Correct answer"
                            value={pq.answer}
                            onChange={(e) => {
                              const updated = [...activePlan.practiceQuestions];
                              updated[i].answer = e.target.value;
                              setActivePlan({ ...activePlan, practiceQuestions: updated });
                            }}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                          />
                          <input
                            type="text"
                            placeholder="Explanation"
                            value={pq.explanation}
                            onChange={(e) => {
                              const updated = [...activePlan.practiceQuestions];
                              updated[i].explanation = e.target.value;
                              setActivePlan({ ...activePlan, practiceQuestions: updated });
                            }}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDraft(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      Done Editing
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveToFirestore(false)}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500"
                    >
                      {isSaving ? 'Saving...' : 'Save Plan to Firestore'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode: PREVIEW */
                <div className="space-y-5">
                  {/* Overview */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                    "{activePlan.overview}"
                  </p>

                  {/* Objectives */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Target className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Learning Objectives</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {activePlan.learningObjectives?.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Prerequisites */}
                  {activePlan.prerequisiteConcepts?.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Prerequisite Concepts:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activePlan.prerequisiteConcepts.map((p, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-white block mb-1">
                      Core Concept Explanation & Logic:
                    </span>
                    <p className="whitespace-pre-line leading-relaxed">{activePlan.explanation}</p>
                  </div>

                  {/* Real World Examples */}
                  {activePlan.realWorldExamples?.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                        Real-World Intuition & Examples:
                      </span>
                      <div className="space-y-1.5">
                        {activePlan.realWorldExamples.map((ex, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-slate-100 bg-sky-50/50 p-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-sky-950/20 dark:text-slate-300"
                          >
                            {ex}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formative Practice Questions */}
                  {activePlan.practiceQuestions?.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                        Formative Practice Questions ({activePlan.practiceQuestions.length}):
                      </span>
                      <div className="space-y-2">
                        {activePlan.practiceQuestions.map((pq, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"
                          >
                            <p className="font-semibold text-slate-800 dark:text-slate-100">
                              Q{i + 1}: {pq.question}
                            </p>
                            <p className="mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              Answer: {pq.answer}
                            </p>
                            <p className="mt-0.5 text-slate-500 text-[11px]">{pq.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teacher Notes */}
                  {activePlan.teacherNotes && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                      <span className="font-bold block mb-0.5">Teacher Pedagogical Notes:</span>
                      <p>{activePlan.teacherNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center text-center text-slate-400">
              <BookOpenCheck className="h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Lesson Plan Generated Yet
              </h3>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                Configure your criteria on the left and click <strong>Generate Tailored Lesson Plan</strong>, or use the <strong>Manual Plan Builder</strong>.
              </p>
              <button
                type="button"
                onClick={initializeBlankTemplate}
                className="mt-4 flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:text-slate-300"
              >
                <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
                <span>Open Manual Plan Builder</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
