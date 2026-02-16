"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, firebaseAuth, db, firestoreHelpers } from "../../../lib/firebase";

export default function TakeInterviewExamPage() {
  const router = useRouter();
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [timeLeftMs, setTimeLeftMs] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviewMap, setReviewMap] = useState({});
  const [showPanel, setShowPanel] = useState(false);
  const [section, setSection] = useState("mcq"); // mcq | descriptive | coding
  const [activeSection, setActiveSection] = useState("All");
  const [started, setStarted] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [userId, setUserId] = useState(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [codeLanguages, setCodeLanguages] = useState({});
  const [runResults, setRunResults] = useState({});
  const [runLoading, setRunLoading] = useState({});
  const [lastRunAtMap, setLastRunAtMap] = useState({});
  const timerRef = useRef(null);
  const [showResults, setShowResults] = useState(false);
  const [examResults, setExamResults] = useState(null);
  const resultsTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const [countdown, setCountdown] = useState(10);
  const [processing, setProcessing] = useState(false);
  const [processingCountdown, setProcessingCountdown] = useState(10);
  const processingIntervalRef = useRef(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const visibilityChangeRef = useRef(null);
  const tabSwitchCountRef = useRef(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const fullscreenReenterRef = useRef(null);
  const [showSectionTransition, setShowSectionTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const ref = firestoreHelpers.doc(db, "interviewExams", String(examId));
        const snap = await firestoreHelpers.getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setExam({ id: snap.id, ...data });
          // Choose default section based on available questions
          const hasMcq = (data.questions || []).some((q) => q?.type === "mcq");
          const hasDesc = (data.questions || []).some((q) => q?.type === "descriptive");
          const hasCoding = (data.questions || []).some((q) => q?.type === "coding");
          if (hasMcq) setSection("mcq");
          else if (hasDesc) setSection("descriptive");
          else if (hasCoding) setSection("coding");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [examId]);

  useEffect(() => {
    return firebaseAuth.onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
  }, []);

  const checkBlockStatus = useCallback(async (phoneDigits) => {
    if (!examId) return { blocked: false };
    try {
      const blocksCol = firestoreHelpers.collection(db, "interviewExams", String(examId), "blocks");
      const qBlock = firestoreHelpers.query(blocksCol, firestoreHelpers.where("phone", "==", phoneDigits));
      const blockSnap = await firestoreHelpers.getDocs(qBlock);
      if (!blockSnap.empty) {
        const blockData = blockSnap.docs[0].data();
        if (blockData?.blocked === true) {
          return {
            blocked: true,
            reason: blockData?.reason || "Exam blocked due to multiple tab switches",
            blockId: blockSnap.docs[0].id,
          };
        }
      }
      return { blocked: false };
    } catch (e) {
      return { blocked: false };
    }
  }, [examId]);

  // Check block status when phone number is entered
  useEffect(() => {
    async function checkBlock() {
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length >= 10 && examId) {
        const blockStatus = await checkBlockStatus(phoneDigits);
        if (blockStatus.blocked) {
          setIsBlocked(true);
          setBlockReason(blockStatus.reason || "Exam blocked due to multiple tab switches");
        } else {
          setIsBlocked(false);
          setBlockReason("");
        }
      } else {
        setIsBlocked(false);
        setBlockReason("");
      }
    }
    checkBlock();
  }, [phone, examId, checkBlockStatus]);

  const formatTime = (ms) => {
    if (ms == null) return null;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (h > 0) {
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${m}:${pad(s)}`;
  };

  const downloadScorecard = () => {
    if (!examResults) return;
    
    // Create a printable HTML content for the scorecard
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Exam Scorecard - ${exam?.title || 'Interview Exam'}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 700px;
              margin: 0 auto;
              padding: 20px;
              background: linear-gradient(to bottom, #f0f9ff, #e0f2fe);
              min-height: 100vh;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              color: #0c4a6e;
              margin: 0;
              font-size: 24px;
              font-weight: bold;
            }
            .header p {
              color: #64748b;
              margin: 3px 0;
              font-size: 14px;
            }
            .score-card {
              background: linear-gradient(to right, #06b6d4 0%, #3b82f6 100%);
              color: white;
              padding: 25px;
              border-radius: 12px;
              text-align: center;
              margin-bottom: 20px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }
            .score-card h2 {
              margin: 0 0 10px 0;
              font-size: 12px;
              opacity: 0.9;
              font-weight: 500;
            }
            .score-card .total-score {
              font-size: 48px;
              font-weight: bold;
              margin: 10px 0 5px 0;
            }
            .score-card .max-score {
              font-size: 24px;
              opacity: 0.8;
              font-weight: 600;
            }
            .score-card .percentage {
              display: inline-block;
              background: rgba(255,255,255,0.2);
              padding: 8px 16px;
              border-radius: 20px;
              margin-top: 15px;
              font-size: 18px;
              font-weight: bold;
            }
            .breakdown {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            @media (max-width: 640px) {
              .breakdown {
                grid-template-columns: 1fr;
                gap: 12px;
              }
            }
            .section-card {
              background: white;
              padding: 18px;
              border-radius: 10px;
              border: 2px solid #e2e8f0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .section-card.mcq {
              border-color: #10b981;
            }
            .section-card.coding {
              border-color: #3b82f6;
            }
            .section-card h3 {
              margin: 0 0 12px 0;
              color: #1e293b;
              font-size: 14px;
              font-weight: bold;
            }
            .section-card .score {
              font-size: 32px;
              font-weight: bold;
              color: #0f172a;
              margin-bottom: 5px;
            }
            .section-card .max {
              color: #64748b;
              font-size: 16px;
            }
            .section-card .details {
              color: #64748b;
              font-size: 12px;
              margin-top: 8px;
            }
            .performance {
              background: white;
              padding: 14px 16px;
              border-radius: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              border-top: 2px solid #e2e8f0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .performance-label {
              color: #475569;
              font-weight: 500;
              font-size: 13px;
            }
            .performance-value {
              font-weight: bold;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              color: #64748b;
              font-size: 11px;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1px solid #e2e8f0;
            }
            .candidate-info {
              background: white;
              padding: 15px;
              border-radius: 10px;
              margin-bottom: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .candidate-info p {
              margin: 4px 0;
              color: #475569;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${exam?.title || 'Interview Exam'}</h1>
            <p>Scorecard</p>
          </div>
          
          <div class="candidate-info">
            <p><strong>Name:</strong> ${fullName || 'N/A'}</p>
            <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="score-card">
            <h2>Total Score</h2>
            <div class="total-score">${examResults.totalScore.toFixed(1)}</div>
            <div class="max-score">/ ${examResults.maxTotalScore}</div>
            <div class="percentage">${examResults.percentage}%</div>
          </div>
          
          <div class="breakdown">
            <div class="section-card mcq">
              <h3>MCQ Section</h3>
              <div class="score">${examResults.mcqScore.score}</div>
              <div class="max">/ ${examResults.mcqScore.total}</div>
              <div class="details">${examResults.mcqScore.correct} correct out of ${examResults.mcqScore.total} questions</div>
            </div>
            <div class="section-card coding">
              <h3>Coding Section</h3>
              <div class="score">${examResults.codingScore.toFixed(1)}</div>
              <div class="max">/ ${examResults.maxCodingScore}</div>
              <div class="details">Based on test case results</div>
            </div>
          </div>
          
          ${examResults.mcqSectionScores && Object.keys(examResults.mcqSectionScores).length > 0 ? `
          <div style="margin-bottom: 20px; page-break-inside: avoid;">
            <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px; font-weight: bold;">MCQ Section - Section-wise Results</h3>
            ${Object.entries(examResults.mcqSectionScores).map(([sectionName, sectionData]) => `
              <div style="background: white; padding: 15px; border-radius: 12px; border: 2px solid #10b981; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <strong style="color: #1e293b;">${sectionName}</strong>
                  <span style="color: #64748b; font-size: 14px;">${sectionData.correct}/${sectionData.total} correct</span>
                </div>
                <div style="font-size: 24px; font-weight: bold; color: #10b981;">${sectionData.score} / ${sectionData.total}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${examResults.codingQuestionDetails && examResults.codingQuestionDetails.length > 0 ? `
          <div style="margin-bottom: 20px; page-break-inside: avoid;">
            <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px; font-weight: bold;">Coding Section - Test Case Results</h3>
            ${examResults.codingQuestionDetails.map((qDetail) => `
              <div style="background: white; padding: 15px; border-radius: 12px; border: 2px solid #3b82f6; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <strong style="color: #1e293b;">Question ${qDetail.questionNumber}</strong>
                  <span style="color: ${qDetail.totalTests > 0 && qDetail.passCount === qDetail.totalTests ? '#10b981' : qDetail.totalTests > 0 && qDetail.passCount > 0 ? '#f59e0b' : '#ef4444'}; font-size: 14px; font-weight: bold;">
                    ${qDetail.passCount}/${qDetail.totalTests} test cases passed
                  </span>
                </div>
                <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${qDetail.score.toFixed(1)} / ${qDetail.maxScore}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          <div class="performance">
            <span class="performance-label">Performance</span>
            <span class="performance-value" style="color: ${
              examResults.percentage >= 80 ? '#10b981' :
              examResults.percentage >= 60 ? '#f59e0b' :
              examResults.percentage >= 40 ? '#f97316' :
              '#ef4444'
            };">
              ${examResults.percentage >= 80 ? 'Excellent' :
                examResults.percentage >= 60 ? 'Good' :
                examResults.percentage >= 40 ? 'Average' :
                'Needs Improvement'}
            </span>
          </div>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
    
    // Create a blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scorecard-${exam?.title?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'exam'}-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const judgeLanguages = {
    javascript: "javascript",
    python: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
  };

  const transformForCompiler = (input) => {
    return String(input || "")
      .split("\n")
      .map((line) =>
        line
          .replace(/\[/g, "")
          .replace(/\]/g, "")
          .replace(/,/g, " ")
          .replace(/#/g, "")
          .replace(/\s+/g, " ")
          .trim()
      )
      .join("\n");
  };

  const handleMcq = (qIndex, optionIndex, multiple) => {
    setAnswers((prev) => {
      if (multiple) {
        const cur = Array.isArray(prev[qIndex]) ? prev[qIndex] : [];
        const next = cur.includes(optionIndex)
          ? cur.filter((i) => i !== optionIndex)
          : [...cur, optionIndex];
        return { ...prev, [qIndex]: next };
      }
      return { ...prev, [qIndex]: optionIndex };
    });
  };

  const handleText = (qIndex, value) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: value }));
  };

  const handleLanguageChange = (qIndex, value) => {
    setCodeLanguages((prev) => ({ ...prev, [qIndex]: value }));
  };

  const runAllTestCases = async (qIndex, testCases) => {
    if (!Array.isArray(testCases) || testCases.length === 0) {
      setRunResults((prev) => ({ ...prev, [qIndex]: [] }));
      return;
    }
    const code = answers[qIndex] || "";
    if (!String(code).trim()) {
      alert("Please write your solution before running.");
      return;
    }
    const language = codeLanguages[qIndex] || "javascript";
    setRunLoading((prev) => ({ ...prev, [qIndex]: true }));
    const results = [];
    for (const tc of testCases) {
      try {
        const res = await fetch("/api/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: judgeLanguages[language] || "javascript",
            source: code,
            stdin: transformForCompiler(tc?.input || ""),
          }),
        });
        const data = await res.json();
        const actual = (data.stdout || "").trim();
        const expected = String(tc?.output || "").trim();
        results.push({
          input: tc?.input || "",
          expected,
          actual,
          status: data.status || "Error",
          pass: actual.toLowerCase() === expected.toLowerCase(),
        });
      } catch (err) {
        results.push({
          input: tc?.input || "",
          expected: String(tc?.output || "").trim(),
          actual: "Error",
          status: "Error",
          pass: false,
        });
      }
    }
    setRunResults((prev) => ({ ...prev, [qIndex]: results }));
    setLastRunAtMap((prev) => ({ ...prev, [qIndex]: Date.now() }));
    setRunLoading((prev) => ({ ...prev, [qIndex]: false }));
  };

  const progress = useMemo(() => {
    const total = exam?.questions?.length || 0;
    if (total === 0) return { answered: 0, total, percent: 0 };
    let answered = 0;
    for (let i = 0; i < total; i++) {
      const a = answers[i];
      if (Array.isArray(a)) {
        if (a.length > 0) answered += 1;
      } else if (a !== undefined && a !== null && String(a).trim() !== "") {
        answered += 1;
      }
    }
    return { answered, total, percent: Math.round((answered / total) * 100) };
  }, [answers, exam]);

  const isAnswered = useCallback((index) => {
    const a = answers[index];
    if (Array.isArray(a)) return a.length > 0;
    return a !== undefined && a !== null && String(a).trim() !== "";
  }, [answers]);

  const toggleReview = useCallback((idx) => {
    setReviewMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const mcqIndices = useMemo(() => {
    return (exam?.questions || [])
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q?.type === "mcq")
      .map(({ i }) => i);
  }, [exam]);
  const descIndices = useMemo(() => {
    return (exam?.questions || [])
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q?.type === "descriptive")
      .map(({ i }) => i);
  }, [exam]);
  const codingIndices = useMemo(() => {
    return (exam?.questions || [])
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q?.type === "coding")
      .map(({ i }) => i);
  }, [exam]);
  const mcqSections = useMemo(() => {
    const set = new Set();
    (exam?.questions || []).forEach((q) => {
      if (q?.type !== "mcq") return;
      const s = String(q?.section || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [exam]);
  const descSections = useMemo(() => {
    const set = new Set();
    (exam?.questions || []).forEach((q) => {
      if (q?.type !== "descriptive") return;
      const s = String(q?.section || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [exam]);
  const codingSections = useMemo(() => {
    const set = new Set();
    (exam?.questions || []).forEach((q) => {
      if (q?.type !== "coding") return;
      const s = String(q?.section || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [exam]);
  const activeSectionList =
    section === "mcq" ? mcqSections : section === "coding" ? codingSections : descSections;
  const filteredIndices = useMemo(() => {
    const base = section === "mcq" ? mcqIndices : section === "coding" ? codingIndices : descIndices;
    if (activeSection === "All") return base;
    return base.filter((i) => {
      const q = (exam?.questions || [])[i];
      return String(q?.section || "").trim() === activeSection;
    });
  }, [section, mcqIndices, descIndices, codingIndices, activeSection, exam]);

  const indicesForSection = useCallback((sectionName) => {
    const base = section === "mcq" ? mcqIndices : section === "coding" ? codingIndices : descIndices;
    if (sectionName === "All") return base;
    return base.filter((i) => {
      const q = (exam?.questions || [])[i];
      return String(q?.section || "").trim() === sectionName;
    });
  }, [section, mcqIndices, descIndices, codingIndices, exam]);

  useEffect(() => {
    setActiveSection("All");
  }, [section]);

  useEffect(() => {
    if (!filteredIndices.includes(activeIndex) && filteredIndices.length > 0) {
      setActiveIndex(filteredIndices[0]);
    }
  }, [section, filteredIndices, activeIndex]);

  const totalInSection = filteredIndices.length;
  const currentPos = filteredIndices.indexOf(activeIndex);
  
  // Calculate if we're on the last question of the entire exam
  const isLastQuestionOfExam = useMemo(() => {
    const allQuestions = exam?.questions || [];
    if (allQuestions.length === 0) return false;
    const lastQuestionIndex = allQuestions.length - 1;
    return activeIndex === lastQuestionIndex;
  }, [activeIndex, exam]);
  
  // Check if we're on the last question of current section
  const isLastQuestionOfSection = useMemo(() => {
    return currentPos === totalInSection - 1;
  }, [currentPos, totalInSection]);

  const requestFullscreen = () => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (document.fullscreenElement || !el?.requestFullscreen) return;
    el.requestFullscreen().catch(() => {
      // Ignore if browser blocks without user gesture.
    });
  };

  const startTimer = useCallback((initialMs) => {
    if (timerRef.current) return;
    const duration = Number(exam?.durationMinutes) || 0;
    if (duration > 0) {
      const startingMs = Number.isFinite(initialMs) ? initialMs : duration * 60 * 1000;
      const endAt = Date.now() + startingMs;
      setTimeLeftMs(startingMs);
      timerRef.current = setInterval(() => {
        setTimeLeftMs((prev) => {
          const next = Math.max(0, (prev ?? endAt - Date.now()) - 1000);
          if (next <= 0) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return next;
        });
      }, 1000);
    }
  }, [exam]);

  const resetExamState = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStarted(false);
    setPendingStart(false);
    setTimeLeftMs(null);
    tabSwitchCountRef.current = 0;
    setTabSwitchCount(0);
  }, []);

  // Function to block the exam
  const blockExamForPhone = useCallback(async (reason, count) => {
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) return;
    
    try {
      const blocksCol = firestoreHelpers.collection(db, "interviewExams", String(examId), "blocks");
      const qBlock = firestoreHelpers.query(blocksCol, firestoreHelpers.where("phone", "==", phoneDigits));
      const blockSnap = await firestoreHelpers.getDocs(qBlock);
      
      if (blockSnap.empty) {
        // Create new block
        await firestoreHelpers.addDoc(blocksCol, {
          phone: phoneDigits,
          blocked: true,
          reason: reason,
          blockedAt: Date.now(),
          tabSwitchCount: count,
        });
      } else {
        // Update existing block
        await firestoreHelpers.updateDoc(blockSnap.docs[0].ref, {
          blocked: true,
          reason: reason,
          blockedAt: Date.now(),
          tabSwitchCount: count,
        });
      }
      
      setIsBlocked(true);
      setBlockReason(reason);
      resetExamState();
      alert("Exam blocked! " + reason + " Please contact admin to unblock.");
    } catch (e) {
      console.error("Failed to block exam:", e);
      alert("Failed to block exam. Please try again.");
    }
  }, [phone, examId, resetExamState]);

  // Function to handle violations (tab switch or fullscreen exit)
  const handleViolation = useCallback(async (violationType) => {
    if (!started) return;
    
    tabSwitchCountRef.current += 1;
    const newCount = tabSwitchCountRef.current;
    setTabSwitchCount(newCount);
    
    if (newCount >= 3) {
      const reason = violationType === "fullscreen"
        ? "Exam blocked due to exiting fullscreen 3 times"
        : "Exam blocked due to 3 tab switches/window exits";
      await blockExamForPhone(reason, newCount);
    } else {
      const warningMsg = violationType === "fullscreen"
        ? `Warning: You have exited fullscreen ${newCount} time(s). Exam will be blocked after 3 exits.`
        : `Warning: You have switched tabs/windows ${newCount} time(s). Exam will be blocked after 3 switches.`;
      alert(warningMsg);
    }
  }, [started, blockExamForPhone]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    
    const handleFullscreenChange = () => {
      if (pendingStart && document.fullscreenElement) {
        setPendingStart(false);
        setStarted(true);
        tabSwitchCountRef.current = 0; // Reset tab switch count when exam starts
        setTabSwitchCount(0);
        startTimer(timeLeftMs);
        return;
      }
      if (started && !document.fullscreenElement && !isBlocked) {
        // Fullscreen exited - prevent exit and re-enter immediately
        handleViolation("fullscreen");
        
        // Immediately try to re-enter fullscreen
        if (fullscreenReenterRef.current) {
          clearTimeout(fullscreenReenterRef.current);
        }
        fullscreenReenterRef.current = setTimeout(() => {
          if (started && !isBlocked && typeof document !== "undefined") {
            const el = document.documentElement;
            if (el?.requestFullscreen) {
              el.requestFullscreen().catch(() => {
                // If re-entry fails, count as violation
              });
            }
          }
        }, 100);
      }
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (fullscreenReenterRef.current) {
        clearTimeout(fullscreenReenterRef.current);
      }
    };
  }, [pendingStart, started, startTimer, resetExamState, handleViolation, timeLeftMs, isBlocked]);

  // Tab visibility detection and exit tracking
  useEffect(() => {
    if (!started) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab switched or window lost focus
        setShowTabWarning(true);
        handleViolation("tab");
        
        // Hide warning after 3 seconds
        setTimeout(() => {
          setShowTabWarning(false);
        }, 3000);
      } else {
        setShowTabWarning(false);
      }
    };
    
    // Also prevent keyboard shortcuts for tab switching
    const handleKeyDown = (e) => {
      // Prevent Alt+Tab, Ctrl+Tab, Ctrl+W, F11 (fullscreen toggle)
      if ((e.altKey && e.key === 'Tab') || 
          (e.ctrlKey && (e.key === 'Tab' || e.key === 'w' || e.key === 'W')) ||
          e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        if (started && !isBlocked) {
          handleViolation("tab");
        }
        return false;
      }
    };
    
    // Prevent right-click and context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    // Prevent tab/window close
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your exam progress may be lost.';
      return e.returnValue;
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);
    visibilityChangeRef.current = handleVisibilityChange;
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [started, handleViolation, isBlocked]);

  const prepareAttempt = useCallback(async (phoneDigits) => {
    const duration = Number(exam?.durationMinutes) || 0;
    
    // Check if exam is blocked for this phone
    const blockStatus = await checkBlockStatus(phoneDigits);
    if (blockStatus.blocked) {
      setIsBlocked(true);
      setBlockReason(blockStatus.reason || "Exam blocked due to multiple tab switches");
      return { blocked: true };
    }
    
    // Block if already submitted for this phone
    const subCol = firestoreHelpers.collection(db, "interviewExams", String(examId), "submissions");
    const qPhone = firestoreHelpers.query(subCol, firestoreHelpers.where("phone", "==", phoneDigits));
    const existingPhone = await firestoreHelpers.getDocs(qPhone);
    if (!existingPhone.empty) {
      alert("A submission has already been received for this phone number.");
      return { blocked: true };
    }
    if (duration <= 0) {
      return { blocked: false, remainingMs: null };
    }
    const attemptsCol = firestoreHelpers.collection(db, "interviewExams", String(examId), "attempts");
    const qAttempt = firestoreHelpers.query(attemptsCol, firestoreHelpers.where("phone", "==", phoneDigits));
    const attemptSnap = await firestoreHelpers.getDocs(qAttempt);
    let startedAt = null;
    let attemptDocRef = null;
    if (!attemptSnap.empty) {
      const firstDoc = attemptSnap.docs[0];
      startedAt = firstDoc.data()?.startedAt || null;
      attemptDocRef = firestoreHelpers.doc(db, "interviewExams", String(examId), "attempts", firstDoc.id);
    } else {
      startedAt = Date.now();
      const createdRef = await firestoreHelpers.addDoc(attemptsCol, { phone: phoneDigits, startedAt });
      attemptDocRef = firestoreHelpers.doc(db, "interviewExams", String(examId), "attempts", createdRef.id);
    }
    let remainingMs = duration * 60 * 1000 - (Date.now() - Number(startedAt || Date.now()));
    if (remainingMs <= 0 && attemptDocRef) {
      // Reset timer for a fresh attempt when time is already over
      startedAt = Date.now();
      await firestoreHelpers.updateDoc(attemptDocRef, { startedAt });
      remainingMs = duration * 60 * 1000;
    }
    setTimeLeftMs(remainingMs);
    return { blocked: false, remainingMs };
  }, [exam, examId, checkBlockStatus]);

  const startExam = async () => {
    // Validate before starting
    const phoneDigits = phone.replace(/\D/g, "");
    if (isBlocked) {
      alert("This exam is blocked. Please contact the administrator to unblock it.");
      return;
    }
    if (!fullName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (phoneDigits.length < 10) {
      alert("Please enter a valid phone number (10+ digits).");
      return;
    }
    if (!acceptedRules) {
      alert("Please accept the rules to proceed.");
      return;
    }
    const attempt = await prepareAttempt(phoneDigits);
    if (attempt.blocked) return;
    // Reset tab switch count when starting exam
    tabSwitchCountRef.current = 0;
    setTabSwitchCount(0);
    if (typeof document !== "undefined" && !document.fullscreenElement) {
      setPendingStart(true);
      requestFullscreen();
      return;
    }
    setStarted(true);
    startTimer(attempt.remainingMs);
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (resultsTimerRef.current) clearTimeout(resultsTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    // Basic validation
    if (!fullName.trim()) {
      alert("Please enter your name.");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      alert("Please enter a valid phone number (10+ digits).");
      return;
    }
    setSubmitting(true);
    try {
      // Prevent duplicate submissions per user
      const subCol = firestoreHelpers.collection(db, "interviewExams", String(examId), "submissions");
      if (userId) {
        const qUser = firestoreHelpers.query(subCol, firestoreHelpers.where("userId", "==", userId));
        const existingUser = await firestoreHelpers.getDocs(qUser);
        if (!existingUser.empty) {
          alert("A submission has already been received for this user.");
          setSubmitting(false);
          return;
        }
      } else {
        const qPhone = firestoreHelpers.query(subCol, firestoreHelpers.where("phone", "==", phoneDigits));
        const existingPhone = await firestoreHelpers.getDocs(qPhone);
        if (!existingPhone.empty) {
          alert("A submission has already been received for this phone number.");
          setSubmitting(false);
          return;
        }
      }
      // MCQ score: 1 per correct answer + section-wise breakdown
      let mcqCorrect = 0;
      let mcqTotal = 0;
      const mcqSectionScores = {}; // { sectionName: { correct, total, score } }
      
      (exam?.questions || []).forEach((q, i) => {
        if (!q || q.type !== "mcq") return;
        mcqTotal += 1;
        const sectionName = String(q?.section || "").trim() || "Unassigned";
        const ans = answers[i];
        const corrArr = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
        let isCorrect = false;
        
        if (corrArr.length > 1) {
          const aSet = new Set(Array.isArray(ans) ? ans : []);
          const cSet = new Set(corrArr);
          if (aSet.size === cSet.size && [...aSet].every((x) => cSet.has(x))) isCorrect = true;
        } else if (corrArr.length === 1) {
          if (ans === corrArr[0]) isCorrect = true;
        } else if (typeof q.correctAnswer === "number") {
          if (ans === q.correctAnswer) isCorrect = true;
        }
        
        if (isCorrect) mcqCorrect += 1;
        
        // Track section-wise scores
        if (!mcqSectionScores[sectionName]) {
          mcqSectionScores[sectionName] = { correct: 0, total: 0, score: 0 };
        }
        mcqSectionScores[sectionName].total += 1;
        if (isCorrect) {
          mcqSectionScores[sectionName].correct += 1;
          mcqSectionScores[sectionName].score += 1;
        }
      });
      
      const mcqScore = { correct: mcqCorrect, total: mcqTotal, score: mcqCorrect, sectionScores: mcqSectionScores };

      // Coding score: for each question, maxScore * (passed / total test cases) + per-question details
      let codingScore = 0;
      const codingQuestionDetails = []; // Array of { questionIndex, questionNumber, passCount, totalTests, score, maxScore }
      
      (exam?.questions || []).forEach((q, i) => {
        if (!q || q.type !== "coding") return;
        const maxScore = Number.isFinite(Number(q.maxScore)) ? Number(q.maxScore) : 10;
        const runs = runResults[i];
        if (!Array.isArray(runs) || runs.length === 0) {
          codingQuestionDetails.push({
            questionIndex: i,
            questionNumber: codingQuestionDetails.length + 1,
            passCount: 0,
            totalTests: 0,
            score: 0,
            maxScore: maxScore,
          });
          return;
        }
        const passCount = runs.filter((r) => r?.pass).length;
        const total = runs.length;
        const questionScore = maxScore * (passCount / total);
        codingScore += questionScore;
        
        codingQuestionDetails.push({
          questionIndex: i,
          questionNumber: codingQuestionDetails.length + 1,
          passCount: passCount,
          totalTests: total,
          score: questionScore,
          maxScore: maxScore,
        });
      });

      const payload = {
        name: fullName.trim(),
        phone: phoneDigits,
        userId: userId || null,
        submittedAt: Date.now(),
        answers,
        mcqScore,
        codingScore,
        lastRunSummary: Object.fromEntries(
          Object.entries(runResults || {}).map(([qIndex, runs]) => {
            const list = Array.isArray(runs) ? runs : [];
            const passCount = list.filter((r) => r?.pass).length;
            const total = list.length;
            return [qIndex, { passCount, failCount: Math.max(0, total - passCount), total }];
          })
        ),
        lastRunAt: lastRunAtMap,
      };
      await firestoreHelpers.addDoc(subCol, payload);
      
      // Calculate total score and percentage
      const totalScore = mcqScore.score + codingScore;
      const maxMcqScore = mcqScore.total;
      const maxCodingScore = (exam?.questions || [])
        .filter((q) => q?.type === "coding")
        .reduce((sum, q) => sum + (Number.isFinite(Number(q.maxScore)) ? Number(q.maxScore) : 10), 0);
      const maxTotalScore = maxMcqScore + maxCodingScore;
      const percentage = maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;
      
      // Store results but don't show yet
      setExamResults({
        mcqScore,
        codingScore,
        totalScore,
        maxMcqScore,
        maxCodingScore,
        maxTotalScore,
        percentage,
        mcqSectionScores: mcqSectionScores,
        codingQuestionDetails: codingQuestionDetails,
      });
      setStarted(false);
      setProcessing(true);
      setProcessingCountdown(10);
      
      // Processing countdown timer
      processingIntervalRef.current = setInterval(() => {
        setProcessingCountdown((prev) => {
          if (prev <= 1) {
            if (processingIntervalRef.current) {
              clearInterval(processingIntervalRef.current);
              processingIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Wait 10 seconds before showing results
      setTimeout(() => {
        // Exit fullscreen if active
        if (typeof document !== "undefined" && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {
            // Ignore if exit fails
          });
        }
        
        // Stop processing and show results
        setProcessing(false);
        setShowResults(true);
        setCountdown(300); // 5 minutes = 300 seconds
        
        // Countdown timer for results display
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Auto-redirect after 5 minutes of showing results
        resultsTimerRef.current = setTimeout(() => {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          router.push("/interview");
        }, 300000); // 5 minutes = 300000 milliseconds
      }, 10000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!exam) {
    return <div className="min-h-screen flex items-center justify-center">Exam not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-cyan-50">
      {/* Processing Screen - Shows for 10 seconds after submission */}
      {processing && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 mb-6 animate-pulse">
              <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Submission</h2>
            <p className="text-sm text-gray-600 mb-4">
              Please wait while we process your exam results...
            </p>
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                <span className="text-lg font-semibold text-blue-600">{processingCountdown}</span>
                <span className="text-sm text-gray-600">
                  {processingCountdown === 1 ? 'second' : 'seconds'} remaining
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Screen */}
      {showResults && examResults && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-sky-50 to-cyan-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4 py-6">
            <div className="w-full max-w-2xl">
              {/* Header */}
              <div className="text-center mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0c4a6e] mb-1">{exam?.title || 'Interview Exam'}</h1>
                <p className="text-sm sm:text-base text-gray-600">Scorecard</p>
              </div>

              {/* Candidate Information Card */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                <p className="text-xs sm:text-sm text-gray-700 mb-0.5"><strong>Name:</strong> {fullName || 'N/A'}</p>
                <p className="text-xs sm:text-sm text-gray-700 mb-0.5"><strong>Phone:</strong> {phone || 'N/A'}</p>
                <p className="text-xs sm:text-sm text-gray-700"><strong>Date:</strong> {new Date().toLocaleString()}</p>
              </div>

              {/* Total Score Card */}
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg p-5 sm:p-6 mb-4 text-white shadow-lg">
                <div className="text-center">
                  <p className="text-xs sm:text-sm font-medium opacity-90 mb-2">Total Score</p>
                  <div className="flex items-baseline justify-center gap-2 mb-1">
                    <span className="text-4xl sm:text-5xl font-bold">{examResults.totalScore.toFixed(1)}</span>
                    <span className="text-xl sm:text-2xl font-semibold opacity-80">/ {examResults.maxTotalScore}</span>
                  </div>
                  <div className="mt-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 rounded-full backdrop-blur-sm">
                      <span className="text-base sm:text-lg font-bold">{examResults.percentage}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Score Breakdown */}
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {/* MCQ Section Card */}
                <div className="bg-white rounded-lg shadow-md p-4 border-2 border-emerald-200">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3">MCQ Section</h3>
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900">{examResults.mcqScore.score}</span>
                    <span className="text-base sm:text-lg text-gray-600">/ {examResults.mcqScore.total}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1.5">
                    {examResults.mcqScore.correct} correct out of {examResults.mcqScore.total} questions
                  </p>
                </div>

                {/* Coding Section Card */}
                <div className="bg-white rounded-lg shadow-md p-4 border-2 border-blue-200">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3">Coding Section</h3>
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900">{examResults.codingScore.toFixed(1)}</span>
                    <span className="text-base sm:text-lg text-gray-600">/ {examResults.maxCodingScore}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1.5">
                    Based on test case results
                  </p>
                </div>
              </div>

              {/* Detailed Section-wise Results (Collapsible) */}
              {(examResults.mcqSectionScores && Object.keys(examResults.mcqSectionScores).length > 0) || 
               (examResults.codingQuestionDetails && examResults.codingQuestionDetails.length > 0) ? (
                <details className="mb-4">
                  <summary className="cursor-pointer bg-white rounded-lg shadow-md p-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    View Detailed Breakdown
                  </summary>
                  <div className="mt-3 space-y-3">
                    {/* MCQ Section-wise Results */}
                    {examResults.mcqSectionScores && Object.keys(examResults.mcqSectionScores).length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-4">
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-3">MCQ Section - Section-wise Results</h4>
                        <div className="space-y-2">
                          {Object.entries(examResults.mcqSectionScores).map(([sectionName, sectionData]) => (
                            <div key={sectionName} className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-semibold text-gray-900 text-xs sm:text-sm">{sectionName}</span>
                                <span className="text-xs sm:text-sm text-gray-600">
                                  {sectionData.correct}/{sectionData.total} correct
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-bold text-emerald-700">{sectionData.score}</span>
                                <span className="text-sm sm:text-base text-gray-600">/ {sectionData.total}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coding Section - Per Question Results */}
                    {examResults.codingQuestionDetails && examResults.codingQuestionDetails.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-4">
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-3">Coding Section - Test Case Results</h4>
                        <div className="space-y-2">
                          {examResults.codingQuestionDetails.map((qDetail) => (
                            <div key={qDetail.questionIndex} className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-semibold text-gray-900 text-xs sm:text-sm">Question {qDetail.questionNumber}</span>
                                <span className={`text-xs sm:text-sm font-medium ${
                                  qDetail.totalTests > 0 && qDetail.passCount === qDetail.totalTests ? 'text-green-600' :
                                  qDetail.totalTests > 0 && qDetail.passCount > 0 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {qDetail.passCount}/{qDetail.totalTests} test cases passed
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-bold text-blue-700">{qDetail.score.toFixed(1)}</span>
                                <span className="text-sm sm:text-base text-gray-600">/ {qDetail.maxScore}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              ) : null}

              {/* Performance Indicator */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-t-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Performance</span>
                  <span className={`text-sm sm:text-base font-bold ${
                    examResults.percentage >= 80 ? 'text-green-600' :
                    examResults.percentage >= 60 ? 'text-yellow-600' :
                    examResults.percentage >= 40 ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {examResults.percentage >= 80 ? 'Excellent' :
                     examResults.percentage >= 60 ? 'Good' :
                     examResults.percentage >= 40 ? 'Average' :
                     'Needs Improvement'}
                  </span>
                </div>
              </div>

              {/* Download and Navigation */}
              <div className="text-center space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                  <button
                    onClick={downloadScorecard}
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Scorecard
                  </button>
                  <button
                    onClick={() => {
                      if (resultsTimerRef.current) {
                        clearTimeout(resultsTimerRef.current);
                        resultsTimerRef.current = null;
                      }
                      if (countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                      }
                      router.push("/interview");
                    }}
                    className="px-5 py-2 bg-[#00448a] hover:bg-[#003a76] text-white rounded-lg font-medium transition-colors text-xs sm:text-sm"
                  >
                    Go to Interview Page Now
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  Redirecting to interview page in <span className="font-semibold text-cyan-600 text-sm">{formatCountdown(countdown)}</span> ({Math.floor(countdown / 60)} {Math.floor(countdown / 60) === 1 ? 'minute' : 'minutes'}{countdown % 60 > 0 ? ` and ${countdown % 60} ${countdown % 60 === 1 ? 'second' : 'seconds'}` : ''})...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Exam Content - Hidden when showing results or processing */}
      {!showResults && !processing && (
        <>
          {/* Fullscreen Required Overlay */}
          {started && typeof document !== "undefined" && !document.fullscreenElement && !isBlocked && (
            <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 mb-6">
                  <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Fullscreen Required!</h2>
                <p className="text-sm text-gray-600 mb-4">
                  The exam must be taken in fullscreen mode. Please enter fullscreen to continue.
                </p>
                <button
                  onClick={() => {
                    if (typeof document !== "undefined") {
                      const el = document.documentElement;
                      if (el?.requestFullscreen) {
                        el.requestFullscreen().catch(() => {
                          alert("Please allow fullscreen to continue the exam.");
                        });
                      }
                    }
                  }}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                >
                  Enter Fullscreen
                </button>
              </div>
            </div>
          )}

          {/* Tab Switch Warning Overlay */}
          {showTabWarning && started && (
            <div className="fixed inset-0 z-[100] bg-red-600 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Warning: Tab Switch Detected!</h2>
                <p className="text-sm text-gray-600 mb-4">
                  You have switched tabs/windows {tabSwitchCount} time(s). Exam will be blocked after 3 switches.
                </p>
                <p className="text-xs text-red-600 font-semibold">
                  Please return to the exam window immediately!
                </p>
              </div>
            </div>
          )}

          {/* Section Transition Notification */}
          {showSectionTransition && started && (
            <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-100 mb-6">
                  <svg className="w-10 h-10 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Section Transition</h2>
                <p className="text-base text-gray-700 mb-4">
                  {transitionMessage || "Moving to next section..."}
                </p>
                <p className="text-sm text-gray-600">
                  You can continue answering questions in the new section.
                </p>
              </div>
            </div>
          )}

          {/* Sticky Header */}
          <div className="sticky top-0 z-20 border-b bg-white shadow-sm">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{exam.title}</h1>
                {exam.description && <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">{exam.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                {started && tabSwitchCount > 0 && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    tabSwitchCount >= 2 ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  }`}>
                    Tab Switches: {tabSwitchCount}/3
                  </span>
                )}
                <div className="hidden sm:block text-sm text-gray-700">{progress.answered}/{progress.total} answered</div>
                <div className="w-28 sm:w-44">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-600" style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>
                {timeLeftMs != null && (
                  <span className="px-3 py-1 rounded-md bg-black text-white text-xs sm:text-sm font-medium">
                    {formatTime(timeLeftMs)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

        {/* Pre-Exam Info (visible until started) */}
        {!started && (
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 mb-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 text-gray-900">Candidate Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            
            {/* Block Status Message */}
            {isBlocked && (
              <div className="mt-4 p-4 rounded-lg border-2 border-red-300 bg-red-50">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-1">Exam Blocked</h3>
                    <p className="text-sm text-red-700">{blockReason || "This exam has been blocked. Please contact the administrator to unblock it."}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Rules & Exam Pattern</h3>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Time Limit: {Number(exam?.durationMinutes) || 0} minutes.</li>
                <li>Total Questions: {exam?.questions?.length || 0} (MCQ: {mcqIndices.length}, Descriptive: {descIndices.length}).</li>
                <li>Only one submission is allowed. After submission, edits or resubmissions will be not be allowed.</li>
                <li>You can navigate between questions and mark them for review.</li>
                <li>Do not refresh or close the tab during the exam.</li>
                <li><strong>Important:</strong> Switching tabs/windows 3 times will automatically block the exam. Stay focused on the exam window.</li>
              </ul>
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={acceptedRules}
                  onChange={(e) => setAcceptedRules(e.target.checked)}
                  className="w-4 h-4 text-cyan-600"
                />
                I have read and agree to the rules above.
              </label>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={startExam}
                  disabled={isBlocked}
                  className="px-5 py-2 bg-[#00448a] hover:bg-[#003a76] text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isBlocked ? "Exam Blocked - Contact Admin" : "Proceed to Test"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section Selector (only after start) */}
        {started && (
          <div className="bg-white rounded-xl shadow p-3 sm:p-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-700 mr-2">Sections:</span>
              {mcqIndices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSection("mcq")}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    section === "mcq" ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  MCQ ({mcqIndices.length})
                </button>
              )}
              {descIndices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSection("descriptive")}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    section === "descriptive" ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Descriptive ({descIndices.length})
                </button>
              )}
              {codingIndices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSection("coding")}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    section === "coding" ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Coding ({codingIndices.length})
                </button>
              )}
            </div>
            {activeSectionList.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-600 mr-1">Topics:</span>
                <button
                  type="button"
                  onClick={() => setActiveSection("All")}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    activeSection === "All"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  All
                </button>
                {activeSectionList.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActiveSection(s)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      activeSection === s
                        ? "bg-cyan-600 text-white border-cyan-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Question Area */}
        {started && (
          <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          {(() => {
            if (totalInSection === 0) {
              return (
                <div className="text-center py-10">
                  <p className="text-gray-600">
                    No questions in this section.
                  </p>
                </div>
              );
            }
            const q = (exam.questions || [])[activeIndex];
            if (!q) return null;
            const multiFromCorrectAnswers = Array.isArray(q.correctAnswers)
              ? q.correctAnswers.length > 1
              : typeof q.correctAnswers === "string"
              ? q.correctAnswers.split(/[,\s]+/).filter(Boolean).length > 1
              : false;
            const multiFromCorrectAnswer = Array.isArray(q.correctAnswer)
              ? q.correctAnswer.length > 1
              : typeof q.correctAnswer === "string"
              ? q.correctAnswer.split(/[,\s]+/).filter(Boolean).length > 1
              : false;
            const multiple = Boolean(
              q?.allowMultiple ||
                q?.multiSelect ||
                q?.multipleAnswers ||
                multiFromCorrectAnswers ||
                multiFromCorrectAnswer
            );
            return (
              <div className="">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="font-semibold text-gray-900 text-base sm:text-lg">
                    Question {currentPos + 1} of {totalInSection}
                  </p>
                </div>
                <div className="text-gray-800 mb-4 whitespace-pre-wrap">{q.question}</div>
                {q.type === "coding" && (
                  <div className="mb-3 text-xs text-gray-600">
                    Level:{" "}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                      {String(q.section || "easy")}
                    </span>
                  </div>
                )}
                {q.type === "mcq" ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {(q.options || []).map((opt, oIndex) => {
                      const selected = multiple
                        ? Array.isArray(answers[activeIndex]) && answers[activeIndex].includes(oIndex)
                        : answers[activeIndex] === oIndex;
                      return (
                        <button
                          key={oIndex}
                          type="button"
                          onClick={() => handleMcq(activeIndex, oIndex, multiple)}
                          className={`text-left px-3 py-2 rounded-lg border transition ${
                            selected
                              ? "border-cyan-600 bg-cyan-50 text-cyan-900"
                              : "border-gray-300 hover:border-cyan-300 hover:bg-gray-50"
                          }`}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + oIndex)}.</span>
                          <span className="whitespace-pre-wrap">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : q.type === "descriptive" ? (
                  <textarea
                    value={answers[activeIndex] || ""}
                    onChange={(e) => handleText(activeIndex, e.target.value)}
                    placeholder="Write your answer..."
                    className="w-full border rounded-lg px-3 py-2 min-h-[140px] focus:ring-2 focus:ring-cyan-500"
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
                      <p className="font-semibold mb-1">Test Cases</p>
                      {(q.testCases || []).length === 0 ? (
                        <p className="text-gray-500">No test cases provided.</p>
                      ) : (
                        <div className="space-y-2">
                          {(q.testCases || []).map((tc, i) => (
                            <div key={i} className="grid sm:grid-cols-2 gap-2">
                              <div className="bg-white border rounded p-2">
                                <p className="text-[11px] text-gray-500 mb-1">Input {i + 1}</p>
                                <pre className="whitespace-pre-wrap text-xs text-gray-800">{tc.input || "—"}</pre>
                              </div>
                              <div className="bg-white border rounded p-2">
                                <p className="text-[11px] text-gray-500 mb-1">Output {i + 1}</p>
                                <pre className="whitespace-pre-wrap text-xs text-gray-800">{tc.output || "—"}</pre>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="text-sm text-gray-700">Language</label>
                      <select
                        value={codeLanguages[activeIndex] || "javascript"}
                        onChange={(e) => handleLanguageChange(activeIndex, e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="c">C</option>
                        <option value="cpp">C++</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => runAllTestCases(activeIndex, q.testCases || [])}
                        disabled={runLoading[activeIndex]}
                        className={`px-4 py-2 rounded-lg text-white text-sm ${
                          runLoading[activeIndex] ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {runLoading[activeIndex] ? "Running..." : "Run All Test Cases"}
                      </button>
                    </div>
                    <textarea
                      value={answers[activeIndex] || ""}
                      onChange={(e) => handleText(activeIndex, e.target.value)}
                      placeholder="Write your solution..."
                      className="w-full border rounded-lg px-3 py-2 min-h-[160px] focus:ring-2 focus:ring-cyan-500"
                    />
                    {Array.isArray(runResults[activeIndex]) && runResults[activeIndex].length > 0 && (
                      <div className="rounded-lg border p-3 text-xs text-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">Run Results</p>
                          <span className="text-[11px] text-gray-500">
                            {runResults[activeIndex].filter((r) => r.pass).length}/
                            {runResults[activeIndex].length} passed
                          </span>
                        </div>
                        <div className="space-y-2">
                          {runResults[activeIndex].map((r, i) => (
                            <div
                              key={i}
                              className={`rounded border p-2 ${
                                r.pass ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span>Test Case {i + 1}</span>
                                <span className={r.pass ? "text-green-700" : "text-red-700"}>
                                  {r.pass ? "PASS" : "FAIL"}
                                </span>
                              </div>
                              <div className="grid sm:grid-cols-2 gap-2">
                                <div>
                                  <div className="text-[11px] text-gray-500 mb-1">Expected</div>
                                  <pre className="whitespace-pre-wrap text-xs text-gray-800">{r.expected || "—"}</pre>
                                </div>
                                <div>
                                  <div className="text-[11px] text-gray-500 mb-1">Actual</div>
                                  <pre className="whitespace-pre-wrap text-xs text-gray-800">{r.actual || "—"}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentPos > 0) {
                        const prevPos = Math.max(0, currentPos - 1);
                        setActiveIndex(filteredIndices[prevPos]);
                        return;
                      }
                      if (activeSection !== "All" && activeSectionList.length > 0) {
                        const idx = activeSectionList.indexOf(activeSection);
                        if (idx > 0) {
                          const prevSection = activeSectionList[idx - 1];
                          const prevIndices = indicesForSection(prevSection);
                          if (prevIndices.length > 0) {
                            setActiveSection(prevSection);
                            setActiveIndex(prevIndices[prevIndices.length - 1]);
                          }
                        }
                      }
                    }}
                    disabled={currentPos <= 0 && (activeSection === "All" || activeSectionList.indexOf(activeSection) <= 0)}
                    className={`px-4 py-2 rounded-lg border ${
                      currentPos <= 0 && (activeSection === "All" || activeSectionList.indexOf(activeSection) <= 0)
                        ? "bg-gray-100 text-gray-400 border-gray-200"
                        : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Previous
                  </button>

                  <div className="hidden sm:flex items-center gap-1">
                    {filteredIndices.map((qi, i) => (
                      <button
                        key={i}
                        aria-label={`Go to question ${i + 1} in section`}
                        onClick={() => setActiveIndex(qi)}
                        className={`h-2.5 w-2.5 rounded-full ${
                          i === currentPos ? "bg-cyan-600" : "bg-gray-300 hover:bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentPos < totalInSection - 1) {
                        const nextPos = Math.min(totalInSection - 1, currentPos + 1);
                        setActiveIndex(filteredIndices[nextPos]);
                        return;
                      }
                      // If we're on the last question of current section, try to move to next section
                      if (isLastQuestionOfSection) {
                        // First check if we can move to a different question type section
                        if (section === "mcq") {
                          if (codingIndices.length > 0) {
                            setTransitionMessage("Moving to Coding section...");
                            setShowSectionTransition(true);
                            setSection("coding");
                            setActiveIndex(codingIndices[0]);
                            setTimeout(() => {
                              setShowSectionTransition(false);
                              setTransitionMessage("");
                            }, 3000);
                            return;
                          } else if (descIndices.length > 0) {
                            setTransitionMessage("Moving to Descriptive section...");
                            setShowSectionTransition(true);
                            setSection("descriptive");
                            setActiveIndex(descIndices[0]);
                            setTimeout(() => {
                              setShowSectionTransition(false);
                              setTransitionMessage("");
                            }, 3000);
                            return;
                          }
                        } else if (section === "descriptive" && codingIndices.length > 0) {
                          setTransitionMessage("Moving to Coding section...");
                          setShowSectionTransition(true);
                          setSection("coding");
                          setActiveIndex(codingIndices[0]);
                          setTimeout(() => {
                            setShowSectionTransition(false);
                            setTransitionMessage("");
                          }, 3000);
                          return;
                        }
                        // If no next section type, try topic/section transitions within same question type
                        if (activeSection !== "All" && activeSectionList.length > 0) {
                          const idx = activeSectionList.indexOf(activeSection);
                          if (idx >= 0 && idx < activeSectionList.length - 1) {
                            const nextSection = activeSectionList[idx + 1];
                            const nextIndices = indicesForSection(nextSection);
                            if (nextIndices.length > 0) {
                              setActiveSection(nextSection);
                              setActiveIndex(nextIndices[0]);
                            }
                          }
                        }
                      }
                    }}
                    disabled={isLastQuestionOfExam && isLastQuestionOfSection}
                    className={`px-4 py-2 rounded-lg border ${
                      isLastQuestionOfExam && isLastQuestionOfSection
                        ? "bg-gray-100 text-gray-400 border-gray-200"
                        : "bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700"
                    }`}
                  >
                    {isLastQuestionOfSection && !isLastQuestionOfExam ? "Next Section" : "Next"}
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleReview(activeIndex)}
                    className={`px-3 py-1.5 rounded-md text-sm border ${
                      reviewMap[activeIndex]
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-purple-700 border-purple-300 hover:bg-purple-50"
                    }`}
                  >
                    {reviewMap[activeIndex] ? "Unmark Review" : "Mark for Review"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPanel(true)}
                    className="sm:hidden px-3 py-1.5 rounded-md text-sm bg-gray-100 border border-gray-300"
                  >
                    Questions
                  </button>
                </div>
              </div>
            );
          })()}
          </div>
        )}

        {/* Progress Bar - Always visible */}
        {started && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Progress: <span className="font-semibold">{progress.percent}%</span> ({progress.answered}/{progress.total})
            </div>
            {isLastQuestionOfExam ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 bg-[#00448a] hover:bg-[#003a76] text-white rounded-lg disabled:opacity-60 font-semibold"
              >
                {submitting ? "Submitting..." : "Submit Answers"}
              </button>
            ) : (
              <div className="text-xs text-gray-500 italic">
                Complete all questions to submit
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Control Panel */}
      {started && (
        <div className="hidden lg:block fixed right-4 top-34 z-10">
        <div className="bg-white rounded-xl shadow border p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">Question Panel</p>
            <span className="text-xs text-gray-600">{progress.answered}/{progress.total}</span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {filteredIndices.map((qi, i) => {
              const current = qi === activeIndex;
              const answered = isAnswered(qi);
              const marked = reviewMap[qi];
              let cls = "bg-gray-200 text-gray-800";
              if (answered) cls = "bg-green-600 text-white";
              if (marked) cls = "bg-purple-600 text-white";
              if (current) cls = "bg-cyan-600 text-white";
              return (
                <button
                  key={i}
                  onClick={() => setActiveIndex(qi)}
                  className={`h-8 rounded-md text-xs font-semibold ${cls}`}
                  title={`Question ${qi + 1}`}
                >
                  {qi + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-cyan-600 inline-block" />Current</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-600 inline-block" />Answered</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-300 inline-block" />Not Answered</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-600 inline-block" />Marked</div>
          </div>
        </div>
        </div>
      )}

      {/* Mobile Bottom Sheet Panel */}
      {started && showPanel && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPanel(false)} />
          <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-900">Question Panel</p>
              <button
                className="px-3 py-1.5 rounded-md border text-sm"
                onClick={() => setShowPanel(false)}
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {filteredIndices.map((qi, i) => {
                const current = qi === activeIndex;
                const answered = isAnswered(qi);
                const marked = reviewMap[qi];
                let cls = "bg-gray-200 text-gray-800";
                if (answered) cls = "bg-green-600 text-white";
                if (marked) cls = "bg-purple-600 text-white";
                if (current) cls = "bg-cyan-600 text-white";
                return (
                  <button
                    key={i}
                    onClick={() => { setActiveIndex(qi); setShowPanel(false); }}
                    className={`h-9 rounded-md text-xs font-semibold ${cls}`}
                  >
                    {qi + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}


