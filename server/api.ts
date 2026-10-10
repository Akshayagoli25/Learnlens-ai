import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import pptxgen from 'pptxgenjs';

export const apiRouter = express.Router();

// Middleware for parsing JSON with generous limit for base64 assessment images
apiRouter.use(express.json({ limit: '25mb' }));

// Initialize Gemini SDK with User-Agent as required by skill guidelines
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

/**
 * 1. SCAN ASSESSMENT (Multimodal Image Understanding)
 * Extracts student answers, marks obtained, question numbers, and teacher remarks.
 */
apiRouter.post('/assessments/scan', async (req: Request, res: Response) => {
  try {
    const { images, assessmentTitle, subject, questions, maxMarks } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: 'Please provide at least one assessment image (base64).',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Please verify environment settings or use manual mark entry.',
        fallbackAvailable: true,
      });
    }

    // Build multimodal image parts
    const imageParts = images.map((img: { data: string; mimeType?: string } | string) => {
      let base64Data = typeof img === 'string' ? img : img.data;
      let mimeType = (typeof img === 'object' && img.mimeType) ? img.mimeType : 'image/jpeg';

      // Clean prefix if present
      if (base64Data.startsWith('data:')) {
        const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      return {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };
    });

    const questionsContext = questions && Array.isArray(questions) && questions.length > 0
      ? `Expected assessment questions for reference:\n${JSON.stringify(questions, null, 2)}`
      : 'No predetermined questions provided; identify all visible question items.';

    const promptText = `
You are an expert educational assessment grader and document OCR analyzer for "LearnLens AI".
Analyze the attached scanned student assessment image(s) for the test: "${assessmentTitle || 'Assessment'}" (Subject: ${subject || 'General'}).
Total maximum marks: ${maxMarks || 'Variable'}.
${questionsContext}

CRITICAL RULES:
1. Examine handwritten and printed student answers, question numbers, teacher red-pen/scoring annotations, and checkboxes.
2. NEVER invent marks or pretend scanning succeeded if text is unreadable or blurry.
3. If an image is blurry or unclear, set "isClear": false and explain in "clarityFeedback".
4. For each detected question, extract:
   - questionNumber (e.g. "Q1", "1", "1(a)")
   - prompt (brief question summary or detected text)
   - studentAnswer (extracted student written response)
   - scoreAwarded (number, the marks given; 0 if unanswered or incorrect)
   - maxMarks (maximum possible marks for this question)
   - conceptTested (short topic or concept name, e.g. "Quadratic Equations")
   - remarks (teacher comments or feedback on the answer)
5. Calculate the totalScore (sum of scoreAwarded).
6. Detect student name if written on header, else set to null.
7. Return strictly valid JSON adhering to the schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [...imageParts, { text: promptText }],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isClear: { type: Type.BOOLEAN, description: 'True if image is legible and readable' },
            clarityFeedback: { type: Type.STRING, description: 'Notes on image quality and legibility' },
            detectedStudentName: { type: Type.STRING, description: 'Student name if detected on paper' },
            totalScore: { type: Type.NUMBER, description: 'Total marks awarded across all questions' },
            totalMaxMarks: { type: Type.NUMBER, description: 'Sum of maximum marks' },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  studentAnswer: { type: Type.STRING },
                  scoreAwarded: { type: Type.NUMBER },
                  maxMarks: { type: Type.NUMBER },
                  conceptTested: { type: Type.STRING },
                  remarks: { type: Type.STRING },
                },
                required: ['questionNumber', 'scoreAwarded', 'maxMarks'],
              },
            },
            generalNotes: { type: Type.STRING, description: 'Overall grading and scanning remarks' },
          },
          required: ['isClear', 'questions', 'totalScore'],
        },
      },
    });

    const resultText = response.text?.trim() || '{}';
    const parsed = JSON.parse(resultText);

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Error during assessment scanning:', error);
    return res.status(500).json({
      error: error.message || 'Failed to scan assessment image.',
      details: 'Ensure image is clear, upright, and properly lit.',
    });
  }
});

/**
 * 1B. SCAN QUESTION PAPER (Auto-Extract Questions & Max Marks from Question Paper)
 */
apiRouter.post('/assessments/scan-question-paper', async (req: Request, res: Response) => {
  try {
    const { images, subject } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one question paper image.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API is unavailable.' });
    }

    const imageParts = images.map((img: any) => {
      let base64Data = typeof img === 'string' ? img : img.data;
      let mimeType = (typeof img === 'object' && img.mimeType) ? img.mimeType : 'image/jpeg';
      if (base64Data.startsWith('data:')) {
        const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }
      return { inlineData: { mimeType, data: base64Data } };
    });

    const promptText = `
You are an expert OCR exam document parser for LearnLens AI.
Analyze this Question Paper image for Subject: "${subject || 'General'}".
Extract:
1. detectedTitle: Heading/Title of the test (e.g. "Midterm Mathematics Examination")
2. totalMaxMarks: Total possible marks for the entire paper
3. questions: List of every distinct question item:
   - questionNumber (e.g. "Q1", "1", "Section A - 1")
   - prompt: Full question text or detailed summary
   - maxMarks: Allocated maximum points for this question (number, default 5 if unspecified)
   - suggestedConcept: Short specific concept tested (e.g. "Quadratic Equations", "Newton's 2nd Law")
4. instructions: Any general exam instructions found on paper
5. isClear: boolean (whether the paper was legible)
Return strictly valid JSON.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [...imageParts, { text: promptText }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isClear: { type: Type.BOOLEAN },
            detectedTitle: { type: Type.STRING },
            totalMaxMarks: { type: Type.NUMBER },
            instructions: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  maxMarks: { type: Type.NUMBER },
                  suggestedConcept: { type: Type.STRING },
                },
                required: ['questionNumber', 'prompt', 'maxMarks'],
              },
            },
          },
          required: ['isClear', 'detectedTitle', 'questions', 'totalMaxMarks'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error scanning question paper:', error);
    return res.status(500).json({ error: error.message || 'Failed to scan question paper.' });
  }
});

