import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Subject,
  Concept,
  SchoolClass,
  Assessment,
  MarkRecord,
  GapAnalysis,
  LessonPlan,
  LearningResource,
  Assignment,
  Submission,
  ProgressRecord,
  UserProfile,
  ConceptGap,
} from '../types';

// ==================== USERS & DIRECTORY ====================

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
}

export async function updateUserRole(userId: string, newRole: 'student' | 'teacher' | 'admin'): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

// ==================== SUBJECTS ====================

export async function getSubjects(): Promise<Subject[]> {
  try {
    const snap = await getDocs(collection(db, 'subjects'));
    return snap.docs.map((d) => d.data() as Subject);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'subjects');
    return [];
  }
}

export async function saveSubject(subject: Subject): Promise<void> {
  try {
    await setDoc(doc(db, 'subjects', subject.id), subject);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `subjects/${subject.id}`);
  }
}

export async function deleteSubject(subjectId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'subjects', subjectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `subjects/${subjectId}`);
  }
}

// ==================== CONCEPTS & CURRICULUM ====================

export async function getConcepts(subjectId?: string): Promise<Concept[]> {
  try {
    const col = collection(db, 'concepts');
    const q = subjectId ? query(col, where('subjectId', '==', subjectId)) : col;
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Concept);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'concepts');
    return [];
  }
}

export async function saveConcept(concept: Concept): Promise<void> {
  try {
    await setDoc(doc(db, 'concepts', concept.id), concept);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `concepts/${concept.id}`);
  }
}

export async function deleteConcept(conceptId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'concepts', conceptId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `concepts/${conceptId}`);
  }
}

// ==================== SCHOOL CLASSES ====================

export async function getClasses(teacherId?: string): Promise<SchoolClass[]> {
  try {
    const col = collection(db, 'classes');
    const q = teacherId ? query(col, where('teacherId', '==', teacherId)) : col;
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as SchoolClass);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'classes');
    return [];
  }
}

export async function saveClass(schoolClass: SchoolClass): Promise<void> {
  try {
    await setDoc(doc(db, 'classes', schoolClass.id), schoolClass);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `classes/${schoolClass.id}`);
  }
}

// ==================== ASSESSMENTS ====================

export async function getAssessments(teacherId?: string, classId?: string): Promise<Assessment[]> {
  try {
    const col = collection(db, 'assessments');
    const snap = await getDocs(col);
    let list = snap.docs.map((d) => d.data() as Assessment);
    if (teacherId) list = list.filter((a) => a.teacherId === teacherId);
    if (classId) list = list.filter((a) => a.classId === classId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'assessments');
    return [];
  }
}

export async function getAssessmentById(assessmentId: string): Promise<Assessment | null> {
  try {
    const snap = await getDoc(doc(db, 'assessments', assessmentId));
    return snap.exists() ? (snap.data() as Assessment) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `assessments/${assessmentId}`);
    return null;
  }
}

export async function saveAssessment(assessment: Assessment): Promise<void> {
  try {
    await setDoc(doc(db, 'assessments', assessment.id), assessment);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `assessments/${assessment.id}`);
  }
}

export async function deleteAssessment(assessmentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'assessments', assessmentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `assessments/${assessmentId}`);
  }
}

// ==================== MARKS ====================

export async function getMarksByAssessment(assessmentId: string): Promise<MarkRecord[]> {
  try {
    const q = query(collection(db, 'marks'), where('assessmentId', '==', assessmentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as MarkRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'marks');
    return [];
  }
}

export async function getMarksByStudent(studentId: string): Promise<MarkRecord[]> {
  try {
    const q = query(collection(db, 'marks'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as MarkRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'marks');
    return [];
  }
}

export async function getAllMarks(): Promise<MarkRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'marks'));
    return snap.docs.map((d) => d.data() as MarkRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'marks');
    return [];
  }
}

export async function saveMarkRecord(mark: MarkRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'marks', mark.id), mark);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `marks/${mark.id}`);
  }
}

export async function deleteMarkRecord(markId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'marks', markId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `marks/${markId}`);
  }
}

// ==================== LEARNING GAP ANALYSIS ====================

