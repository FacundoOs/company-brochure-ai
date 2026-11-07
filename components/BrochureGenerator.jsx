"use client";

import { useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { PRESETS } from "@/lib/presets";
import AiActivityLog from "@/components/AiActivityLog";
import AiThinkingPanel from "@/components/AiThinkingPanel";

function DocumentIcon() {
  return (
    <svg
      className="empty-icon"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="8"
        y="4"
        width="32"
        height="40"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M16 16h16M16 24h16M16 32h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SkeletonLines() {
  return (
    <div className="brochure-skeleton" aria-hidden>
      <div className="skeleton-line wide" />
      <div className="skeleton-line medium" />
      <div className="skeleton-line wide" />
    </div>
  );
}

/**
 * @param {Array<{ id: string, title?: string, detail: string, status: string, data?: object }>} steps
 * @param {{ type: string, id?: string, phase?: string, title?: string, detail?: string, data?: object }} event
 */
function applyStepEvent(steps, event) {
  if (event.type !== "step") return steps;

  const status =
    event.phase === "start"
      ? "active"
      : event.phase === "error"
        ? "error"
        : "done";

  const title = event.title || "Scrape";

  if (event.phase === "start") {
    return [
      ...steps,
      {
        id: event.id,
        title,
        detail: event.detail || "",
        status: "active",
        data: event.data,
      },
    ];
  }

  const idx = steps.findIndex(
    (s) => s.id === event.id && s.status === "active"
  );
  if (idx === -1) {
    return [
      ...steps,
      { id: event.id, title, detail: event.detail || "", status, data: event.data },
    ];
  }

  const next = [...steps];
  next[idx] = {
    ...next[idx],
    detail: event.detail ?? next[idx].detail,
    status,
    data: { ...next[idx].data, ...event.data },
  };
  return next;
}

/**
 * @param {object} event
 * @param {object} handlers
 */
function handlePipelineEvent(event, handlers) {
  if (event.type === "step") {
    handlers.onStep(event);
  } else if (event.type === "thinking") {
    handlers.onThinking(event);
  } else if (event.type === "brochure" && event.chunk) {
    handlers.onBrochureChunk(event.chunk);
  } else if (event.type === "error") {
    throw new Error(event.message || "Pipeline error");
  } else if (event.type === "done") {
    handlers.onDone();
  }
}

export default function BrochureGenerator() {
  const [selectedId, setSelectedId] = useState(null);
  const [markdown, setMarkdown] = useState("");
  const [activitySteps, setActivitySteps] = useState([]);
  const [thinkingLinks, setThinkingLinks] = useState("");
  const [thinkingBrochure, setThinkingBrochure] = useState("");
  const [linksThinkingActive, setLinksThinkingActive] = useState(false);
  const [linksThinkingDone, setLinksThinkingDone] = useState(false);
  const [brochureThinkingActive, setBrochureThinkingActive] = useState(false);
  const [brochureThinkingDone, setBrochureThinkingDone] = useState(false);
  const [linksModel, setLinksModel] = useState("");
  const [brochureModel, setBrochureModel] = useState("");
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const selected = useMemo(
    () => PRESETS.find((p) => p.id === selectedId) ?? null,
    [selectedId]
  );

  const resetThinking = useCallback(() => {
    setThinkingLinks("");
    setThinkingBrochure("");
    setLinksThinkingActive(false);
    setLinksThinkingDone(false);
    setBrochureThinkingActive(false);
    setBrochureThinkingDone(false);
    setLinksModel("");
    setBrochureModel("");
  }, []);

  const generate = useCallback(async () => {
    if (!selectedId) {
      setStatus("Select a company to generate a brochure.");
      setIsError(true);
      return;
    }

    setLoading(true);
    setMarkdown("");
    setActivitySteps([]);
    resetThinking();
    setStatus("Starting pipeline…");
    setIsError(false);

    const handlers = {
      onStep: (event) => setActivitySteps((prev) => applyStepEvent(prev, event)),
      onThinking: (event) => {
        if (event.phase === "start") {
          if (event.id === "links") {
            setThinkingLinks("");
            setLinksThinkingActive(true);
            setLinksThinkingDone(false);
            setLinksModel(event.model || "");
            setStatus("OpenAI is analyzing which links matter…");
          }
          if (event.id === "brochure") {
            setThinkingBrochure("");
            setBrochureThinkingActive(true);
            setBrochureThinkingDone(false);
            setBrochureModel(event.model || "");
            setStatus("OpenAI is planning the brochure…");
          }
        } else if (event.phase === "end") {
          if (event.id === "links") {
            setLinksThinkingActive(false);
            setLinksThinkingDone(true);
          }
          if (event.id === "brochure") {
            setBrochureThinkingActive(false);
            setBrochureThinkingDone(true);
            setStatus("Streaming brochure…");
          }
        } else if (event.chunk) {
          if (event.id === "links") {
            setThinkingLinks((prev) => prev + event.chunk);
          }
          if (event.id === "brochure") {
            setThinkingBrochure((prev) => prev + event.chunk);
          }
        }
      },
      onBrochureChunk: (chunk) => {
        setMarkdown((prev) => prev + chunk);
      },
      onDone: () => {
        setStatus("Done — analysis and brochure were generated live.");
      },
    };

    try {
      const response = await fetch("/api/brochure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: selectedId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            handlePipelineEvent(JSON.parse(line), handlers);
          } catch {
            /* ignore malformed/partial NDJSON lines */
          }
        }
      }

      if (buffer.trim()) {
        try {
          handlePipelineEvent(JSON.parse(buffer), handlers);
        } catch {
          /* ignore trailing partial line */
        }
      }

      setIsError(false);
    } catch (err) {
      setIsError(true);
      setStatus(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setLinksThinkingActive(false);
      setBrochureThinkingActive(false);
    }
  }, [selectedId, resetThinking]);

  const clear = useCallback(() => {
    setMarkdown("");
    setActivitySteps([]);
    resetThinking();
    setStatus("");
    setIsError(false);
  }, [resetThinking]);

  const hasOutput =
    markdown || thinkingLinks || thinkingBrochure || activitySteps.length;

  const statusClass = [
    "status-bar",
    !status && "empty",
    loading && "loading",
    !loading && !isError && status && markdown && "success",
    isError && "error",
  ]
    .filter(Boolean)
    .join(" ");

  const showBrochureSkeleton =
    loading && !markdown && !brochureThinkingActive && !brochureThinkingDone;

  return (
    <section className="workspace" aria-label="Brochure generator">
      <aside className="panel panel-controls">
        <p className="panel-title">Choose a company</p>

        <div className="preset-grid" role="listbox" aria-label="Company presets">
          {PRESETS.map((preset) => {
            const isSelected = selectedId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`preset-card${isSelected ? " selected" : ""}`}
                onClick={() => setSelectedId(preset.id)}
                disabled={loading}
              >
                <span
                  className="preset-avatar"
                  style={{
                    background: `${preset.accent}18`,
                    color: preset.accent,
                    borderColor: `${preset.accent}40`,
                  }}
                >
                  {preset.initial}
                </span>
                <span className="preset-body">
                  <p className="preset-name">{preset.name}</p>
                  <p className="preset-desc">{preset.description}</p>
                </span>
                <span className="preset-tag">{preset.tag}</span>
              </button>
            );
          })}
        </div>

        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={generate}
            disabled={loading || !selectedId}
          >
            {loading && <span className="btn-spinner" aria-hidden />}
            {loading ? "Generating…" : "Generate brochure"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clear}
            disabled={loading || !hasOutput}
          >
            Clear
          </button>
        </div>

        <div className={statusClass} role="status" aria-live="polite">
          {status && <span className="status-dot" aria-hidden />}
          <span>{status}</span>
        </div>

        <AiActivityLog
          steps={activitySteps}
          emptyHint="Scraping only — AI reasoning appears in the panels on the right."
        />

        <p className="footer-note">
          Demo mode — curated URLs only. Rate limited to protect API usage.
        </p>
      </aside>

      <div className="output-column">
        <AiThinkingPanel
          id="links"
          label="AI analysis — which pages to use"
          model={linksModel}
          content={thinkingLinks}
          active={linksThinkingActive}
          done={linksThinkingDone}
        />

        <AiThinkingPanel
          id="brochure"
          label="AI analysis — brochure plan"
          model={brochureModel}
          content={thinkingBrochure}
          active={brochureThinkingActive}
          done={brochureThinkingDone}
        />

        <article className="panel output-panel">
          <header className="output-header">
            <h2 className="output-title">Brochure output</h2>
            {selected && (
              <span className="output-meta">{selected.name}</span>
            )}
          </header>

          <div
            className={`brochure-panel${!markdown && !showBrochureSkeleton ? " empty" : ""}`}
          >
            {showBrochureSkeleton ? (
              <SkeletonLines />
            ) : markdown ? (
              <div className="brochure-content">
                <ReactMarkdown>{markdown}</ReactMarkdown>
              </div>
            ) : (
              <>
                <DocumentIcon />
                <p className="empty-title">Brochure streams last</p>
                <p className="empty-desc">
                  After the model finishes its written analysis above, the
                  final brochure markdown appears here token by token.
                </p>
              </>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
