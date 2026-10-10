import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  Ticket,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  Mail,
  Bell,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Download,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  User,
  GraduationCap,
  Sparkle,
} from 'lucide-react';
import { Subject, SchoolClass, UserProfile, Concept, CopilotMessage, CopilotToolType } from '../types';

interface TeacherCopilotProps {
  subjects: Subject[];
  concepts: Concept[];
  classes: SchoolClass[];
  students: UserProfile[];
  onNavigateToLessonPlan?: (prefill: { subject: Subject; topic: string; notes?: string }) => void;
  onNavigateToResources?: () => void;
}

export const TeacherCopilot: React.FC<TeacherCopilotProps> = ({
  subjects,
  concepts,
  classes,
  students,
  onNavigateToLessonPlan,
}) => {
  // Context state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [topicInput, setTopicInput] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<string>('Grade 10');

  // Active view: 'chat' | 'tools'
  const [activeTab, setActiveTab] = useState<'chat' | 'tools'>('chat');
  const [activeTool, setActiveTool] = useState<CopilotToolType>('exit_ticket');
  const [toolLoading, setToolLoading] = useState(false);
  const [toolResult, setToolResult] = useState<string | null>(null);

  // Chat conversation state
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### 👋 Welcome to LearnLens Teacher Copilot!\nI am your AI Instructional Coach & Pedagogical Specialist powered by **Gemini 3.8 Flash**.\n\nHere is how I can assist you today:\n* 🎯 **Differentiated Lesson Strategies** & Scaffolding for diverse learners.\n* 🎫 **Instant Exit Tickets** & Formative Assessment questions.\n* 📊 **4-Level Rubrics** aligned with Bloom's Taxonomy.\n* 🔍 **Misconception Diagnosis** and concrete analogies to dispel learning confusion.\n* ✉️ **Compassionate Parent Progress Letters** tailored to student needs.\n\nSelect a subject and topic above, or ask me any pedagogical question below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        'How can I introduce Quadratic Equations with a real-world hook?',
        'Suggest 3 scaffolding interventions for struggling algebra students',
        'Create a 5-minute exit ticket checking understanding of factoring',
      ],
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const currentStudent = students.find((st) => st.id === selectedStudentId);

  // Send conversational chat message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isSending) return;

    setErrorMessage(null);
    setInputMessage('');

    const userMsg: CopilotMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsSending(true);

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          context: {
            subject: currentSubject?.name || 'General',
            topic: topicInput || 'Curriculum',
            gradeLevel,
            studentName: currentStudent?.name || '',
            weakConcepts: [],
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data.suggestions || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Copilot send error:', err);
      setErrorMessage(
        err.message || 'Unable to connect to Teacher Copilot. Please check your network and retry.'
      );
    } finally {
      setIsSending(false);
    }
  };

  // Run a specialized 1-click teacher tool
  const handleRunTool = async (type: CopilotToolType) => {
    setActiveTool(type);
    setToolLoading(true);
    setToolResult(null);
    setErrorMessage(null);

    const subjectName = currentSubject?.name || 'Mathematics';
    const topic = topicInput || 'Quadratic Equations & Graphing';

    try {
      const response = await fetch('/api/copilot/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType: type,
          params: {
            subject: subjectName,
            topic,
            gradeLevel,
            studentName: currentStudent?.name || 'Alex Morgan',
            specificGaps: [topic],
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed with status ${response.status}`);
      }

      const data = await response.json();
      setToolResult(data.result);
    } catch (err: any) {
      console.error('Error running copilot tool:', err);
      setErrorMessage(err.message || 'Failed to generate tool output. Please try again.');
    } finally {
      setToolLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendToLessonPlan = (contentSnippet: string) => {
    if (onNavigateToLessonPlan && currentSubject) {
      onNavigateToLessonPlan({
        subject: currentSubject,
        topic: topicInput || 'Differentiated Lesson Focus',
        notes: contentSnippet,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>AI Pedagogical Assistant • Gemini 3.8 Flash</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Teacher Copilot
            </h1>
            <p className="mt-1 text-sm text-indigo-100 max-w-2xl">
              Your real-time instructional coach for instant lesson differentiation, Bloom's rubrics, formative exit tickets, and diagnostic misconceptions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                activeTab === 'chat'
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Interactive Chat
            </button>
            <button
              onClick={() => {
                setActiveTab('tools');
                if (!toolResult) handleRunTool('exit_ticket');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                activeTab === 'tools'
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Lightbulb className="h-4 w-4" />
              1-Click Teaching Tools
            </button>
          </div>
        </div>
      </div>

      {/* Context Filters Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <BookOpen className="h-4 w-4 text-indigo-600" />
          <span>Classroom Context (Grounds Copilot Responses)</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Current Topic / Standard
            </label>
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="e.g. Quadratic Equations, Photosynthesis"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Grade / Level
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="Grade 8">Grade 8 (Middle School)</option>
              <option value="Grade 9">Grade 9 (Freshman)</option>
              <option value="Grade 10">Grade 10 (Sophomore)</option>
              <option value="Grade 11">Grade 11 (Junior / AP)</option>
              <option value="Grade 12">Grade 12 (Senior / College Prep)</option>
              <option value="Higher Education">College / Undergraduate</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Focus Student (Optional)
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Whole Class</option>
              {students
                .filter((st) => st.role === 'student')
                .map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.email})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Teacher Copilot Notice</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white shadow-sm hover:bg-rose-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* TAB 1: INTERACTIVE CHAT */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[650px] rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                      isAssistant
                        ? 'bg-gradient-to-tr from-indigo-600 to-sky-500'
                        : 'bg-slate-700 dark:bg-slate-600'
                    }`}
                  >
                    {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div
                    className={`flex max-w-[85%] flex-col rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                      isAssistant
                        ? 'border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-black/5 dark:border-white/5">
                      <span className="font-bold text-[11px] opacity-90">
                        {isAssistant ? 'LearnLens Teacher Copilot' : 'You'}
                      </span>
                      <span className="text-[10px] opacity-60">{msg.timestamp}</span>
                    </div>

                    <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap font-sans text-xs">
                      {msg.content}
                    </div>

                    {/* Action buttons for assistant responses */}
                    {isAssistant && msg.id !== 'welcome' && (
                      <div className="mt-3 pt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 dark:border-slate-700/60">
                        <button
                          onClick={() => handleCopyText(msg.content, msg.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </button>

                        {onNavigateToLessonPlan && (
                          <button
                            onClick={() => handleSendToLessonPlan(msg.content)}
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                          >
                            <BookOpen className="h-3 w-3" />
                            Send to AI Lesson Plan
                          </button>
                        )}
                      </div>
                    )}

                    {/* Suggestions chips */}
                    {isAssistant && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Suggested follow-up questions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestions.map((sugg, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(sugg)}
                              className="text-left rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-indigo-600 border border-indigo-100 shadow-2xs hover:bg-indigo-50 dark:bg-slate-700 dark:border-slate-600 dark:text-indigo-300 dark:hover:bg-slate-600"
                            >
                              💡 {sugg}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-sm">
                  <Bot className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.2s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px] font-medium">Copilot is formulating pedagogical insights...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask Teacher Copilot anything (e.g. 'How do I differentiate this lesson for EL learners?')"
                disabled={isSending}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: 1-CLICK TEACHING TOOLS */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Tool Selector Menu */}
          <div className="space-y-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="block px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Instructional Generators
              </span>

              <div className="space-y-1.5">
                {[
                  {
                    id: 'exit_ticket' as CopilotToolType,
                    name: 'Exit Ticket Generator',
                    desc: '3-question formative check (recall, application, reflection)',
                    icon: Ticket,
                    badge: 'Popular',
                  },
                  {
                    id: 'rubric' as CopilotToolType,
                    name: 'Bloom\'s Rubric Maker',
                    desc: '4-level grading matrix with performance criteria',
                    icon: Layers,
                  },
                  {
                    id: 'homework' as CopilotToolType,
                    name: 'Tiered Homework Sheet',
                    desc: 'Differentiated practice: Mild, Medium, Spicy',
                    icon: BookOpen,
                  },
                  {
                    id: 'misconception' as CopilotToolType,
                    name: 'Misconception Diagnoser',
                    desc: 'Identify confusion points & concrete analogies to fix them',
                    icon: HelpCircle,
                  },
                  {
                    id: 'parent_note' as CopilotToolType,
                    name: 'Parent Progress Email',
                    desc: 'Constructive, supportive home-school communication',
                    icon: Mail,
                  },
                  {
                    id: 'bell_ringer' as CopilotToolType,
                    name: 'Bell Ringer / Hook Starters',
                    desc: '3 high-engagement class opening scenarios',
                    icon: Bell,
                  },
                ].map((tool) => {
                  const Icon = tool.icon;
                  const isCurrent = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleRunTool(tool.id)}
                      className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                        isCurrent
                          ? 'bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isCurrent
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold ${isCurrent ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {tool.name}
                          </p>
                          {tool.badge && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                              {tool.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {tool.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tool Result Viewer */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                    {activeTool.replace('_', ' ')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Target: {currentSubject?.name || 'Subject'} • {topicInput || 'Key Topic'} • {gradeLevel}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunTool(activeTool)}
                    disabled={toolLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${toolLoading ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>

                  {toolResult && (
                    <button
                      onClick={() => handleCopyText(toolResult, 'tool_result')}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                      {copiedId === 'tool_result' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Output
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 py-4">
                {toolLoading ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
                    <p className="text-xs font-semibold text-slate-500">
                      Generating pedagogical material with Gemini 3.8 Flash...
                    </p>
                  </div>
                ) : toolResult ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-sans text-xs leading-relaxed bg-slate-50 rounded-xl p-5 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
                    {toolResult}
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
                    <Lightbulb className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-medium">Select any tool on the left to generate customized content.</p>
                  </div>
                )}
              </div>

              {toolResult && onNavigateToLessonPlan && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleSendToLessonPlan(toolResult)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                  >
                    <BookOpen className="h-4 w-4" />
                    Use as Foundation in AI Lesson Plan Generator
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