export async function computeAndSaveGapAnalysis(
  studentId: string,
  subjectId: string,
  teacherId: string
): Promise<GapAnalysis> {
  // Retrieve confirmed marks for this student
  const marks = await getMarksByStudent(studentId);
  const confirmedMarks = marks.filter((m) => m.status === 'confirmed');

  // Retrieve concepts for this subject
  const allConcepts = await getConcepts(subjectId);
  const conceptMap = new Map<string, Concept>();
  allConcepts.forEach((c) => conceptMap.set(c.id, c));

  // Tally performance per concept
  const conceptScores: Record<string, { totalScored: number; totalMax: number; count: number }> = {};

  confirmedMarks.forEach((m) => {
    m.questionScores?.forEach((qs) => {
      if (qs.conceptId) {
        if (!conceptScores[qs.conceptId]) {
          conceptScores[qs.conceptId] = { totalScored: 0, totalMax: 0, count: 0 };
        }
        conceptScores[qs.conceptId].totalScored += qs.score;
        conceptScores[qs.conceptId].totalMax += qs.maxMarks;
        conceptScores[qs.conceptId].count += 1;
      }
    });
  });

  const weakConcepts: ConceptGap[] = [];
  const strongConcepts: ConceptGap[] = [];
  let totalAchieved = 0;
  let totalPossible = 0;

  Object.entries(conceptScores).forEach(([conceptId, data]) => {
    const pct = data.totalMax > 0 ? Math.round((data.totalScored / data.totalMax) * 100) : 0;
    const conceptObj = conceptMap.get(conceptId);
    const conceptName = conceptObj?.name || `Concept ${conceptId}`;

    totalAchieved += data.totalScored;
    totalPossible += data.totalMax;

    if (pct < 70) {
      weakConcepts.push({
        conceptId,
        conceptName,
        scorePercentage: pct,
        practiceNeeded: true,
        totalQuestions: data.count,
        remarks: pct < 50 ? 'Significant misconception detected. Foundational review required.' : 'Needs targeted practice problems.',
      });
    } else {
      strongConcepts.push({
        conceptId,
        conceptName,
        scorePercentage: pct,
        practiceNeeded: false,
        totalQuestions: data.count,
        remarks: 'Demonstrates solid conceptual mastery and application.',
      });
    }
  });

  const overallMastery = totalPossible > 0 ? Math.round((totalAchieved / totalPossible) * 100) : 0;

  // Generate actionable recommendations
  const recommendations: string[] = [];
  if (weakConcepts.length > 0) {
    recommendations.push(`Priority focus: Revisit ${weakConcepts.map((w) => w.conceptName).slice(0, 3).join(', ')}.`);
    recommendations.push('Complete tailored interactive practice quiz to build problem solving intuition.');
    recommendations.push('Review generated visual slides and step-by-step example breakdowns.');
  } else if (strongConcepts.length > 0) {
    recommendations.push('Great progress! All tested concepts are above 70% proficiency.');
    recommendations.push('Proceed to advanced application challenges and synoptic problem sets.');
  } else {
    recommendations.push('Complete at least one assessment to generate personalized learning gap diagnostics.');
  }

  const analysis: GapAnalysis = {
    id: `gap_${studentId}_${subjectId}`,
    studentId,
    subjectId,
    teacherId,
    weakConcepts,
    strongConcepts,
    overallMastery,
    recommendations,
    calculatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'gapAnalyses', analysis.id), analysis);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `gapAnalyses/${analysis.id}`);
  }

  return analysis;
}

export async function getGapAnalysis(studentId: string, subjectId: string): Promise<GapAnalysis | null> {
  try {
    const analysisId = `gap_${studentId}_${subjectId}`;
    const snap = await getDoc(doc(db, 'gapAnalyses', analysisId));
    return snap.exists() ? (snap.data() as GapAnalysis) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `gapAnalyses/gap_${studentId}_${subjectId}`);
    return null;
  }
}

export async function getStudentGapAnalyses(studentId: string): Promise<GapAnalysis[]> {
  try {
    const q = query(collection(db, 'gapAnalyses'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as GapAnalysis);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'gapAnalyses');
    return [];
  }
}

// ==================== LESSON PLANS ====================

