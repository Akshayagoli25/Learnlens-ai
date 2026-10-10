import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Sparkles,
  Plus,
  ShieldCheck,
  Edit3,
  Layers,
  Award,
  BookOpen,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import { Assessment, QuestionScore, MarkRecord, UserProfile, AssessmentQuestion } from '../types';
import { saveMarkRecord, computeAndSaveGapAnalysis, saveAssessment } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

export type ScannerMode = 'answersheet' | 'question_paper' | 'marksheet';

interface AssessmentScannerModalProps {
  assessment: Assessment;
  students: UserProfile[];
  isOpen: boolean;
  onClose: () => void;
  onScanCompleted: (record: MarkRecord) => void;
  onQuestionPaperExtracted?: (extractedQuestions: AssessmentQuestion[], title: string, maxMarks: number) => void;
  initialMode?: ScannerMode;
}

interface CapturedImage {
  id: string;
  dataUrl: string;
}

export const AssessmentScannerModal: React.FC<AssessmentScannerModalProps> = ({
  assessment,
  students,
  isOpen,
  onClose,
  onScanCompleted,
  onQuestionPaperExtracted,
  initialMode = 'answersheet',
}) => {
  const { currentUser, userProfile } = useAuth();

  // Mode: answersheet | question_paper | marksheet
  const [scanMode, setScanMode] = useState<ScannerMode>(initialMode);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Images state
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Scanning / AI state
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Editable Review state for Answer Sheet / Marksheet
  const [reviewMode, setReviewMode] = useState(false);
  const [detectedStudentName, setDetectedStudentName] = useState('');
  const [reviewQuestions, setReviewQuestions] = useState<QuestionScore[]>([]);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [generalNotes, setGeneralNotes] = useState<string>('');

  // Extracted Question Paper state
  const [qpExtractedQuestions, setQpExtractedQuestions] = useState<any[]>([]);
  const [qpDetectedTitle, setQpDetectedTitle] = useState('');
  const [qpTotalMaxMarks, setQpTotalMaxMarks] = useState(50);
  const [qpReviewMode, setQpReviewMode] = useState(false);

  // Pre-populate student
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (overrideFacingMode?: 'environment' | 'user') => {
    setCameraError(null);
    const mode = overrideFacingMode || facingMode;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser. Please use the file upload option.');
      }

      // Stop previous tracks if switching
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access permission was denied. Please allow camera permissions in browser settings or upload document images directly.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera hardware was detected on this device. Please upload document images.');
      } else {
        setCameraError(err.message || 'Unable to access camera.');
      }
    }
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    setImages((prev) => [...prev, { id: `img_${Date.now()}`, dataUrl }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [
            ...prev,
            { id: `file_${Date.now()}_${Math.random()}`, dataUrl: event.target!.result as string },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Run Gemini Multimodal Scanning
  const runAiScanning = async () => {
    if (images.length === 0) {
      setScanError(`Please capture or upload at least one image of the ${scanMode === 'answersheet' ? 'answer sheet' : scanMode === 'question_paper' ? 'question paper' : 'marksheet'}.`);
      return;
    }

    setIsScanning(true);
    setScanError(null);
    stopCamera();

    try {
      if (scanMode === 'question_paper') {
        // Mode 2: SCAN QUESTION PAPER
        const res = await fetch('/api/assessments/scan-question-paper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: images.map((i) => i.dataUrl),
            subject: assessment.subjectId,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to scan question paper.');

        const result = data.data;
        if (!result.isClear) {
          setScanError('The question paper was not clear or readable. Please retake photo with better lighting.');
          setIsScanning(false);
          return;
        }

        setQpDetectedTitle(result.detectedTitle || assessment.title);
        setQpTotalMaxMarks(result.totalMaxMarks || assessment.maxMarks);
        setQpExtractedQuestions(
          (result.questions || []).map((q: any, idx: number) => ({
            id: `q_qp_${idx + 1}`,
            questionNumber: q.questionNumber || `Q${idx + 1}`,
            prompt: q.prompt || '',
            maxMarks: Number(q.maxMarks) || 5,
            conceptId: assessment.conceptIds?.[0] || 'general',
            suggestedConcept: q.suggestedConcept || '',
          }))
        );
        setQpReviewMode(true);
      } else if (scanMode === 'marksheet') {
        // Mode 3: SCAN MARKSHEET / SCORE LEDGER
        const res = await fetch('/api/assessments/scan-marksheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: images.map((i) => i.dataUrl),
            assessmentTitle: assessment.title,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to scan marksheet.');

        const result = data.data;
        if (!result.isClear) {
          setScanError('The marksheet was not clear or readable. Please retake photo.');
          setIsScanning(false);
          return;
        }

        const mapped: QuestionScore[] = (result.questionBreakdown || []).map((qb: any, idx: number) => ({
          questionNumber: qb.questionNumber || `Q${idx + 1}`,
          prompt: `Question ${qb.questionNumber || idx + 1}`,
          studentAnswer: '(Score extracted from teacher marksheet)',
          score: Number(qb.score) || 0,
          maxMarks: Number(qb.maxMarks) || 5,
          conceptId: assessment.questions?.[idx]?.conceptId || assessment.conceptIds?.[0] || 'general',
          remarks: qb.remarks || '',
        }));

        setReviewQuestions(mapped);
        setTotalScore(result.totalMarksObtained || mapped.reduce((s, q) => s + q.score, 0));
        setDetectedStudentName(result.detectedStudentName || '');
        setGeneralNotes(result.feedback || '');
        setReviewMode(true);
      } else {
        // Mode 1: SCAN ANSWER SHEET (Student Responses & Grading)
        const payload = {
          images: images.map((img) => img.dataUrl),
          assessmentTitle: assessment.title,
          subject: assessment.subjectId,
          questions: assessment.questions,
          maxMarks: assessment.maxMarks,
        };

        const res = await fetch('/api/assessments/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to scan answer sheet.');

        const scanResult = data.data;
        if (!scanResult.isClear) {
          setScanError(`Answer sheet was not legible: ${scanResult.clarityFeedback || 'Please retake with better lighting and focus.'}`);
          setIsScanning(false);
          return;
        }

        const mappedScores: QuestionScore[] = [];
        let total = 0;

        if (assessment.questions && assessment.questions.length > 0) {
          assessment.questions.forEach((qDef, idx) => {
            const matched = scanResult.questions?.find(
              (sq: any) =>
                sq.questionNumber?.toLowerCase().includes(qDef.questionNumber.toLowerCase()) ||
                sq.questionNumber === String(idx + 1)
            );

            const score = matched ? Number(matched.scoreAwarded) : 0;
            total += score;

            mappedScores.push({
              questionNumber: qDef.questionNumber,
              prompt: qDef.prompt,
              studentAnswer: matched?.studentAnswer || '(No answer detected)',
              score: Math.min(score, qDef.maxMarks),
              maxMarks: qDef.maxMarks,
              conceptId: qDef.conceptId,
              remarks: matched?.remarks || '',
            });
          });
        } else if (scanResult.questions?.length > 0) {
          scanResult.questions.forEach((sq: any, i: number) => {
            const score = Number(sq.scoreAwarded) || 0;
            total += score;
            mappedScores.push({
              questionNumber: sq.questionNumber || `Q${i + 1}`,
              prompt: sq.prompt || `Question ${i + 1}`,
              studentAnswer: sq.studentAnswer || '',
              score,
              maxMarks: Number(sq.maxMarks) || 5,
              conceptId: assessment.conceptIds?.[0] || 'general',
              remarks: sq.remarks || '',
            });
          });
        }

        setReviewQuestions(mappedScores);
        setTotalScore(total);
        setDetectedStudentName(scanResult.detectedStudentName || '');
        setGeneralNotes(scanResult.generalNotes || '');
        setReviewMode(true);
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError(err.message || 'Scanning encountered an unexpected problem.');
    } finally {
      setIsScanning(false);
    }
  };

  const updateQuestionScore = (idx: number, newScore: number, remarks: string, answer: string) => {
    setReviewQuestions((prev) => {
      const updated = [...prev];
      const maxAllowed = updated[idx].maxMarks;
      const safeScore = Math.max(0, Math.min(newScore, maxAllowed));
      updated[idx] = {
        ...updated[idx],
        score: safeScore,
        remarks,
        studentAnswer: answer,
      };
      const newTotal = updated.reduce((sum, item) => sum + item.score, 0);
      setTotalScore(newTotal);
      return updated;
    });
  };

  // Confirm and save student marks to Firestore
  const handleConfirmAndSaveMarks = async () => {
    const student = students.find((s) => s.id === selectedStudentId);
    const studentName = student?.name || detectedStudentName || 'Student';

    const percentage = assessment.maxMarks > 0
      ? Math.round((totalScore / assessment.maxMarks) * 100)
      : 0;

    const recordId = `mark_${assessment.id}_${selectedStudentId || 'student'}_${Date.now()}`;

    const markRecord: MarkRecord = {
      id: recordId,
      assessmentId: assessment.id,
      studentId: selectedStudentId || currentUser?.uid || 'student_1',
      studentName,
      teacherId: currentUser?.uid || userProfile?.id || 'teacher',
      marksObtained: totalScore,
      maxMarks: assessment.maxMarks,
      percentage,
      questionScores: reviewQuestions,
      status: 'confirmed',
      scannedImages: images.map((i) => i.dataUrl.slice(0, 500) + '...'),
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveMarkRecord(markRecord);

      // Trigger learning gap recalculation immediately!
      if (selectedStudentId) {
        await computeAndSaveGapAnalysis(
          selectedStudentId,
          assessment.subjectId,
          currentUser?.uid || 'teacher'
        );
      }

      onScanCompleted(markRecord);
      onClose();
    } catch (err: any) {
      console.error('Save marks error:', err);
      setScanError('Failed to save confirmed marks to database.');
    }
  };

  // Apply Question Paper extraction to update assessment
  const handleApplyQuestionPaper = async () => {
    if (onQuestionPaperExtracted) {
      onQuestionPaperExtracted(qpExtractedQuestions, qpDetectedTitle, qpTotalMaxMarks);
    }
    // Also update existing assessment if teacher wants
    const updatedAsmt: Assessment = {
      ...assessment,
      title: qpDetectedTitle || assessment.title,
      maxMarks: qpTotalMaxMarks || assessment.maxMarks,
      questions: qpExtractedQuestions,
    };
    await saveAssessment(updatedAsmt);
    alert(`Question Paper applied! Updated "${updatedAsmt.title}" with ${qpExtractedQuestions.length} questions.`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {reviewMode
                  ? 'Review & Confirm Extracted Student Marks'
                  : qpReviewMode
                  ? 'Confirm Extracted Question Paper Structure'
                  : 'Assessment Scanner & Document Upload Studio'}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Test: <strong className="text-slate-700 dark:text-slate-300">{assessment.title}</strong> (Max Marks:{' '}
              {assessment.maxMarks})
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SCANNER MODE TABS (Answer Sheet, Question Paper, Marksheet) */}
        {!reviewMode && !qpReviewMode && (
          <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <button
              onClick={() => setScanMode('answersheet')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                scanMode === 'answersheet'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              Scan/Upload Answer Sheet
            </button>

            <button
              onClick={() => setScanMode('question_paper')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                scanMode === 'question_paper'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Scan/Upload Question Paper
            </button>

            <button
              onClick={() => setScanMode('marksheet')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                scanMode === 'marksheet'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <Award className="h-4 w-4" />
              Scan/Upload Marksheet / Ledger
            </button>
          </div>
        )}

        {/* Mode Explanatory Notice */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
          <div>
            {scanMode === 'answersheet' && (
              <p>
                <strong>Answer Sheet Mode:</strong> Capture student written answers. Gemini vision will transcribe answers, grade against test questions, and calculate scores to diagnose learning gaps.
              </p>
            )}
            {scanMode === 'question_paper' && (
              <p>
                <strong>Question Paper Mode:</strong> Capture an exam question paper. Gemini will parse all question items, maximum marks, and map concepts to automatically set up the assessment.
              </p>
            )}
            {scanMode === 'marksheet' && (
              <p>
                <strong>Marksheet Mode:</strong> Capture a pre-graded scoring rubric or grade ledger table. Gemini extracts verified scores and student names directly into the database.
              </p>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {(cameraError || scanError) && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{cameraError || scanError}</p>
          </div>
        )}

        {/* STAGE 1: SCANNER & UPLOADER */}
        {!reviewMode && !qpReviewMode && (
          <div className="mt-4 space-y-4">
            {/* Student Selector for Answer Sheet or Marksheet */}
            {scanMode !== 'question_paper' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Student for this document:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Video Preview / Camera Viewfinder */}
            <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-white shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-contain ${isCameraActive ? 'block' : 'hidden'}`}
              />

              {!isCameraActive && (
                <div className="flex flex-col items-center p-6 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-indigo-400">
                    <Camera className="h-7 w-7" />
                  </div>
                  <h3 className="text-sm font-semibold">Live Camera Ready</h3>
                  <p className="mt-1 max-w-sm text-xs text-slate-400">
                    Position the {scanMode === 'answersheet' ? 'answer sheet' : scanMode === 'question_paper' ? 'question paper' : 'marksheet'} within the frame with good lighting.
                  </p>
                  <button
                    onClick={() => startCamera()}
                    className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500"
                  >
                    <Camera className="h-4 w-4" />
                    Start Camera
                  </button>
                </div>
              )}

              {/* Active Camera Overlay Controls */}
              {isCameraActive && (
                <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                  <button
                    onClick={switchCamera}
                    className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-xs hover:bg-slate-700"
                    title="Switch camera"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Flip
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-slate-900 shadow-xl hover:bg-slate-100"
                  >
                    <div className="h-3.5 w-3.5 rounded-full bg-rose-600 animate-pulse" />
                    Capture Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    className="rounded-full bg-slate-800/80 px-4 py-2 text-xs font-medium text-white backdrop-blur-xs hover:bg-slate-700"
                  >
                    Stop Camera
                  </button>
                </div>
              )}
            </div>

            {/* Upload Fallback / File Picker */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 p-3.5 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Or upload scanned JPG, PNG, or photo files from your computer/device:
                </span>
              </div>
              <label className="cursor-pointer rounded-lg bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                Browse Files
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Captured Pages Gallery */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Uploaded Document Pages ({images.length} pages ready)
                </span>
                {images.length > 0 && (
                  <button
                    onClick={() => setImages([])}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Clear All Pages
                  </button>
                )}
              </div>

              {images.length === 0 ? (
                <div className="mt-2 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-slate-800/50">
                  No images captured or uploaded yet. Start camera or select files.
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((img, index) => (
                    <div
                      key={img.id}
                      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700"
                    >
                      <img
                        src={img.dataUrl}
                        alt={`Page ${index + 1}`}
                        className="aspect-3/4 w-full object-cover"
                      />
                      <div className="absolute top-1.5 left-1.5 rounded-md bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        Page {index + 1}
                      </div>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1.5 right-1.5 rounded-md bg-rose-600/80 p-1 text-white hover:bg-rose-600"
                        title="Remove page"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={images.length === 0 || isScanning}
                onClick={runAiScanning}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Scanning Document with Gemini AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze & Extract {scanMode === 'answersheet' ? 'Answers & Marks' : scanMode === 'question_paper' ? 'Question Paper' : 'Marksheet'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2A: REVIEW EXTRACTED QUESTION PAPER */}
        {qpReviewMode && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-indigo-50 p-4 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    Question Paper Analysis Complete:
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {qpDetectedTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Extracted {qpExtractedQuestions.length} Questions • Total Max Marks: {qpTotalMaxMarks}
                  </p>
                </div>
                <button
                  onClick={() => setQpReviewMode(false)}
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-400"
                >
                  <RefreshCw className="inline h-3.5 w-3.5 mr-1" />
                  Rescan Pages
                </button>
              </div>
            </div>

            {/* Questions Table */}
            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
                  <tr>
                    <th className="p-3">Q#</th>
                    <th className="p-3">Question Prompt</th>
                    <th className="p-3">Max Marks</th>
                    <th className="p-3">Suggested Concept</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {qpExtractedQuestions.map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {q.questionNumber}
                      </td>
                      <td className="p-3">
                        <textarea
                          rows={2}
                          value={q.prompt}
                          onChange={(e) => {
                            const updated = [...qpExtractedQuestions];
                            updated[idx].prompt = e.target.value;
                            setQpExtractedQuestions(updated);
                          }}
                          className="w-full rounded-md border border-slate-200 p-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={q.maxMarks}
                          onChange={(e) => {
                            const updated = [...qpExtractedQuestions];
                            updated[idx].maxMarks = Number(e.target.value) || 1;
                            setQpExtractedQuestions(updated);
                            setQpTotalMaxMarks(updated.reduce((s, item) => s + item.maxMarks, 0));
                          }}
                          className="w-16 rounded-md border border-slate-300 p-1 text-center font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </td>
                      <td className="p-3 font-semibold text-slate-600 dark:text-slate-300">
                        {q.suggestedConcept || 'General'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setQpReviewMode(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
              >
                Back
              </button>
              <button
                onClick={handleApplyQuestionPaper}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500"
              >
                <CheckCircle2 className="h-4 w-4" />
                Apply Questions to Assessment
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2B: REVIEW EXTRACTED ANSWER SHEET / MARKSHEET */}
        {reviewMode && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-indigo-50 p-3.5 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    Grading & Extraction Summary:
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Total Marks: {totalScore} / {assessment.maxMarks} (
                    {assessment.maxMarks > 0 ? Math.round((totalScore / assessment.maxMarks) * 100) : 0}%)
                  </p>
                  {detectedStudentName && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Detected Student Name: <strong>{detectedStudentName}</strong>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setReviewMode(false)}
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-400"
                >
                  <RefreshCw className="inline h-3.5 w-3.5 mr-1" />
                  Rescan Pages
                </button>
              </div>
            </div>

            {/* Questions Table */}
            <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="p-3">Q#</th>
                    <th className="p-3">Question / Concept</th>
                    <th className="p-3">Extracted Student Answer</th>
                    <th className="p-3">Score Awarded</th>
                    <th className="p-3">Remarks / Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reviewQuestions.map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {q.questionNumber}
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{q.prompt || 'Question'}</p>
                        <span className="text-[10px] text-slate-400">{q.conceptId}</span>
                      </td>
                      <td className="p-3 max-w-sm">
                        <textarea
                          rows={2}
                          value={q.studentAnswer || ''}
                          onChange={(e) =>
                            updateQuestionScore(idx, q.score, q.remarks || '', e.target.value)
                          }
                          className="w-full rounded-md border border-slate-200 p-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max={q.maxMarks}
                            value={q.score}
                            onChange={(e) =>
                              updateQuestionScore(
                                idx,
                                parseFloat(e.target.value) || 0,
                                q.remarks || '',
                                q.studentAnswer || ''
                              )
                            }
                            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-center font-bold text-slate-800 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <span className="text-slate-400">/ {q.maxMarks}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={q.remarks || ''}
                          placeholder="Feedback..."
                          onChange={(e) =>
                            updateQuestionScore(idx, q.score, e.target.value, q.studentAnswer || '')
                          }
                          className="w-full rounded-md border border-slate-200 p-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom confirmation */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Confirmed marks immediately update the student's learning gap analysis, concept map, and remedial lessons.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setReviewMode(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmAndSaveMarks}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm & Save Marks
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
