import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Presentation,
  Download,
  Sparkles,
  Send,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ListOrdered,
  Eye,
  BookOpen,
} from 'lucide-react';
import {
  LearningResource,
  LessonPlan,
  Subject,
  UserProfile,
  SlideItem,
} from '../types';
import { saveResource, saveAssignment } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface ResourceHubProps {
  resources: LearningResource[];
  lessonPlans: LessonPlan[];
  subjects: Subject[];
  students: UserProfile[];
  initialLesson?: LessonPlan | null;
  onRefresh: () => void;
}

export const ResourceHub: React.FC<ResourceHubProps> = ({
  resources,
  lessonPlans,
  subjects,
  students,
  initialLesson,
  onRefresh,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();

  const [selectedType, setSelectedType] = useState<
    'notes' | 'summary' | 'presentation' | 'worksheet' | 'quiz' | 'revision'
  >('presentation');
  const [topic, setTopic] = useState(initialLesson?.topic || 'Quadratic Equations & Roots');
  const [subjectId, setSubjectId] = useState(
    initialLesson?.subjectId || subjects[0]?.id || ''
  );
  const [targetStudentId, setTargetStudentId] = useState(
    initialLesson?.studentId || ''
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingPptx, setIsDownloadingPptx] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGenerated, setActiveGenerated] = useState<any | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activeSubject = subjects.find((s) => s.id === subjectId) || subjects[0];

  const handleGenerateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !subjectId) return;

    setIsGenerating(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/resources/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType === 'presentation' ? 'presentation_outline' : selectedType,
          subject: activeSubject?.name || 'Mathematics',
          topic,
          conceptNames: [topic],
          targetLevel: 'intermediate',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate resource.');
      }

      setActiveGenerated(data.data);
    } catch (err: any) {
      console.error('Resource generation error:', err);
      setError(err.message || 'Error creating learning materials.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Real PPTX file download using backend PptxGenJS endpoint
  const handleDownloadPptx = async (slidesData?: SlideItem[]) => {
    setIsDownloadingPptx(true);
    setError(null);

    try {
      const slidesToUse = slidesData || activeGenerated?.slides || [
        {
          slideTitle: `${topic} - Core Principles`,
          bulletPoints: ['Definition and properties', 'Key formula derivation', 'Standard application cases'],
          speakerNotes: 'Introduce the core concept thoroughly.',
        },
        {
          slideTitle: 'Worked Example & Problem Walkthrough',
          bulletPoints: ['Step 1: Set equation equal to zero', 'Step 2: Factor or apply quadratic formula', 'Step 3: Check validity of solutions'],
          speakerNotes: 'Work through the problem on board with class.',
        },
        {
          slideTitle: 'Practice & Recap Questions',
          bulletPoints: ['Solve: x^2 - 7x + 12 = 0', 'Find discriminant for: 2x^2 + 4x + 5 = 0'],
          speakerNotes: 'Allow students 5 minutes to attempt.',
        },
      ];

      const res = await fetch('/api/generate-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeGenerated?.title || `${topic} Mastery Presentation`,
          subject: activeSubject?.name || 'Curriculum',
          topic,
          author: userProfile?.name || 'LearnLens AI Educator',
          slides: slidesToUse,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to download PPTX file.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic.replace(/[^a-zA-Z0-9]/g, '_')}_Presentation.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('PPTX download error:', err);
      setError('Could not download presentation file: ' + err.message);
    } finally {
      setIsDownloadingPptx(false);
    }
  };

  const handleSaveAndAssign = async () => {
    if (!activeGenerated) return;

    const resourceId = `res_${Date.now()}`;
    const newResource: LearningResource = {
      id: resourceId,
      lessonId: initialLesson?.id || undefined,
      title: activeGenerated.title || `${topic} - ${selectedType}`,
      type: selectedType,
      content: activeGenerated.markdownContent || activeGenerated.summary || '',
      slideData: activeGenerated.slides || undefined,
      conceptIds: [topic],
      teacherId: currentUser?.uid || userProfile?.id || 'teacher',
      assignedToStudentIds: targetStudentId ? [targetStudentId] : students.map((s) => s.id),
      createdAt: new Date().toISOString(),
    };

    await saveResource(newResource);

    // If quiz type, also create an assignment automatically so students can take it in the portal!
    if (selectedType === 'quiz' && activeGenerated.quizQuestions?.length > 0) {
      await saveAssignment({
        id: `asg_${Date.now()}`,
        title: `${topic} - Formative Practice Quiz`,
        resourceId,
        subjectId,
        teacherId: currentUser?.uid || userProfile?.id || 'teacher',
        targetConceptIds: [topic],
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        questions: activeGenerated.quizQuestions.map((q: any, i: number) => ({
          id: q.id || `q_${i}`,
          type: q.type || 'mcq',
          question: q.question,
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: q.correctAnswer || q.options?.[0] || 'Option A',
          points: Number(q.points) || 10,
          conceptId: topic,
        })),
        assignedToStudentIds: targetStudentId ? [targetStudentId] : students.map((s) => s.id),
        createdAt: new Date().toISOString(),
      });
    }

    setSaveSuccess(true);
    onRefresh();
  };

  const isTeacherOrAdmin = activeRole === 'teacher' || activeRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Presentation className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Learning Resource & Slide Studio
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Generate lesson summaries, practice worksheets, quizzes, and downloadable Microsoft PowerPoint presentations (.pptx).
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Resource successfully saved and assigned to student learning portal!</span>
        </div>
      )}

      {/* Generator Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleGenerateResource} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Resource Format
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="presentation">PowerPoint Slides (.pptx)</option>
              <option value="quiz">Interactive Formative Quiz</option>
              <option value="notes">Study Notes & Cheat Sheet</option>
              <option value="worksheet">Practice Worksheet</option>
              <option value="summary">Concept Summary</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
              Topic
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Kinematics in 1D"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Resource
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Resource Preview & PPTX Download */}
      {activeGenerated && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                {selectedType.toUpperCase()}
              </span>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {activeGenerated.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Genuine Download PPTX Button */}
              {selectedType === 'presentation' && (
                <button
                  onClick={() => handleDownloadPptx()}
                  disabled={isDownloadingPptx}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {isDownloadingPptx ? 'Compiling PPTX...' : 'Download Real PPTX File'}
                </button>
              )}

              {isTeacherOrAdmin && (
                <button
                  onClick={handleSaveAndAssign}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"
                >
                  <Send className="h-4 w-4" />
                  Assign to Student Portal
                </button>
              )}
            </div>
          </div>

          {/* Presentation Slide Previews */}
          {selectedType === 'presentation' && activeGenerated.slides?.length > 0 && (
            <div className="mt-6 space-y-4">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Generated Slide Decks ({activeGenerated.slides.length} slides)
              </span>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeGenerated.slides.map((slide: SlideItem, i: number) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-800/80"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        <span>Slide {i + 1}</span>
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                        {slide.slideTitle}
                      </h4>
                      <ul className="mt-2 space-y-1">
                        {slide.bulletPoints?.map((bp, bidx) => (
                          <li key={bidx} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="text-indigo-500">•</span>
                            <span>{bp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {slide.speakerNotes && (
                      <p className="mt-3 border-t border-slate-200 pt-2 text-[10px] text-slate-400 italic dark:border-slate-700">
                        Notes: {slide.speakerNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz Preview */}
          {selectedType === 'quiz' && activeGenerated.quizQuestions?.length > 0 && (
            <div className="mt-6 space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Quiz Questions ({activeGenerated.quizQuestions.length})
              </span>
              {activeGenerated.quizQuestions.map((q: any, i: number) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4 text-xs dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">
                    {i + 1}. {q.question}
                  </p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options?.map((opt: string, optIdx: number) => (
                      <div
                        key={optIdx}
                        className={`rounded-lg p-2 text-xs border ${
                          opt === q.correctAnswer
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                            : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Markdown / Document Notes Preview */}
          {selectedType !== 'presentation' && activeGenerated.markdownContent && (
            <div className="mt-6 rounded-xl bg-slate-50 p-5 text-xs text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 whitespace-pre-line leading-relaxed">
              {activeGenerated.markdownContent}
            </div>
          )}
        </div>
      )}

      {/* Existing Saved Resources Repository */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Saved Resources Repository ({resources.length})
        </h3>
        {resources.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-xs text-slate-400 dark:bg-slate-900">
            No saved learning resources yet. Generate presentation slides, notes, or practice materials above.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((res) => (
              <div
                key={res.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {res.type}
                  </span>
                  <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                    {res.title}
                  </h4>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-500">
                    {res.content || 'Presentation slide deck'}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">
                    {new Date(res.createdAt).toLocaleDateString()}
                  </span>
                  {res.type === 'presentation' && (
                    <button
                      onClick={() => handleDownloadPptx(res.slideData)}
                      className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline dark:text-amber-400"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download .pptx
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
