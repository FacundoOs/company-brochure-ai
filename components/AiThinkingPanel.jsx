"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

/**
 * @param {{
 *   id: string,
 *   label: string,
 *   model?: string,
 *   content: string,
 *   active: boolean,
 *   done: boolean,
 * }} props
 */
export default function AiThinkingPanel({
  id,
  label,
  model,
  content,
  active,
  done,
}) {
  const bodyRef = useRef(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el && active) {
      el.scrollTop = el.scrollHeight;
    }
  }, [content, active]);

  const statusLabel = active ? "Thinking…" : done ? "Done" : "Waiting";

  return (
    <section
      className={`thinking-panel${active ? " thinking-panel-active" : ""}${done ? " thinking-panel-done" : ""}`}
      aria-labelledby={`thinking-${id}-title`}
    >
      <header className="thinking-header">
        <div className="thinking-header-left">
          <span className="thinking-pulse" aria-hidden />
          <h3 id={`thinking-${id}-title`} className="thinking-title">
            {label}
          </h3>
        </div>
        <div className="thinking-header-right">
          {model && <span className="thinking-model">{model}</span>}
          <span className="thinking-status">{statusLabel}</span>
        </div>
      </header>

      <div ref={bodyRef} className="thinking-body">
        {content ? (
          <div className="thinking-markdown">
            <ReactMarkdown>{content}</ReactMarkdown>
            {active && <span className="thinking-cursor" aria-hidden />}
          </div>
        ) : active ? (
          <p className="thinking-placeholder">Model is writing its analysis…</p>
        ) : (
          <p className="thinking-placeholder thinking-placeholder-muted">
            Will appear when this step runs.
          </p>
        )}
      </div>
    </section>
  );
}
