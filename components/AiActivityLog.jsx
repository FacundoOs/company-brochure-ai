"use client";

import { useEffect, useRef } from "react";

function StepIcon({ status }) {
  if (status === "active") {
    return <span className="activity-icon activity-icon-active" aria-hidden />;
  }
  if (status === "done") {
    return (
      <span className="activity-icon activity-icon-done" aria-hidden>
        ✓
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="activity-icon activity-icon-error" aria-hidden>
        !
      </span>
    );
  }
  return <span className="activity-icon" aria-hidden />;
}

function ChosenLinks({ links }) {
  if (!links?.length) return null;
  return (
    <ul className="activity-links">
      {links.map((link) => (
        <li key={link.url}>
          <span className="activity-link-type">{link.type}</span>
          <span className="activity-link-url">{link.url}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {{ steps: Array<{ id: string, title: string, detail: string, status: string, data?: object }>, emptyHint?: string }} props
 */
export default function AiActivityLog({ steps, emptyHint }) {
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [steps]);

  if (!steps.length) {
    return (
      <div className="activity-panel activity-panel-empty">
        <p className="panel-title">Scraping</p>
        <p className="activity-hint">
          {emptyHint ||
            "Fetch steps only. The model’s reasoning streams in the panels on the right."}
        </p>
      </div>
    );
  }

  return (
    <div className="activity-panel">
      <p className="panel-title">Scraping — live</p>
      <ol className="activity-list" ref={listRef} aria-live="polite">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`activity-item activity-item-${step.status}`}
          >
            <StepIcon status={step.status} />
            <div className="activity-body">
              <p className="activity-title">{step.title}</p>
              <p className="activity-detail">{step.detail}</p>
              {step.data?.chosen && <ChosenLinks links={step.data.chosen} />}
              {step.data?.model && step.id.startsWith("select") && (
                <p className="activity-meta">Model: {step.data.model}</p>
              )}
              {step.data?.model && step.id === "generate" && step.status === "active" && (
                <p className="activity-meta">Model: {step.data.model}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
