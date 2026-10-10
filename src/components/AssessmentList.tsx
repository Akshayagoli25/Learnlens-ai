import React, { useState, useEffect } from 'react';
import {
  ScanLine,
  Plus,
  Calendar,
  Layers,
  CheckCircle,
  FileText,
  Trash2,
  Edit2,
  Users,
  Search,
  Filter,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  Assessment,
  SchoolClass,
  Subject,
  Concept,
  UserProfile,
  MarkRecord,
} from '../types';
import {
  saveAssessment,
  deleteAssessment,
  getMarksByAssessment,
  saveMarkRecord,
  computeAndSaveGapAnalysis,
} from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { AssessmentScannerModal, ScannerMode } from './AssessmentScannerModal';

interface AssessmentListProps {
  assessments: Assessment[];
  classes: SchoolClass[];
  subjects: Subject[];
  concepts: Concept[];
  students: UserProfile[];
  onRefresh: () => void;
  onNavigateToGaps?: () => void;
}

export const AssessmentList: React.FC<AssessmentListProps> = ({
  assessments,
  classes,
  subjects,
  concepts,
  students,
  onRefresh,
  onNavigateToGaps,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();

  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('answersheet');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [manualMarksModalOpen, setManualMarksModalOpen] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');

  // Loaded marks for selected assessment
  const [assessmentMarks, setAssessmentMarks] = useState<MarkRecord[]>([]);

  // Create assessment form state
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [maxMarks, setMaxMarks] = useState<number>(50);
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [questions, setQuestions] = useState<
    { id: string; questionNumber: string; prompt: string; maxMarks: number; conceptId: string }[]
  >([
    { id: 'q1', questionNumber: 'Q1', prompt: 'Solve for x: x^2 - 5x + 6 = 0', maxMarks: 10, conceptId: '' },
    { id: 'q2', questionNumber: 'Q2', prompt: 'Factor completely: 2x^2 + 7x + 3', maxMarks: 15, conceptId: '' },
    { id: 'q3', questionNumber: 'Q3', prompt: 'Calculate the discriminant and describe roots', maxMarks: 15, conceptId: '' },
    { id: 'q4', questionNumber: 'Q4', prompt: 'Word problem: Projectile height trajectory', maxMarks: 10, conceptId: '' },
  ]);

  // Load marks whenever selected assessment changes
  useEffect(() => {
    if (selectedAssessment) {
      getMarksByAssessment(selectedAssessment.id).then((m) => setAssessmentMarks(m));
    }
  }, [selectedAssessment]);

  // Filtered list
  const filtered = assessments.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'all' || a.subjectId === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId || !classId) return;

    // Calculate sum of max marks from questions
    const computedMax = questions.reduce((sum, q) => sum + (Number(q.maxMarks) || 0), 0);
    const finalMax = computedMax > 0 ? computedMax : maxMarks;

    const newAssessment: Assessment = {
      id: `asmt_${Date.now()}`,
      title: title.trim(),
      subjectId,
      classId,
      conceptIds: Array.from(new Set(questions.map((q) => q.conceptId).filter(Boolean))),
      maxMarks: finalMax,
      assessmentDate,
      questions: questions.map((q, idx) => ({
        ...q,
        questionNumber: q.questionNumber || `Q${idx + 1}`,
        maxMarks: Number(q.maxMarks) || 5,
        conceptId: q.conceptId || concepts[0]?.id || 'concept_gen',
      })),
      teacherId: currentUser?.uid || userProfile?.id || 'teacher',
      createdAt: new Date().toISOString(),
    };

    await saveAssessment(newAssessment);
    setCreateModalOpen(false);
    setTitle('');
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this assessment?')) {
      await deleteAssessment(id);
      if (selectedAssessment?.id === id) setSelectedAssessment(null);
      onRefresh();
    }
  };

  const isTeacherOrAdmin = activeRole === 'teacher' || activeRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <ScanLine className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Assessments & Student Mark Sheets
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Create exams, scan physical worksheets with Gemini Multimodal AI, enter grades, and update learning gap analytics.
          </p>
        </div>

        {isTeacherOrAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (assessments.length > 0) {
                  setSelectedAssessment(assessments[0]);
                } else {
                  // create dummy assessment shell for question paper scanning
                  setSelectedAssessment({
                    id: `asmt_temp_${Date.now()}`,
                    title: 'New Examination',
                    subjectId: subjects[0]?.id || '',
                    classId: classes[0]?.id || '',
                    conceptIds: [],
                    maxMarks: 50,
                    assessmentDate: new Date().toISOString().split('T')[0],
                    questions: [],
                    teacherId: currentUser?.uid || 'teacher',
                    createdAt: new Date().toISOString(),
                  });
                }
                setScannerMode('question_paper');
                setScannerOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 shadow-xs hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
            >
              <ScanLine className="h-4 w-4" />
              Scan/Upload Question Paper
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Create Assessment
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search assessments by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Assessments */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const sub = subjects.find((s) => s.id === item.subjectId);
          const cls = classes.find((c) => c.id === item.classId);

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    {sub?.name || 'General'}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {item.assessmentDate}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Cohort: <strong className="text-slate-700 dark:text-slate-300">{cls?.name || 'All Sections'}</strong>
                </p>

                <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold dark:bg-slate-800">
                    Max Marks: {item.maxMarks}
                  </div>
                  <div className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold dark:bg-slate-800">
                    {item.questions?.length || 0} Questions
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedAssessment(item);
                      setScannerMode('answersheet');
                      setScannerOpen(true);
                    }}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-indigo-50 p-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                    title="Scan student written answer sheet"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Answer Sheet</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAssessment(item);
                      setScannerMode('marksheet');
                      setScannerOpen(true);
                    }}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-purple-50 p-2 text-[11px] font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300"
                    title="Scan pre-graded mark ledger"
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>Marksheet</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAssessment(item);
                      setManualMarksModalOpen(true);
                    }}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 p-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                    title="Manual mark sheet entry"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Manual</span>
                  </button>
                </div>

                {isTeacherOrAdmin && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-[11px] text-slate-400 hover:text-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Marks Entry Modal & Student Results Table */}
      {manualMarksModalOpen && selectedAssessment && (
        <ManualMarksModal
          assessment={selectedAssessment}
          students={students}
          isOpen={manualMarksModalOpen}
          onClose={() => setManualMarksModalOpen(false)}
          onSaved={() => {
            getMarksByAssessment(selectedAssessment.id).then(setAssessmentMarks);
            if (onNavigateToGaps) onNavigateToGaps();
          }}
        />
      )}

      {/* Camera / Scanner Modal */}
      {scannerOpen && selectedAssessment && (
        <AssessmentScannerModal
          assessment={selectedAssessment}
          students={students}
          isOpen={scannerOpen}
          initialMode={scannerMode}
          onClose={() => {
            setScannerOpen(false);
            if (selectedAssessment) {
              getMarksByAssessment(selectedAssessment.id).then(setAssessmentMarks);
            }
          }}
          onScanCompleted={() => {
            if (selectedAssessment) {
              getMarksByAssessment(selectedAssessment.id).then(setAssessmentMarks);
            }
            onRefresh();
          }}
          onQuestionPaperExtracted={(extractedQs, detectedTitle, totalMax) => {
            setTitle(detectedTitle || title);
            setMaxMarks(totalMax || 50);
            if (extractedQs.length > 0) {
              setQuestions(
                extractedQs.map((q, idx) => ({
                  id: q.id || `q_${idx + 1}`,
                  questionNumber: q.questionNumber || `Q${idx + 1}`,
                  prompt: q.prompt,
                  maxMarks: q.maxMarks || 5,
                  conceptId: concepts[0]?.id || '',
                }))
              );
            }
            setCreateModalOpen(true);
            onRefresh();
          }}
        />
      )}

      {/* Create Assessment Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Create New Assessment
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedAssessment({
                    id: `asmt_temp_${Date.now()}`,
                    title: 'New Examination',
                    subjectId,
                    classId,
                    conceptIds: [],
                    maxMarks,
                    assessmentDate,
                    questions: [],
                    teacherId: currentUser?.uid || 'teacher',
                    createdAt: new Date().toISOString(),
                  });
                  setScannerMode('question_paper');
                  setCreateModalOpen(false);
                  setScannerOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
              >
                <ScanLine className="h-3.5 w-3.5" />
                Scan Question Paper to Auto-Fill
              </button>
            </div>
            <form onSubmit={handleCreateAssessment} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assessment Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 3: Quadratic Functions & Trajectories Exam"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    Class / Cohort
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Assessment Date
                  </label>
                  <input
                    type="date"
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total Maximum Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Questions Specification */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Questions & Mapped Concepts ({questions.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions([
                        ...questions,
                        {
                          id: `q_${Date.now()}`,
                          questionNumber: `Q${questions.length + 1}`,
                          prompt: 'New Question',
                          maxMarks: 10,
                          conceptId: concepts[0]?.id || '',
                        },
                      ])
                    }
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    + Add Question
                  </button>
                </div>

                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-700">
                  {questions.map((q, i) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800"
                    >
                      <input
                        type="text"
                        value={q.questionNumber}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[i].questionNumber = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-14 rounded-md border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={q.prompt}
                        placeholder="Question prompt..."
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[i].prompt = e.target.value;
                          setQuestions(updated);
                        }}
                        className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        min="1"
                        value={q.maxMarks}
                        placeholder="Marks"
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[i].maxMarks = Number(e.target.value);
                          setQuestions(updated);
                        }}
                        className="w-16 rounded-md border border-slate-300 px-1.5 py-1 text-center text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <select
                        value={q.conceptId}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[i].conceptId = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-36 rounded-md border border-slate-300 px-1 py-1 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">Select Concept</option>
                        {concepts
                          .filter((c) => !subjectId || c.subjectId === subjectId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
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
                  Save Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== MANUAL MARKS MODAL ====================

interface ManualMarksModalProps {
  assessment: Assessment;
  students: UserProfile[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ManualMarksModal: React.FC<ManualMarksModalProps> = ({
  assessment,
  students,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [questionScores, setQuestionScores] = useState<
    { questionNumber: string; prompt: string; score: number; maxMarks: number; conceptId: string; remarks: string }[]
  >([]);
  const [existingMarks, setExistingMarks] = useState<MarkRecord[]>([]);

  useEffect(() => {
    getMarksByAssessment(assessment.id).then(setExistingMarks);
  }, [assessment.id]);

  useEffect(() => {
    // When student changes, prefill question scores
    const existing = existingMarks.find((m) => m.studentId === selectedStudentId);
    if (existing && existing.questionScores) {
      setQuestionScores(existing.questionScores as any);
    } else {
      setQuestionScores(
        assessment.questions.map((q) => ({
          questionNumber: q.questionNumber,
          prompt: q.prompt,
          score: 0,
          maxMarks: q.maxMarks,
          conceptId: q.conceptId,
          remarks: '',
        }))
      );
    }
  }, [selectedStudentId, existingMarks, assessment]);

  const totalScore = questionScores.reduce((sum, q) => sum + (Number(q.score) || 0), 0);

  const handleSave = async () => {
    const student = students.find((s) => s.id === selectedStudentId);
    const studentName = student?.name || 'Student';

    // Validate that marks cannot exceed maximum score
    for (const q of questionScores) {
      if (q.score > q.maxMarks) {
        alert(`Error: Score for ${q.questionNumber} (${q.score}) cannot exceed maximum marks (${q.maxMarks}).`);
        return;
      }
      if (q.score < 0) {
        alert(`Error: Score for ${q.questionNumber} cannot be negative.`);
        return;
      }
    }

    const percentage = assessment.maxMarks > 0
      ? Math.round((totalScore / assessment.maxMarks) * 100)
      : 0;

    const record: MarkRecord = {
      id: `mark_${assessment.id}_${selectedStudentId}`,
      assessmentId: assessment.id,
      studentId: selectedStudentId,
      studentName,
      teacherId: currentUser?.uid || userProfile?.id || 'teacher',
      marksObtained: totalScore,
      maxMarks: assessment.maxMarks,
      percentage,
      questionScores,
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveMarkRecord(record);

    // Automatically recalculate gap analysis for this student!
    await computeAndSaveGapAnalysis(
      selectedStudentId,
      assessment.subjectId,
      currentUser?.uid || 'teacher'
    );

    onSaved();
    alert(`Confirmed marks saved for ${studentName}! Learning gap analysis updated.`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Enter / Edit Student Marks
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Assessment: <strong>{assessment.title}</strong> (Max Marks: {assessment.maxMarks})
        </p>

        {/* Student Selector */}
        <div className="mt-4 flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Student:
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
        </div>

        {/* Question Scores Table */}
        <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
              <tr>
                <th className="p-3">Q#</th>
                <th className="p-3">Question Prompt</th>
                <th className="p-3">Score Awarded</th>
                <th className="p-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {questionScores.map((q, idx) => (
                <tr key={idx}>
                  <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{q.questionNumber}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs">{q.prompt}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max={q.maxMarks}
                        value={q.score}
                        onChange={(e) => {
                          const updated = [...questionScores];
                          const val = parseFloat(e.target.value) || 0;
                          updated[idx].score = Math.min(val, q.maxMarks);
                          setQuestionScores(updated);
                        }}
                        className="w-16 rounded-md border border-slate-300 p-1 text-center font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <span className="text-slate-400">/ {q.maxMarks}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      placeholder="Remarks..."
                      value={q.remarks}
                      onChange={(e) => {
                        const updated = [...questionScores];
                        updated[idx].remarks = e.target.value;
                        setQuestionScores(updated);
                      }}
                      className="w-full rounded-md border border-slate-200 p-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Summary */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-semibold dark:bg-slate-800">
          <span className="text-slate-600 dark:text-slate-300">Total Score:</span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {totalScore} / {assessment.maxMarks} ({assessment.maxMarks > 0 ? Math.round((totalScore / assessment.maxMarks) * 100) : 0}%)
          </span>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
          >
            Save Confirmed Marks
          </button>
        </div>
      </div>
    </div>
  );
};