export async function getLessonPlans(teacherId?: string): Promise<LessonPlan[]> {
  try {
    const col = collection(db, 'lessonPlans');
    const snap = await getDocs(col);
    let list = snap.docs.map((d) => d.data() as LessonPlan);
    if (teacherId) list = list.filter((l) => l.teacherId === teacherId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'lessonPlans');
    return [];
  }
}

export async function getAssignedLessonPlans(studentId: string): Promise<LessonPlan[]> {
  try {
    const snap = await getDocs(collection(db, 'lessonPlans'));
    const list = snap.docs.map((d) => d.data() as LessonPlan);
    return list.filter(
      (l) => l.status === 'assigned' && (!l.assignedToStudentIds?.length || l.assignedToStudentIds.includes(studentId))
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'lessonPlans');
    return [];
  }
}

export async function saveLessonPlan(lesson: LessonPlan): Promise<void> {
  try {
    await setDoc(doc(db, 'lessonPlans', lesson.id), lesson);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `lessonPlans/${lesson.id}`);
  }
}

export async function deleteLessonPlan(lessonId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'lessonPlans', lessonId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `lessonPlans/${lessonId}`);
  }
}

// ==================== LEARNING RESOURCES ====================

export async function getResources(lessonId?: string): Promise<LearningResource[]> {
  try {
    const col = collection(db, 'resources');
    const q = lessonId ? query(col, where('lessonId', '==', lessonId)) : col;
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as LearningResource);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'resources');
    return [];
  }
}

export async function getAssignedResources(studentId: string): Promise<LearningResource[]> {
  try {
    const snap = await getDocs(collection(db, 'resources'));
    const list = snap.docs.map((d) => d.data() as LearningResource);
    return list.filter(
      (r) => !r.assignedToStudentIds?.length || r.assignedToStudentIds.includes(studentId)
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'resources');
    return [];
  }
}

export async function saveResource(res: LearningResource): Promise<void> {
  try {
    await setDoc(doc(db, 'resources', res.id), res);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `resources/${res.id}`);
  }
}

// ==================== ASSIGNMENTS & REASSESSMENT ====================

export async function getAssignments(teacherId?: string): Promise<Assignment[]> {
  try {
    const col = collection(db, 'assignments');
    const snap = await getDocs(col);
    let list = snap.docs.map((d) => d.data() as Assignment);
    if (teacherId) list = list.filter((a) => a.teacherId === teacherId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'assignments');
    return [];
  }
}

export async function getAssignedAssignments(studentId: string): Promise<Assignment[]> {
  try {
    const snap = await getDocs(collection(db, 'assignments'));
    const list = snap.docs.map((d) => d.data() as Assignment);
    return list.filter(
      (a) => !a.assignedToStudentIds?.length || a.assignedToStudentIds.includes(studentId)
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'assignments');
    return [];
  }
}

export async function saveAssignment(assignment: Assignment): Promise<void> {
  try {
    await setDoc(doc(db, 'assignments', assignment.id), assignment);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `assignments/${assignment.id}`);
  }
}

// ==================== SUBMISSIONS ====================

export async function getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
  try {
    const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Submission);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'submissions');
    return [];
  }
}

export async function getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
  try {
    const q = query(collection(db, 'submissions'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Submission);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'submissions');
    return [];
  }
}

export async function saveSubmission(submission: Submission): Promise<void> {
  try {
    await setDoc(doc(db, 'submissions', submission.id), submission);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `submissions/${submission.id}`);
  }
}

// ==================== PROGRESS RECORDS ====================

export async function saveProgressRecord(progress: ProgressRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'progressRecords', progress.id), progress);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `progressRecords/${progress.id}`);
  }
}

