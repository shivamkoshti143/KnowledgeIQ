import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Sparkles,
  MousePointerClick,
  Info,
  RotateCcw
} from "lucide-react";

function setReactInputValue(input, val) {
  if (!input) return;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, val);
  } else {
    input.value = val;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

export const TOUR_STEPS = [
  {
    id: "login_email",
    title: "Step 1: Employee Authentication",
    targetSelector: 'input[type="email"], input[placeholder*="abm.com"]',
    clickSelector: 'button[type="submit"]',
    actionText: "Enter Email (karthik@abm.com) & Click 'Send OTP'",
    whatHappensText:
      "Employees enter their corporate email for zero-trust passwordless authentication. The backend verifies the active account and issues a secure 6-digit OTP.",
    page: "auth_email",
    duration: 5000,
    action: (ctx) => {
      const emailInput = document.querySelector('input[type="email"], input[placeholder*="abm.com"]');
      if (emailInput) {
        setReactInputValue(emailInput, "karthik@abm.com");
      }
      setTimeout(() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      }, 3200);
    }
  },
  {
    id: "login_otp",
    title: "Step 2: OTP Verification",
    targetSelector: 'input[placeholder="123456"], input[maxlength="6"]',
    clickSelector: 'button[type="submit"]',
    actionText: "Verify Code '123456' & Click 'Verify OTP'",
    whatHappensText:
      "The system validates the one-time passcode, generates a cryptographically signed JWT token, loads Karthik's role permissions, and launches the Employee Portal.",
    page: "auth_otp",
    duration: 5000,
    action: (ctx) => {
      const otpInput = document.querySelector('input[placeholder="123456"], input[maxlength="6"]');
      if (otpInput) {
        setReactInputValue(otpInput, "123456");
      }
      setTimeout(() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      }, 3000);
    }
  },
  {
    id: "employee_dashboard",
    title: "Step 3: Employee Home Dashboard",
    targetSelector: ".dashboard-header, .welcome-banner, .page-header, .panel, h1",
    clickSelector: null,
    actionText: "Viewing Personalized Employee Home Dashboard",
    whatHappensText:
      "Employees are greeted with their personalized dashboard highlighting assigned tasks, announcements, departmental metrics, and trending learning content.",
    page: "home",
    duration: 6000,
    action: (ctx) => {
      if (ctx.setRoute) ctx.setRoute("home");
    }
  },
  {
    id: "knowledge_base",
    title: "Step 4: Central Knowledge Base",
    targetSelector: 'button.sidebar-item[key="knowledge-feed"], aside.sidebar button:has(svg)',
    clickSelector: 'button.sidebar-item:has(svg), aside.sidebar nav button',
    actionText: "Click 'Knowledge Base' in the Navigation Sidebar",
    whatHappensText:
      "Navigates to the comprehensive knowledge repository. Employees can explore standard operating procedures, technical documentation, and videos filtered by department.",
    page: "knowledge-feed",
    duration: 6000,
    action: (ctx) => {
      if (ctx.setRoute) ctx.setRoute("knowledge-feed");
    }
  },
  {
    id: "knowledge_detail",
    title: "Step 5: Interactive Guide & SOP Detail",
    targetSelector: ".feed-item-card, .video-card, .task-card, .content-card, article",
    clickSelector: ".feed-item-card, .video-card, .task-card",
    actionText: "Click on a Guide / SOP Card to Open Full Content",
    whatHappensText:
      "Opens the full procedure view featuring video playback, attached downloadable documents, step-by-step instructions, and discussion comments from colleagues.",
    page: "knowledge",
    duration: 6500,
    action: (ctx) => {
      if (ctx.data) {
        const firstVideo = ctx.data.videos?.[0];
        const firstPost = ctx.data.knowledgePosts?.[0];
        const firstTask = ctx.data.tasks?.[0];
        if (firstVideo && ctx.openItem) {
          ctx.openItem(firstVideo.id, "video");
        } else if (firstPost && ctx.openItem) {
          ctx.openItem(firstPost.id, "knowledge");
        } else if (firstTask && ctx.openItem) {
          ctx.openItem(firstTask.id, "task");
        }
      }
    }
  },
  {
    id: "my_tasks",
    title: "Step 6: My Knowledge & Assigned Tasks",
    targetSelector: 'button:has(svg.lucide-file-text), aside.sidebar nav button',
    clickSelector: null,
    actionText: "Click 'My Knowledge' (Assigned Tasks)",
    whatHappensText:
      "Displays all assigned learning tasks, compliance checklists, and workflow submissions. Employees can track deadlines, view instructions, and submit updates.",
    page: "tasks",
    duration: 6000,
    action: (ctx) => {
      if (ctx.setRoute) ctx.setRoute("tasks");
    }
  },
  {
    id: "ai_assistant",
    title: "Step 7: AI Knowledge Assistant",
    targetSelector: 'button:has(svg.lucide-sparkles), aside.sidebar nav button',
    clickSelector: null,
    actionText: "Click 'Knowledge Assistant' (AI Assistant)",
    whatHappensText:
      "Empowers employees to ask questions in plain English and receive instant, accurate answers extracted directly from ABM enterprise documentation and SOPs.",
    page: "ai-assistant",
    duration: 6000,
    action: (ctx) => {
      if (ctx.setRoute) ctx.setRoute("ai-assistant");
    }
  },
  {
    id: "bookmarks",
    title: "Step 8: Bookmarks & Saved Resources",
    targetSelector: 'button:has(svg.lucide-bookmark-check), aside.sidebar nav button',
    clickSelector: null,
    actionText: "Click 'Bookmarks' in Sidebar",
    whatHappensText:
      "Provides rapid access to bookmarked videos, guides, and procedures for easy reference anytime without having to search again.",
    page: "bookmarks",
    duration: 6000,
    action: (ctx) => {
      if (ctx.setRoute) ctx.setRoute("bookmarks");
    }
  },
  {
    id: "tour_complete",
    title: "Tour Complete: Welcome to ABM TaskIQ!",
    targetSelector: null,
    clickSelector: null,
    actionText: "Intro Tour Completed Successfully",
    whatHappensText:
      "You have explored the core features of the ABM Employee Portal. Employees can learn, complete tasks, access company knowledge, and collaborate effortlessly.",
    page: "complete",
    duration: 8000,
    action: (ctx) => {
      if (ctx.setRoute) ctx.setRoute("home");
    }
  }
];

