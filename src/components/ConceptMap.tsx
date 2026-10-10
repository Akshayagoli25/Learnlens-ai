import React, { useState } from 'react';
import {
  GitFork,
  Plus,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  Filter,
} from 'lucide-react';
import { Concept, Subject, GapAnalysis } from '../types';
import { saveConcept } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface ConceptMapProps {
  concepts: Concept[];
  subjects: Subject[];
  gapAnalyses?: GapAnalysis[];
  onSelectConceptForLesson?: (concept: Concept) => void;
  onRefresh: () => void;
}

export const ConceptMap: React.FC<ConceptMapProps> = ({
  concepts,
  subjects,
  gapAnalyses = [],
  onSelectConceptForLesson,
  onRefresh,
}) => {
  const { userProfile, activeRole } = useAuth();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New concept form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [prereqInput, setPrereqInput] = useState<string[]>([]);

  // Filter concepts for active subject
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activeSubjectId = currentSubject?.id || '';
  const filteredConcepts = concepts.filter((c) => c.subjectId === activeSubjectId);

  // Determine mastery status across gap analysis (if student or teacher viewing)
  const getConceptStatus = (conceptId: string): 'mastered' | 'weak' | 'neutral' => {
    if (!gapAnalyses || gapAnalyses.length === 0) return 'neutral';
    for (const ga of gapAnalyses) {
      if (ga.weakConcepts?.some((w) => w.conceptId === conceptId)) return 'weak';
      if (ga.strongConcepts?.some((s) => s.conceptId === conceptId)) return 'mastered';
    }
    return 'neutral';
  };

  const handleCreateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !topic || !activeSubjectId) return;

    const newConcept: Concept = {
      id: `c_${Date.now()}`,
      name: name.trim(),
      code: code.trim() || `C-${Date.now().toString().slice(-4)}`,
      subjectId: activeSubjectId,
      topic: topic.trim(),
      description: description.trim(),
      prerequisites: prereqInput,
      difficultyLevel: difficulty,
      teacherId: userProfile?.id || 'teacher',
    };

    await saveConcept(newConcept);
    setShowAddModal(false);
    setName('');
    setCode('');
    setTopic('');
    setDescription('');
    setPrereqInput([]);
    onRefresh();
  };

  const isTeacherOrAdmin = activeRole === 'teacher' || activeRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Banner and Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <GitFork className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Curriculum Concept Map</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Interactive knowledge graph showing foundational dependencies, mastery levels, and prerequisite pathways.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Subject Filter */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={activeSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden dark:text-slate-200"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          {isTeacherOrAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Add Concept
            </button>
          )}
        </div>
      </div>

      {/* Legend & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Mastery Indicators:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">Mastered (≥70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-600 dark:text-slate-400">Learning Gap / Misconception</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="text-slate-600 dark:text-slate-400">Not Yet Assessed</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400">
          Showing {filteredConcepts.length} concepts for {currentSubject?.name || 'Selected Subject'}
        </span>
      </div>

      {/* Interactive Concept Map Canvas / Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main DAG Node Canvas (2 columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-900/60 shadow-inner">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Interactive Concept Network ({currentSubject?.name})
            </span>
            <span className="text-[11px] text-slate-400">Click any concept node to inspect details</span>
          </div>

          {filteredConcepts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-white p-6 text-center dark:bg-slate-800/50">
              <BookOpen className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                No concepts found for this subject yet.
              </p>
              {isTeacherOrAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 text-xs text-indigo-600 font-bold hover:underline"
                >
                  Create First Concept
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Organized by Difficulty / Tier Levels */}
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
                const tierConcepts = filteredConcepts.filter((c) => c.difficultyLevel === level);
                if (tierConcepts.length === 0) return null;

                return (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {level === 'beginner' && 'Tier 1: Foundational Concepts'}
                        {level === 'intermediate' && 'Tier 2: Intermediate Core'}
                        {level === 'advanced' && 'Tier 3: Advanced Applications'}
                      </span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {tierConcepts.map((concept) => {
                        const status = getConceptStatus(concept.id);
                        const isSelected = selectedConcept?.id === concept.id;

                        return (
                          <div
                            key={concept.id}
                            onClick={() => setSelectedConcept(concept)}
                            className={`group relative cursor-pointer rounded-xl border p-4 transition duration-150 ${
                              isSelected
                                ? 'border-indigo-600 bg-white shadow-lg shadow-indigo-500/10 dark:border-indigo-500 dark:bg-slate-800'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/90'
                            }`}
                          >
                            {/* Mastery Badge / Status Dot */}
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-semibold text-slate-400">
                                {concept.code}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {status === 'mastered' && (
                                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                                    <CheckCircle className="h-3 w-3" /> Mastered
                                  </span>
                                )}
                                {status === 'weak' && (
                                  <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                                    <AlertTriangle className="h-3 w-3" /> Needs Focus
                                  </span>
                                )}
                                {status === 'neutral' && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700">
                                    Unassessed
                                  </span>
                                )}
                              </div>
                            </div>

                            <h3 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                              {concept.name}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                              {concept.description || 'No description provided.'}
                            </p>

                            {/* Prerequisites indication */}
                            {concept.prerequisites && concept.prerequisites.length > 0 && (
                              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                                <GitFork className="h-3 w-3 shrink-0" />
                                <span>
                                  Prerequisites: {concept.prerequisites.length} prior concept(s)
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Concept Details Drawer / Action Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          {selectedConcept ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {selectedConcept.code}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {selectedConcept.difficultyLevel}
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedConcept.name}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">Topic: {selectedConcept.topic}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  Concept Description:
                </p>
                {selectedConcept.description || 'No detailed syllabus text added.'}
              </div>

              {/* Prerequisites Breakdown */}
              <div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Required Prerequisites:
                </span>
                {selectedConcept.prerequisites?.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {selectedConcept.prerequisites.map((pId) => {
                      const prereqConcept = concepts.find((c) => c.id === pId);
                      return (
                        <div
                          key={pId}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300"
                        >
                          <ArrowRight className="h-3 w-3 text-indigo-500" />
                          <span>{prereqConcept?.name || pId}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    No prerequisites — this is a foundational entry point.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {onSelectConceptForLesson && (
                  <button
                    onClick={() => onSelectConceptForLesson(selectedConcept)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate Lesson Plan for This Concept
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-72 flex-col items-center justify-center text-center text-slate-400">
              <Info className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium">Select any concept in the network to view dependencies.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Concept Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Add Concept to Curriculum
            </h2>
            <form onSubmit={handleCreateConcept} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Concept Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quadratic Formula & Discriminant"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Code / ID
                  </label>
                  <input
                    type="text"
                    placeholder="MATH-C2"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Topic Group
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Algebra"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="beginner">Beginner (Foundational)</option>
                  <option value="intermediate">Intermediate (Core)</option>
                  <option value="advanced">Advanced (Application)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Prerequisites
                </label>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                  {filteredConcepts.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={prereqInput.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPrereqInput([...prereqInput, c.id]);
                          } else {
                            setPrereqInput(prereqInput.filter((id) => id !== c.id));
                          }
                        }}
                      />
                      <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Key theorems, student misconceptions, learning goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Save Concept
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