export async function getStudentProgress(studentId: string): Promise<ProgressRecord[]> {
  try {
    const q = query(collection(db, 'progressRecords'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ProgressRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'progressRecords');
    return [];
  }
}

// ==================== INITIAL STARTER SEEDING ====================

export async function seedInitialCurriculumIfEmpty(userId: string): Promise<void> {
  try {
    const currentSubjects = await getSubjects();
    if (currentSubjects.length > 0) return; // Already initialized

    // 1. Math Subject
    const mathSub: Subject = {
      id: 'sub_math_101',
      name: 'Advanced Mathematics',
      code: 'MATH-101',
      description: 'Foundations of algebra, quadratic functions, polynomials, and analytical geometry.',
      teacherId: userId,
      createdAt: new Date().toISOString(),
    };
    await saveSubject(mathSub);

    // 2. Physics Subject
    const physSub: Subject = {
      id: 'sub_phys_201',
      name: 'Newtonian Physics & Dynamics',
      code: 'PHYS-201',
      description: 'Mechanics, kinematics, energy conservation, and projectile motion.',
      teacherId: userId,
      createdAt: new Date().toISOString(),
    };
    await saveSubject(physSub);

    // 3. Concepts for Math
    const c1: Concept = {
      id: 'c_alg_lin',
      name: 'Linear Equations & Graphs',
      code: 'MATH-C1',
      subjectId: 'sub_math_101',
      topic: 'Algebra Basics',
      description: 'Solving and graphing linear equations with single and multiple variables.',
      prerequisites: [],
      difficultyLevel: 'beginner',
      teacherId: userId,
    };
    const c2: Concept = {
      id: 'c_alg_quad',
      name: 'Quadratic Equations & Factoring',
      code: 'MATH-C2',
      subjectId: 'sub_math_101',
      topic: 'Quadratics',
      description: 'Factoring trinomials, completing the square, and using the quadratic formula.',
      prerequisites: ['c_alg_lin'],
      difficultyLevel: 'intermediate',
      teacherId: userId,
    };
    const c3: Concept = {
      id: 'c_alg_poly',
      name: 'Polynomial Division & Remainder Theorem',
      code: 'MATH-C3',
      subjectId: 'sub_math_101',
      topic: 'Polynomials',
      description: 'Long division, synthetic division, and roots of higher order polynomials.',
      prerequisites: ['c_alg_quad'],
      difficultyLevel: 'advanced',
      teacherId: userId,
    };
    const c4: Concept = {
      id: 'c_alg_exp',
      name: 'Exponential & Logarithmic Functions',
      code: 'MATH-C4',
      subjectId: 'sub_math_101',
      topic: 'Exponentials',
      description: 'Laws of logarithms, base e, and growth/decay modeling.',
      prerequisites: ['c_alg_lin'],
      difficultyLevel: 'intermediate',
      teacherId: userId,
    };

    // Physics Concepts
    const p1: Concept = {
      id: 'c_phys_kin',
      name: '1D Kinematics & Motion Graphs',
      code: 'PHYS-C1',
      subjectId: 'sub_phys_201',
      topic: 'Kinematics',
      description: 'Displacement, velocity, constant acceleration equations and graphical interpretation.',
      prerequisites: [],
      difficultyLevel: 'beginner',
      teacherId: userId,
    };
    const p2: Concept = {
      id: 'c_phys_vec',
      name: 'Vector Decomposition & 2D Vectors',
      code: 'PHYS-C2',
      subjectId: 'sub_phys_201',
      topic: 'Vectors',
      description: 'Resolving vectors into orthogonal components and vector addition.',
      prerequisites: ['c_phys_kin'],
      difficultyLevel: 'intermediate',
      teacherId: userId,
    };
    const p3: Concept = {
      id: 'c_phys_proj',
      name: 'Projectile Motion',
      code: 'PHYS-C3',
      subjectId: 'sub_phys_201',
      topic: '2D Motion',
      description: 'Trajectory calculation, range, time of flight under gravity.',
      prerequisites: ['c_phys_kin', 'c_phys_vec'],
      difficultyLevel: 'advanced',
      teacherId: userId,
    };

    await saveConcept(c1);
    await saveConcept(c2);
    await saveConcept(c3);
    await saveConcept(c4);
    await saveConcept(p1);
    await saveConcept(p2);
    await saveConcept(p3);

    // Default Class
    const defaultClass: SchoolClass = {
      id: 'class_grade10_a',
      name: 'Grade 10 - Section A',
      grade: '10',
      section: 'A',
      teacherId: userId,
      studentIds: [userId],
      createdAt: new Date().toISOString(),
    };
    await saveClass(defaultClass);
  } catch (err) {
    console.warn('Seeding note:', err);
  }
}
