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
} from 'lucide-react';
import {
  LessonPlan,
  LearningResource,
  Assignment,
  Submission,
  ProgressRecord,
  GapAnalysis,
} from '../types';
import {
  saveSubmission,
  saveProgressRecord,
  computeAndSaveGapAnalysis,
} from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface StudentPortalProps {
  assignedLessons: LessonPlan[];
  assignedResources: LearningResource[];
  assignedQuizzes: Assignment[];
  studentSubmissions: Submission[];
  studentProgress: ProgressRecord[];
  gapAnalyses: GapAnalysis[];
  onRefresh: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  assignedLessons,
  assignedResources,
  assignedQuizzes,
  studentSubmissions,
  studentProgress,
  gapAnalyses,
  onRefresh,
}) => {
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'lessons' | 'quizzes' | 'resources'>('lessons');
  const [selectedLesson, setSelectedLesson] = useState<LessonPlan | null>(
    assignedLessons[0] || null
  );
  const [activeQuiz, setActiveQuiz] = useState<Assignment | null>(null);

  // Quiz taking state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<Submission | null>(null);

  // Completed lesson tracking
  const completedLessonIds = studentProgress
    .filter((p) => p.type === 'lesson_completed')
    .map((p) => p.lessonId);

  const markLessonCompleted = async (lesson: LessonPlan) => {
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

  const startQuiz = (quiz: Assignment) => {
    setActiveQuiz(quiz);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizResult(null);
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

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
          ? 'Correct! Well done.'
          : `Incorrect. Expected answer: ${q.correctAnswer || 'See lesson note'}`,
      };
    });

    const percentage = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;

    const submission: Submission = {
      id: `sub_${activeQuiz.id}_${currentUser.uid}_${Date.now()}`,
      assignmentId: activeQuiz.id,
      studentId: currentUser.uid,
      studentName: userProfile?.name || 'Student',
      submittedAt: new Date().toISOString(),
      answers: submissionAnswers,
      totalScore: earnedScore,
      maxScore,
      percentage,
      status: 'graded',
      gradedBy: 'auto_grader',
      gradedAt: new Date().toISOString(),
    };

    await saveSubmission(submission);

    // Save progress record
    await saveProgressRecord({
      id: `prog_quiz_${Date.now()}`,
      studentId: currentUser.uid,
      resourceId: activeQuiz.id,
      type: 'quiz_completed',
      score: earnedScore,
      conceptIds: activeQuiz.targetConceptIds,
      completedAt: new Date().toISOString(),
    });

    setQuizResult(submission);
    setQuizSubmitted(true);
    onRefresh();
  };

  // Next recommendation calculation
  const currentGaps = gapAnalyses.flatMap((ga) => ga.weakConcepts || []);
  const topWeakConcept = currentGaps[0]?.conceptName;

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Next Step Recommendation */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 p-6 text-white shadow-lg shadow-indigo-600/20">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-indigo-200">
              <GraduationCap className="h-5 w-5" />
              <span className="text-xs font-semibold tracking-wide uppercase">
                Student Learning Portal
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold">
              Welcome back, {userProfile?.name || 'Scholar'}!
            </h1>
            <p className="mt-1 max-w-xl text-xs text-indigo-100">
              {topWeakConcept ? (
                <>
                  <Sparkles className="inline h-3.5 w-3.5 text-amber-300 mr-1" />
                  Recommended Next Step: Work through lessons targeting{' '}
                  <strong className="text-white underline">{topWeakConcept}</strong> to boost your subject mastery!
                </>
              ) : (
                'You are currently up to date on all your curriculum milestones.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2 text-center backdrop-blur-xs">
              <span className="block text-xl font-black">{completedLessonIds.length}</span>
              <span className="text-[10px] text-indigo-200">Lessons Completed</span>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-2 text-center backdrop-blur-xs">
              <span className="block text-xl font-black">{studentSubmissions.length}</span>
              <span className="text-[10px] text-indigo-200">Quizzes Taken</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          onClick={() => {
            setActiveTab('lessons');
            setActiveQuiz(null);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
            activeTab === 'lessons'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Assigned Lesson Plans ({assignedLessons.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('quizzes');
            setActiveQuiz(null);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
            activeTab === 'quizzes'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Practice Quizzes ({assignedQuizzes.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('resources');
            setActiveQuiz(null);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
            activeTab === 'resources'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Download className="h-4 w-4" />
          <span>Notes & Slide Decks ({assignedResources.length})</span>
        </button>
      </div>

      {/* TAB 1: ASSIGNED LESSON PLANS */}
      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Lessons List on Left */}
          <div className="lg:col-span-5 space-y-3">
            {assignedLessons.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                No personalized lesson plans assigned yet. Check back soon!
              </div>
            ) : (
              assignedLessons.map((lesson) => {
                const isCompleted = completedLessonIds.includes(lesson.id);
                const isSelected = selectedLesson?.id === lesson.id;

                return (
                  <div
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-950/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {lesson.level}
                      </span>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" /> {lesson.estimatedTime}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                      {lesson.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      Topic: {lesson.topic}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Lesson Study View on Right */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {selectedLesson ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      Study Module
                    </span>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedLesson.title}
                    </h2>
                  </div>

                  {!completedLessonIds.includes(selectedLesson.id) ? (
                    <button
                      onClick={() => markLessonCompleted(selectedLesson)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Completed
                    </button>
                  ) : (
                    <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Lesson Completed
                    </span>
                  )}
                </div>

                {/* Objectives */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    What You'll Master:
                  </h4>
                  <ul className="space-y-1">
                    {selectedLesson.learningObjectives?.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Explanation Content */}
                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                    Core Conceptual Breakdown:
                  </h4>
                  <p className="whitespace-pre-line leading-relaxed">{selectedLesson.explanation}</p>
                </div>

                {/* Real-world Examples */}
                {selectedLesson.examples?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Real-World Intuition:
                    </h4>
                    <div className="space-y-1.5">
                      {selectedLesson.examples.map((ex, i) => (
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

                {/* Formative Practice */}
                {selectedLesson.assessmentQuestions?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Self-Check Practice Questions:
                    </h4>
                    <div className="space-y-2">
                      {selectedLesson.assessmentQuestions.map((pq, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"
                        >
                          <p className="font-semibold text-slate-900 dark:text-white">
                            Q{i + 1}: {pq.question}
                          </p>
                          <p className="mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            Correct Answer: {pq.answer}
                          </p>
                          <p className="mt-0.5 text-slate-500 text-[11px]">{pq.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
                <BookOpen className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs">Select a lesson plan from the list to begin studying.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE PRACTICE QUIZZES */}
      {activeTab === 'quizzes' && (
        <div>
          {!activeQuiz ? (
            /* Quiz Selection List */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedQuizzes.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                  No practice quizzes currently assigned.
                </div>
              ) : (
                assignedQuizzes.map((quiz) => {
                  const pastSubmission = studentSubmissions.find(
                    (s) => s.assignmentId === quiz.id
                  );

                  return (
                    <div
                      key={quiz.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                            {quiz.isReassessment ? 'Reassessment Challenge' : 'Practice Quiz'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Due: {quiz.dueDate}
                          </span>
                        </div>

                        <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                          {quiz.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {quiz.questions?.length || 0} Questions • Target:{' '}
                          {quiz.targetConceptIds?.[0] || 'Curriculum'}
                        </p>

                        {pastSubmission && (
                          <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Score: {pastSubmission.totalScore} / {pastSubmission.maxScore} (
                            {pastSubmission.percentage}%)
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => startQuiz(quiz)}
                        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {pastSubmission ? 'Retake Quiz' : 'Start Quiz'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Active Interactive Quiz Runner */
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">
                    Interactive Assessment
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeQuiz.title}
                  </h2>
                </div>
                <button
                  onClick={() => setActiveQuiz(null)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Exit Quiz
                </button>
              </div>

              {/* Quiz Results Summary */}
              {quizSubmitted && quizResult && (
                <div className="mt-4 rounded-xl bg-emerald-50 p-4 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        Quiz Completed!
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        Your Score: <strong>{quizResult.totalScore} / {quizResult.maxScore}</strong> (
                        {quizResult.percentage}%)
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveQuiz(null)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Questions Form */}
              <div className="mt-6 space-y-6">
                {activeQuiz.questions.map((q, idx) => {
                  const studentAns = quizAnswers[q.id];
                  const resultAns = quizResult?.answers?.find((a) => a.questionId === q.id);

                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border border-slate-200 p-4 text-xs dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Question {idx + 1}
                        </span>
                        <span className="text-slate-400 font-mono">{q.points} Points</span>
                      </div>

                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {q.question}
                      </p>

                      {/* Multiple choice options */}
                      {q.options && q.options.length > 0 ? (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = studentAns === opt;
                            let style = 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300';
                            if (isSelected) {
                              style = 'border-indigo-600 bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';
                            }
                            if (quizSubmitted) {
                              if (opt === q.correctAnswer) {
                                style = 'border-emerald-500 bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                              } else if (isSelected && !resultAns?.isCorrect) {
                                style = 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                disabled={quizSubmitted}
                                onClick={() => handleAnswerSelect(q.id, opt)}
                                className={`rounded-xl border p-3 text-left transition ${style}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        /* Short answer input */
                        <div className="mt-3">
                          <input
                            type="text"
                            disabled={quizSubmitted}
                            value={studentAns || ''}
                            onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                      )}

                      {/* Explanation Feedback after submitting */}
                      {quizSubmitted && resultAns && (
                        <div
                          className={`mt-3 rounded-lg p-2.5 text-xs ${
                            resultAns.isCorrect
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
                          }`}
                        >
                          <p className="font-semibold">{resultAns.feedback}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!quizSubmitted && (
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitQuiz}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500"
                  >
                    Submit Answers & View Grade
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NOTES & SLIDE DECKS */}
      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignedResources.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              No supplementary notes or slide decks assigned yet.
            </div>
          ) : (
            assignedResources.map((res) => (
              <div
                key={res.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {res.type}
                  </span>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                    {res.title}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-500">
                    {res.content || 'Presentation slide deck'}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {res.type === 'presentation' && (
                    <button
                      onClick={async () => {
                        const resPost = await fetch('/api/generate-pptx', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: res.title,
                            topic: res.title,
                            slides: res.slideData,
                          }),
                        });
                        const blob = await resPost.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${res.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
                        a.click();
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:underline dark:text-amber-400"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PowerPoint (.pptx)
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