export function IntroTourOverlay({
  active,
  onClose,
  route,
  setRoute,
  openItem,
  data,
  session
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const step = TOUR_STEPS[currentStepIndex];
  const timerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // If user is already logged in and at step 0 or 1, advance to employee dashboard
  useEffect(() => {
    if (active && session && currentStepIndex < 2) {
      setCurrentStepIndex(2);
    }
  }, [active, session]);

  // Update target rect for spotlight
  useEffect(() => {
    if (!active) return;

    function updateRect() {
      if (!step || !step.targetSelector) {
        setTargetRect(null);
        return;
      }
      const el = document.querySelector(step.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
      } else {
        setTargetRect(null);
      }
    }

    updateRect();
    const t = setTimeout(updateRect, 300);
    const interval = setInterval(updateRect, 800);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);

    return () => {
      clearTimeout(t);
      clearInterval(interval);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [active, currentStepIndex, route, session]);

  // Execute step action on step change
  useEffect(() => {
    if (!active || !step) return;

    setProgress(0);
    if (step.action) {
      step.action({ route, setRoute, openItem, data, session });
    }
  }, [active, currentStepIndex]);

  // Auto-play timer
  useEffect(() => {
    if (!active || !isPlaying || !step) return;

    const duration = step.duration || 5000;
    const intervalMs = 100;
    const increment = (intervalMs / duration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return prev + increment;
      });
    }, intervalMs);

    timerRef.current = setTimeout(() => {
      if (currentStepIndex < TOUR_STEPS.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [active, isPlaying, currentStepIndex]);

  if (!active) return null;

  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(session ? 2 : 0);
    setIsPlaying(true);
    setProgress(0);
  };

  return (
    <div className="portal-tour-overlay-container">
      {/* Target Spotlight Highlight */}
      {targetRect && (
        <div
          className="portal-tour-spotlight-box"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`
          }}
        >
          <div className="portal-tour-pointer-badge">
            <MousePointerClick size={14} /> Click Target
          </div>
        </div>
      )}

      {/* Top Floating Badge */}
      <div className="portal-tour-top-badge">
        <span className="tour-pulse-dot" />
        <span>EMPLOYEE PORTAL INTRO VIDEO & GUIDED WALKTHROUGH</span>
        <span className="tour-badge-pill">Step {currentStepIndex + 1} of {TOUR_STEPS.length}</span>
      </div>

      {/* Main Instruction HUD / Card */}
      <div className="portal-tour-hud-card">
        {/* Header bar with controls */}
        <div className="portal-tour-hud-header">
          <div className="portal-tour-hud-title-wrap">
            <span className="portal-tour-hud-step-tag">
              <Sparkles size={13} style={{ color: "#38bdf8" }} />
              {step.title}
            </span>
          </div>

          <div className="portal-tour-hud-controls">
            <button
              className="portal-tour-btn-ctrl"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              title="Previous Step"
            >
              <SkipBack size={14} /> Prev
            </button>

            <button
              className="portal-tour-btn-ctrl"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause Video Auto-advance" : "Resume Video Auto-advance"}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? "Pause" : "Play"}
            </button>

            <button
              className="portal-tour-btn-ctrl"
              onClick={handleNext}
              title="Next Step"
            >
              Next <SkipForward size={14} />
            </button>

            {isLast && (
              <button
                className="portal-tour-btn-ctrl restart"
                onClick={handleRestart}
                title="Restart Walkthrough"
              >
                <RotateCcw size={14} /> Replay
              </button>
            )}

            <button
              className="portal-tour-btn-close"
              onClick={onClose}
              title="Exit Walkthrough"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Details: What is Clicked & What Happens */}
        <div className="portal-tour-hud-body">
          <div className="portal-tour-row action-row">
            <div className="portal-tour-row-label">
              <MousePointerClick size={16} className="text-amber-400" />
              <span>CLICK ACTION</span>
            </div>
            <div className="portal-tour-row-value action-value">
              {step.actionText}
            </div>
          </div>

          <div className="portal-tour-row outcome-row">
            <div className="portal-tour-row-label">
              <Info size={16} className="text-sky-400" />
              <span>WHAT HAPPENS</span>
            </div>
            <div className="portal-tour-row-value outcome-value">
              {step.whatHappensText}
            </div>
          </div>
        </div>

        {/* Timer progress bar */}
        <div className="portal-tour-progress-track">
          <div
            className="portal-tour-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