/**
 * 1C. SCAN MARKSHEET / SCORE LEDGER (Extract scores from pre-graded test sheet or marksheet)
 */
apiRouter.post('/assessments/scan-marksheet', async (req: Request, res: Response) => {
  try {
    const { images, assessmentTitle } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one marksheet image.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API is unavailable.' });
    }

    const imageParts = images.map((img: any) => {
      let base64Data = typeof img === 'string' ? img : img.data;
      let mimeType = (typeof img === 'object' && img.mimeType) ? img.mimeType : 'image/jpeg';
      if (base64Data.startsWith('data:')) {
        const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }
      return { inlineData: { mimeType, data: base64Data } };
    });

    const promptText = `
You are an expert educational grading sheet and marksheet auditor for LearnLens AI.
Analyze this marksheet / score rubric image for test: "${assessmentTitle || 'Assessment'}".
Extract:
1. isClear: boolean
2. detectedStudentName: string (student name or null)
3. totalMarksObtained: number
4. totalMaxMarks: number
5. percentage: number
6. questionBreakdown: array of:
   - questionNumber: string (e.g. "Q1")
   - score: number
   - maxMarks: number
   - remarks: string
7. feedback: string
Return strictly valid JSON adhering to the schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [...imageParts, { text: promptText }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isClear: { type: Type.BOOLEAN },
            detectedStudentName: { type: Type.STRING },
            totalMarksObtained: { type: Type.NUMBER },
            totalMaxMarks: { type: Type.NUMBER },
            percentage: { type: Type.NUMBER },
            questionBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  maxMarks: { type: Type.NUMBER },
                  remarks: { type: Type.STRING },
                },
                required: ['questionNumber', 'score', 'maxMarks'],
              },
            },
            feedback: { type: Type.STRING },
          },
          required: ['isClear', 'totalMarksObtained', 'totalMaxMarks', 'questionBreakdown'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error scanning marksheet:', error);
    return res.status(500).json({ error: error.message || 'Failed to scan marksheet.' });
  }
});

/**
 * Parse any Gemini error (including stringified JSON errors returned by Google endpoints)
 */
function parseGeminiError(err: any): { isTransient: boolean; message: string; statusCode: number; rawSnippet: string } {
  let rawMsg = typeof err === 'string' ? err : (err?.message || String(err));
  let code = err?.status || err?.code || 500;
  let cleanMsg = rawMsg;

  // If the error message is a JSON string (e.g. {"error":{"code":503,"message":"This model is currently experiencing high demand..."}})
  try {
    if (typeof rawMsg === 'string' && rawMsg.trim().startsWith('{')) {
      const parsed = JSON.parse(rawMsg.trim());
      if (parsed?.error) {
        if (parsed.error.code) code = Number(parsed.error.code);
        if (parsed.error.message) cleanMsg = parsed.error.message;
        if (parsed.error.status === 'UNAVAILABLE' || parsed.error.status === 'RESOURCE_EXHAUSTED') {
          code = parsed.error.code || 503;
        }
      }
    }
  } catch {
    // Non-JSON string, use raw
  }

  const isTransient =
    code === 503 ||
    code === 429 ||
    rawMsg.includes('503') ||
    rawMsg.includes('429') ||
    rawMsg.includes('UNAVAILABLE') ||
    rawMsg.includes('RESOURCE_EXHAUSTED') ||
    rawMsg.includes('high demand') ||
    rawMsg.includes('spikes in demand') ||
    rawMsg.includes('overloaded');

  const friendlyMessage = isTransient
    ? 'The AI model is currently experiencing high demand. Spikes in demand are usually temporary. Please click "Retry Generation" or switch to the Manual Plan Builder.'
    : cleanMsg || 'Failed to communicate with AI service.';

  return {
    isTransient,
    message: friendlyMessage,
    statusCode: isTransient ? 503 : 500,
    rawSnippet: cleanMsg.slice(0, 150),
  };
}

/**
 * Helper: Call Gemini with exponential backoff retries for 503 and 429 errors.
 * Automatically tries fallback models (e.g. gemini-3.1-flash-lite) if primary model is experiencing high demand.
 * Maximum 3 retries per model, exponential backoff (1s, 2s, 4s + jitter).
 */
async function callGeminiWithRetry(
  ai: GoogleGenAI,
  preferredModels: string[],
  generateConfig: any,
  logContext: string
): Promise<{ text: string | undefined; modelUsed: string }> {
  const MAX_RETRIES = 3;
  let lastError: any = null;

  for (const modelName of preferredModels) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Gemini:${logContext}] Model "${modelName}" - Attempt ${attempt}/${MAX_RETRIES}...`);
        const start = Date.now();
        const response = await ai.models.generateContent({
          ...generateConfig,
          model: modelName,
        });
        const elapsed = Date.now() - start;
        console.log(`[Gemini:${logContext}] Model "${modelName}" generated successfully in ${elapsed}ms.`);
        return { text: response.text, modelUsed: modelName };
      } catch (err: any) {
        lastError = err;
        const parsed = parseGeminiError(err);

        console.warn(
          `[Gemini:${logContext}] Model "${modelName}" attempt ${attempt} failed (${parsed.statusCode}): ${parsed.rawSnippet}`
        );

        // If error is not transient, or we have exhausted the max retries for this model, try fallback model
        if (!parsed.isTransient || attempt === MAX_RETRIES) {
          console.warn(`[Gemini:${logContext}] Moving to next model candidate or completing attempts.`);
          break;
        }

        // Exponential backoff: 1000ms, 2000ms, 4000ms + random jitter (0-400ms)
        const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        const jitter = Math.floor(Math.random() * 400);
        const delay = baseDelay + jitter;
        console.log(`[Gemini:${logContext}] Temporary demand spike detected. Backing off ${delay}ms before attempt ${attempt + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * 2. GENERATE PERSONALIZED LESSON PLAN
 * Generates structured pedagogical lesson plan targeted at learning gaps.
 */
apiRouter.post('/lessons/generate', async (req: Request, res: Response) => {
  try {
    const {
      subject,
      topic,
      level = 'intermediate',
      duration = '45 minutes',
      learningGaps = [],
      studentName = 'Student Cohort',
      pace = 'standard',
      learningGoals = 'Master foundational concepts and improve problem-solving speed',
    } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and topic are required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini AI service is not configured on the server. Please use the Manual Plan Builder to draft and save lesson plans.',
        fallbackAvailable: true,
      });
    }

    const gapsDescription = learningGaps.length > 0
      ? `Specific learning gaps to address:\n- ${learningGaps.join('\n- ')}`
      : 'General mastery reinforcement.';

    // Safe server logging: pedagogical parameters only, no PII, no API keys
    console.log(`[LessonPlan] Request received: subject="${subject}", topic="${topic}", level="${level}", duration="${duration}", pace="${pace}"`);

    const promptText = `
You are a master pedagogical instructional designer for LearnLens AI.
Design a highly tailored, engaging, personalized lesson plan for:
- Subject: ${subject}
- Topic: ${topic}
- Target Audience/Student: ${studentName} (Pace: ${pace})
- Difficulty Level: ${level}
- Target Duration: ${duration}
- Target Goals: ${learningGoals}
${gapsDescription}

Produce a complete, structured curriculum plan with:
1. title: Engaging, clear lesson title
2. overview: Concise 2-sentence summary
3. estimatedTime: ${duration}
4. learningObjectives: List of 3-4 clear, measurable objectives (Bloom's taxonomy)
5. prerequisiteConcepts: List of concepts student must know beforehand
6. explanation: Deep, accessible explanation broken down with analogies and step-by-step logic
7. realWorldExamples: 2-3 relatable, real-world examples showing why this concept matters
8. activities: 2-3 engaging student activities or exercises
9. practiceQuestions: 3-4 assessment questions with question, answer, and comprehensive explanation
10. teacherNotes: Practical tips for differentiated instruction and addressing common misconceptions
`;

    // Attempt generation with retry across supported models: flagship flash and ultra-fast flash-lite
    const { text, modelUsed } = await callGeminiWithRetry(
      ai,
      ['gemini-3.8-flash', 'gemini-3.1-flash-lite'],
      {
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              overview: { type: Type.STRING },
              estimatedTime: { type: Type.STRING },
              learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
              prerequisiteConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
              explanation: { type: Type.STRING },
              realWorldExamples: { type: Type.ARRAY, items: { type: Type.STRING } },
              activities: { type: Type.ARRAY, items: { type: Type.STRING } },
              practiceQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['question', 'answer', 'explanation'],
                },
              },
              teacherNotes: { type: Type.STRING },
            },
            required: [
              'title',
              'overview',
              'estimatedTime',
              'learningObjectives',
              'explanation',
              'practiceQuestions',
            ],
          },
        },
      },
      `LessonPlan:${topic.slice(0, 25)}`
    );

    const parsed = JSON.parse(text?.trim() || '{}');
    console.log(`[LessonPlan] Successfully generated lesson plan "${parsed.title}" using ${modelUsed}`);

    return res.json({ success: true, data: parsed, modelUsed });
  } catch (error: any) {
    const { isTransient, message, statusCode, rawSnippet } = parseGeminiError(error);
    console.error(`[LessonPlan] Generation failed (Status ${statusCode}): ${rawSnippet}`);

    return res.status(statusCode).json({
      error: message,
      isOverloaded: isTransient,
      canRetry: true,
      fallbackAvailable: true,
    });
  }
});

/**
 * 3. GENERATE LEARNING RESOURCES (Notes, Summaries, Quizzes, Worksheets)
 */
apiRouter.post('/resources/generate', async (req: Request, res: Response) => {
  try {
    const { type, subject, topic, conceptNames = [], targetLevel = 'intermediate' } = req.body;

    if (!type || !subject || !topic) {
      return res.status(400).json({ error: 'Type, subject, and topic are required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini service is unavailable.' });
    }

    const promptText = `
Create an educational resource for LearnLens AI.
Type: ${type} (Options: 'notes', 'summary', 'worksheet', 'quiz', 'presentation_outline')
Subject: ${subject}
Topic: ${topic}
Level: ${targetLevel}
Concepts Covered: ${conceptNames.join(', ') || topic}

Generate comprehensive, student-friendly content tailored specifically to this type:
- If 'quiz': provide 5 multiple-choice or short-answer questions with options, correct answer, points, and step-by-step explanations.
- If 'notes' or 'summary': clear markdown headings, bulleted takeaways, key formulas/definitions, and common pitfalls.
- If 'worksheet': structured practice problems with increasing difficulty (Levels 1 to 3) and solution keys.
- If 'presentation_outline': 5-7 distinct slides with slideTitle, bulletPoints (3-4 points), and speakerNotes.
`;

    const { text, modelUsed } = await callGeminiWithRetry(
      ai,
      ['gemini-3.8-flash', 'gemini-3.1-flash-lite'],
      {
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              markdownContent: { type: Type.STRING, description: 'Formatted lesson notes or worksheet content' },
              quizQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['mcq', 'short_answer'] },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    points: { type: Type.NUMBER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['question', 'correctAnswer', 'explanation'],
                },
              },
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    slideTitle: { type: Type.STRING },
                    bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                    speakerNotes: { type: Type.STRING },
                  },
                  required: ['slideTitle', 'bulletPoints'],
                },
              },
            },
            required: ['title', 'summary', 'markdownContent'],
          },
        },
      },
      `Resource:${type}:${topic.slice(0, 20)}`
    );

    const parsed = JSON.parse(text?.trim() || '{}');
    return res.json({ success: true, data: parsed, modelUsed });
  } catch (error: any) {
    const { isTransient, message, statusCode, rawSnippet } = parseGeminiError(error);
    console.error(`[Resources] Failed to generate resource (Status ${statusCode}): ${rawSnippet}`);
    return res.status(statusCode).json({
      error: message,
      isOverloaded: isTransient,
      canRetry: true,
      fallbackAvailable: true,
    });
  }
});

/**
 * 4. GENERATE REAL PPTX DOWNLOAD USING PPTXGENJS
 * Produces genuine, downloadable Microsoft PowerPoint file (.pptx)
 */
apiRouter.post('/generate-pptx', async (req: Request, res: Response) => {
  try {
    const { title, subject, topic, author = 'LearnLens AI', slides = [] } = req.body;

    const pres = new pptxgen();
    pres.title = title || 'LearnLens AI Presentation';
    pres.author = author;
    pres.company = 'LearnLens AI Academy';
    pres.layout = 'LAYOUT_16x9';

    // Slide 1: Cover Title Slide
    const coverSlide = pres.addSlide();
    coverSlide.background = { color: '0F172A' }; // Dark slate

    coverSlide.addText(title || `${topic} - Learning Presentation`, {
      x: 1.0,
      y: 1.8,
      w: 8.0,
      h: 1.5,
      fontSize: 36,
      bold: true,
      color: '38BDF8', // Sky blue
      align: 'left',
    });

    coverSlide.addText(`${subject ? `${subject} • ` : ''}Personalized Learning Resource`, {
      x: 1.0,
      y: 3.3,
      w: 8.0,
      h: 0.6,
      fontSize: 20,
      color: 'E2E8F0',
      align: 'left',
    });

    coverSlide.addText(`Generated by LearnLens AI • Prepared for Students and Educators`, {
      x: 1.0,
      y: 4.8,
      w: 8.0,
      h: 0.4,
      fontSize: 12,
      color: '94A3B8',
      align: 'left',
    });

    // Add content slides
    if (slides && Array.isArray(slides) && slides.length > 0) {
      slides.forEach((s: any, idx: number) => {
        const slide = pres.addSlide();
        slide.background = { color: 'F8FAFC' }; // Soft light background

        // Header banner
        slide.addShape(pres.ShapeType.rect, {
          x: 0,
          y: 0,
          w: '100%',
          h: 0.9,
          fill: { color: '1E293B' },
        });

        slide.addText(s.slideTitle || `Slide ${idx + 1}`, {
          x: 0.8,
          y: 0.15,
          w: 8.4,
          h: 0.6,
          fontSize: 22,
          bold: true,
          color: 'FFFFFF',
        });

        // Bullet points
        if (s.bulletPoints && Array.isArray(s.bulletPoints)) {
          const bulletItems = s.bulletPoints.map((pt: string) => ({
            text: pt,
            options: { bullet: true, fontSize: 16, color: '334155', breakLine: true },
          }));

          slide.addText(bulletItems, {
            x: 0.8,
            y: 1.3,
            w: 8.4,
            h: 3.5,
            lineSpacing: 28,
            valign: 'top',
          });
        }

        // Speaker notes
        if (s.speakerNotes) {
          slide.addNotes(s.speakerNotes);
        }

        // Footer
        slide.addText('LearnLens AI • Personalized Learning Platform', {
          x: 0.8,
          y: 5.1,
          w: 8.4,
          h: 0.3,
          fontSize: 10,
          color: '94A3B8',
        });
      });
    } else {
      // Default slides if none provided
      const s2 = pres.addSlide();
      s2.addText('Learning Objectives', { x: 0.8, y: 0.5, fontSize: 24, bold: true, color: '0F172A' });
      s2.addText([
        { text: `Understand foundational principles of ${topic}`, options: { bullet: true } },
        { text: 'Analyze key problem-solving techniques and real examples', options: { bullet: true } },
        { text: 'Identify and resolve personal learning misconceptions', options: { bullet: true } },
      ], { x: 0.8, y: 1.5, w: 8.0, h: 3.0, fontSize: 18, color: '334155' });
    }

    // Generate PPTX as base64 or buffer
    const buffer = await pres.write({ outputType: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(topic || 'presentation')}.pptx"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Error creating PPTX file:', error);
    res.status(500).json({ error: error.message || 'Failed to generate presentation file.' });
  }
});

/**
 * 6. TEACHER COPILOT - CHAT ASSISTANT
 * Real-time instructional assistant for pedagogy, differentiated strategies, and classroom management.
 */
apiRouter.post('/copilot/chat', async (req: Request, res: Response) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API is not configured on this server.' });
    }

    const contextSummary = context
      ? `[Current Teacher Context: Subject="${context.subject || 'General'}", Topic="${context.topic || 'General'}", Grade="${context.gradeLevel || 'Standard'}", Student/Class="${context.studentName || context.className || 'General Class'}", Focus Gaps="${(context.weakConcepts || []).join(', ')}"]`
      : '';

    const formattedHistory = messages.map((m: any) => `${m.role === 'user' ? 'Teacher' : 'Copilot'}: ${m.content}`).join('\n\n');

    const promptText = `You are "LearnLens Teacher Copilot", an elite Instructional Coach and Curriculum Specialist AI.
Your mission is to empower teachers with evidence-based pedagogy, differentiated instructional strategies, formative check questions, scaffolding techniques, and constructive feedback.
Keep your responses well-structured using markdown (bold headings, bullet points, clean tables where helpful).
Be encouraging, practical, and time-saving for busy educators.

${contextSummary}

Conversation:
${formattedHistory}

Teacher Copilot:`;

    const { text, modelUsed } = await callGeminiWithRetry(
      ai,
      ['gemini-3.8-flash', 'gemini-3.1-flash-lite'],
      {
        contents: promptText,
        config: {
          systemInstruction: 'You are LearnLens Teacher Copilot. Provide practical, high-impact instructional guidance for educators. Always end with 2-3 brief suggested follow-up questions labeled [SUGGESTIONS].',
          temperature: 0.7,
        },
      },
      'Teacher Copilot Chat'
    );

    // Extract suggested next questions if provided
    const safeText = text || '';
    let cleanReply = safeText;
    let suggestions: string[] = [
      'Generate a 5-minute exit ticket for this topic',
      'Create tiered homework (Mild, Medium, Spicy)',
      'Explain common student misconceptions & analogies',
    ];

    if (safeText.includes('[SUGGESTIONS]')) {
      const parts = safeText.split('[SUGGESTIONS]');
      cleanReply = parts[0].trim();
      const rawSugg = parts[1].trim().split('\n').map(s => s.replace(/^[-*•\d.]\s*/, '').trim()).filter(Boolean);
      if (rawSugg.length > 0) {
        suggestions = rawSugg.slice(0, 3);
      }
    }

    res.json({
      reply: cleanReply,
      suggestions,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const parsed = parseGeminiError(error);
    console.error('Teacher Copilot error:', parsed.message);
    res.status(parsed.statusCode).json({
      error: parsed.message,
      isTransient: parsed.isTransient,
    });
  }
});

/**
 * 7. TEACHER COPILOT - SPECIALIZED TOOLS
 * Instant generators: exit tickets, rubrics, tiered homework, misconceptions, parent emails, bell ringers.
 */
apiRouter.post('/copilot/tool', async (req: Request, res: Response) => {
  try {
    const { toolType, params } = req.body;
    const { subject = 'General', topic = 'Key Concept', gradeLevel = 'Grade 10', studentName = '', specificGaps = [] } = params || {};

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API is not configured on this server.' });
    }

    let promptText = '';
    if (toolType === 'exit_ticket') {
      promptText = `Create a 3-question formative Exit Ticket for ${gradeLevel} students on the topic "${topic}" in ${subject}.
Include:
1. Question 1: Foundational Recall / Concept Check (low difficulty)
2. Question 2: Application / Problem Solving (medium difficulty)
3. Question 3: Metacognitive Reflection ("What is still confusing, or explain in your own words")
Provide the exact question prompt, expected correct answer / scoring criteria, and teacher grading tip.`;
    } else if (toolType === 'rubric') {
      promptText = `Create a 4-level grading rubric for an assessment or project on "${topic}" in ${subject} (${gradeLevel}).
Include 4 criteria (e.g., Conceptual Understanding, Mathematical/Scientific Reasoning, Application & Accuracy, Clarity of Communication).
For each criterion, provide detailed descriptor for:
- Exemplary (Score 4)
- Proficient (Score 3)
- Developing (Score 2)
- Beginning (Score 1)`;
    } else if (toolType === 'homework') {
      promptText = `Generate a Differentiated 3-Tier Homework Sheet for "${topic}" in ${subject} (${gradeLevel}).
- Tier 1 (Mild / Scaffolding): 2 approachable practice problems with hints for struggling learners.
- Tier 2 (Medium / Grade-Level): 2 standard problems requiring independent problem-solving.
- Tier 3 (Spicy / Extension): 1 challenging real-world multi-step problem for advanced learners.
Provide full step-by-step solutions and answer keys for each tier.`;
    } else if (toolType === 'misconception') {
      promptText = `Analyze common student misconceptions in "${topic}" (${subject}, ${gradeLevel}).
Specific identified gap areas: ${specificGaps.join(', ') || 'General confusion'}.
Identify:
1. Top 3 common student misconceptions and why students fall into these cognitive traps.
2. Concrete analogies, visual representations, or hands-on demonstrations to disprove the misconception.
3. Quick diagnostic check question to confirm the student has overcome the misconception.`;
    } else if (toolType === 'parent_note') {
      promptText = `Draft a compassionate, professional progress update email to a parent regarding student "${studentName || 'Student'}" in ${subject} (${topic}).
The student has learning gaps in: ${specificGaps.join(', ') || 'foundational concepts'}.
The email must:
1. Highlight positive effort and strengths first.
2. Clearly explain the current area where extra practice is needed without negative jargon.
3. Offer 2 specific, 10-minute activities the parent can do at home to support the child.
4. Conclude warmly and invite open communication.`;
    } else if (toolType === 'bell_ringer') {
      promptText = `Create 3 engaging Bell Ringer / Hook activities (3-5 minutes each) to open a class on "${topic}" in ${subject} (${gradeLevel}).
- Option 1: Intriguing "Would You Rather" or real-world dilemma related to the topic.
- Option 2: Spot the deliberate error in a sample calculation / diagram.
- Option 3: Quick mystery question or visual curiosity spark.`;
    } else {
      return res.status(400).json({ error: `Unknown toolType: ${toolType}` });
    }

    const { text, modelUsed } = await callGeminiWithRetry(
      ai,
      ['gemini-3.8-flash', 'gemini-3.1-flash-lite'],
      {
        contents: promptText,
        config: {
          systemInstruction: 'You are LearnLens Teacher Copilot. Generate structured, highly actionable educational material in clean Markdown.',
          temperature: 0.7,
        },
      },
      `Teacher Copilot Tool: ${toolType}`
    );

    res.json({
      toolType,
      result: text,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const parsed = parseGeminiError(error);
    console.error('Teacher Copilot tool error:', parsed.message);
    res.status(parsed.statusCode).json({
      error: parsed.message,
      isTransient: parsed.isTransient,
    });
  }
});

/**
 * 8. STUDENT AI SOCRATIC TUTOR ("Lensy")
 * Patient, Socratic tutor that guides students step-by-step without giving out direct test answers.
 */
apiRouter.post('/student/tutor', async (req: Request, res: Response) => {
  try {
    const { messages, conceptName, subject, questionPrompt } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API is not configured on this server.' });
    }

    const tutorSystemInstruction = `You are "Lensy", a friendly, encouraging, and patient AI Study Buddy for students in LearnLens.
YOUR PEDAGOGICAL RULES:
1. Use the SOCRATIC METHOD. Never give away the final answer directly to a test or homework problem immediately!
2. Instead, guide the student step-by-step: ask what they know so far, give intuitive hints, suggest analogies, or break the problem into smaller bite-sized steps.
3. If the student is frustrated, provide an easier similar example, solve THAT example together, and then ask them to apply it to their original question.
4. Keep explanations clear, fun, and easy to understand (use emojis appropriately ✨ 💡 🎯).
5. Celebrate every small step of effort and progress!
${conceptName ? `Target Concept: ${conceptName}` : ''}
${subject ? `Subject: ${subject}` : ''}
${questionPrompt ? `Current Exercise Context: "${questionPrompt}"` : ''}`;

    const formattedHistory = messages.map((m: any) => `${m.role === 'user' ? 'Student' : 'Lensy'}: ${m.content}`).join('\n\n');

    const promptText = `${formattedHistory}\n\nLensy:`;

    const { text, modelUsed } = await callGeminiWithRetry(
      ai,
      ['gemini-3.8-flash', 'gemini-3.1-flash-lite'],
      {
        contents: promptText,
        config: {
          systemInstruction: tutorSystemInstruction,
          temperature: 0.7,
        },
      },
      'Student Socratic Tutor'
    );

    res.json({
      reply: text,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const parsed = parseGeminiError(error);
    console.error('Student Tutor error:', parsed.message);
    res.status(parsed.statusCode).json({
      error: parsed.message,
      isTransient: parsed.isTransient,
    });
  }
});
