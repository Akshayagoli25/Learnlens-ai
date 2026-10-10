export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  classIds?: string[];
  photoURL?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  teacherId: string;
  createdAt: string;
}

export interface Concept {
  id: string;
  name: string;
  code: string;
  subjectId: string;
  topic: string;
  description: string;
  prerequisites: string[]; // array of concept IDs
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  teacherId: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: string;
  section: string;
  teacherId: string;
  studentIds: string[];
  createdAt: string;
}

export interface AssessmentQuestion {
  id: string;
  questionNumber: string;
  prompt: string;
  maxMarks: number;
  conceptId: string;
}

export interface Assessment {
  id: string;
  title: string;
  subjectId: string;
  classId: string;
  topicId?: string;
  conceptIds: string[];
  maxMarks: number;
  assessmentDate: string;
  questions: AssessmentQuestion[];
  teacherId: string;
  createdAt: string;
}

export interface QuestionScore {
  questionNumber: string;
  prompt?: string;
  studentAnswer?: string;
  score: number;
  maxMarks: number;
  conceptId: string;
  remarks?: string;
}

export interface MarkRecord {
  id: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  questionScores: QuestionScore[];
  status: 'draft' | 'confirmed';
  scannedImages?: string[];
  confirmedAt?: string;
  updatedAt?: string;
}

export interface ConceptGap {
  conceptId: string;
  conceptName: string;
  scorePercentage: number;
  practiceNeeded: boolean;
  totalQuestions: number;
  remarks: string;
}

export interface GapAnalysis {
  id: string;
  studentId: string;
  subjectId: string;
  teacherId: string;
  weakConcepts: ConceptGap[];
  strongConcepts: ConceptGap[];
  overallMastery: number;
  recommendations: string[];
  calculatedAt: string;
}

export interface LessonPlan {
  id: string;
  title: string;
  subjectId: string;
  topic: string;
  studentId?: string;
  classId?: string;
  targetConceptIds: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives: string[];
  prerequisites: string[];
  explanation: string;
  examples: string[];
  activities: string[];
  estimatedTime: string;
  assessmentQuestions: {
    question: string;
    answer: string;
    explanation: string;
  }[];
  teacherId: string;
  status: 'draft' | 'assigned';
  assignedToStudentIds: string[];
  createdAt: string;
}

export interface SlideItem {
  slideTitle: string;
  bulletPoints: string[];
  speakerNotes?: string;
}

export interface LearningResource {
  id: string;
  lessonId?: string;
  title: string;
  type: 'notes' | 'summary' | 'presentation' | 'worksheet' | 'quiz' | 'revision';
  content: string;
  slideData?: SlideItem[];
  conceptIds: string[];
  teacherId: string;
  assignedToStudentIds: string[];
  createdAt: string;
}

export interface AssignmentQuestion {
  id: string;
  type: 'mcq' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  conceptId: string;
}

export interface Assignment {
  id: string;
  title: string;
  resourceId?: string;
  lessonId?: string;
  subjectId: string;
  classId?: string;
  teacherId: string;
  targetConceptIds: string[];
  dueDate: string;
  questions: AssignmentQuestion[];
  assignedToStudentIds: string[];
  isReassessment?: boolean;
  originalAssessmentId?: string;
  createdAt: string;
}

export interface SubmissionAnswer {
  questionId: string;
  answer: string;
  score: number;
  maxPoints: number;
  feedback?: string;
  isCorrect?: boolean;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  answers: SubmissionAnswer[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  status: 'submitted' | 'graded';
  gradedBy?: string;
  gradedAt?: string;
}

export interface ProgressRecord {
  id: string;
  studentId: string;
  lessonId?: string;
  resourceId?: string;
  type: 'lesson_completed' | 'quiz_completed' | 'reassessment_completed';
  score?: number;
  conceptIds: string[];
  completedAt: string;
}

export type CopilotToolType =
  | 'exit_ticket'
  | 'rubric'
  | 'homework'
  | 'misconception'
  | 'parent_note'
  | 'bell_ringer';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolType?: CopilotToolType;
  toolResult?: string;
  suggestions?: string[];
}

export interface StudentTutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

