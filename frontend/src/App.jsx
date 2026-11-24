import React, { useCallback, useEffect, useMemo, useState } from "react";

const AI_URL = (import.meta.env.VITE_AI_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");

const emptyForm = {
  caption: "",
  ocrText: "",
  emojis: "",
  perturbEmojis: "",
  imageMood: "neutral",
  consistencyThreshold: 0.55,
  imageUrl: "",
  note: "",
};

const presets = [
  {
    label: "Sarcastic Meme",
    values: {
      caption: "Wah kya kismat payi hai maine",
      ocrText: "Best day ever",
      emojis: "😂🎉",
      imageMood: "negative",
      perturbEmojis: "",
      note: "Text/emoji positive vs negative face",
    },
  },
  {
    label: "Consistent Happy Meme",
    values: {
      caption: "Great teamwork and awesome launch today",
      ocrText: "Success",
      emojis: "😄🎉",
      imageMood: "positive",
      perturbEmojis: "",
      note: "All modalities aligned",
    },
  },
  {
    label: "Emoji Attack Simulation",
    values: {
      caption: "Good morning team",
      ocrText: "Good morning",
      emojis: "😄👍",
      imageMood: "positive",
      perturbEmojis: "😡💔😭",
      note: "Testing emoji perturbation robustness",
    },
  },
];

async function readJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.detail || `Request failed (${response.status})`);
  }
  return body;
}

function ScoreMeter({ score }) {
  const percent = Math.max(0, Math.min(100, Number(score || 0) * 100));
  return (
    <div className="meter-wrap">
      <div className="meter-label">
        <span>Modality consistency</span>
        <strong>{Number(score || 0).toFixed(2)}</strong>
      </div>
      <div className="meter">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="meter-scale">
        <span>0 · low</span>
        <span>1 · aligned</span>
      </div>
    </div>
  );
}

function SentimentBadge({ sentiment }) {
  const tone =
    sentiment === "Positive" ? "positive" : sentiment === "Negative" ? "negative" : "neutral";
  return <span className={`sentiment-badge ${tone}`}>{sentiment || "Unanalyzed"}</span>;
}

function ImagePreview({ url, compact = false }) {
  const [failedUrl, setFailedUrl] = useState("");
  if (!url) return compact ? <div className="preview-fallback small">No image preview</div> : null;
  if (failedUrl === url) {
    return (
      <div className={`preview-fallback${compact ? " small" : ""}`}>
        Image could not be loaded
      </div>
    );
  }
  return (
    <img
      className={compact ? "meme-preview" : "form-image-preview"}
      src={url}
      alt={compact ? "Saved meme preview" : "Image URL preview"}
      onError={() => setFailedUrl(url)}
      onLoad={() => setFailedUrl("")}
    />
  );
}

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [stats, setStats] = useState({
    totalCases: 0,
    conflictCases: 0,
    averageMcdScore: 0,
    flippedCases: 0,
  });
  const [records, setRecords] = useState([]);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [conflictOnly, setConflictOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [backendOnline, setBackendOnline] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (sentiment) params.set("sentiment", sentiment);
    if (conflictOnly) params.set("conflictOnly", "true");
    return params.toString();
  }, [search, sentiment, conflictOnly]);

  const refreshStats = useCallback(async () => {
    const data = await readJson(await fetch(`${API_URL}/memes/stats`));
    setStats(data);
  }, []);

  const refreshRecords = useCallback(
    async (query = queryString) => {
      const suffix = query ? `?${query}` : "";
      const data = await readJson(await fetch(`${API_URL}/memes${suffix}`));
      setRecords(data);
    },
    [queryString]
  );

  useEffect(() => {
    let active = true;
    Promise.all([refreshStats(), refreshRecords()])
      .then(() => {
        if (active) setBackendOnline(true);
      })
      .catch((error) => {
        if (active) {
          setBackendOnline(false);
          setPageError(
            `Backend unavailable: ${error.message}. Start the API and MongoDB, then refresh.`
          );
        }
      });
    return () => {
      active = false;
    };
  }, [refreshStats, refreshRecords]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshRecords().catch((error) =>
        setPageError(`Could not load experiments: ${error.message}`)
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [refreshRecords]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "consistencyThreshold" ? Number(value) : value,
    }));
  }

  function applyPreset(values) {
    setForm({ ...emptyForm, ...values });
    setResult(null);
    setSaveNotice("");
    setPageError("");
  }

  async function submitAnalysis(event) {
    event.preventDefault();
    setBusy(true);
    let analysisCompleted = false;
    setPageError("");
    setSaveNotice("");
    setResult(null);
    try {
      const analysis = await readJson(
        await fetch(`${AI_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: form.caption,
            ocr_text: form.ocrText,
            emojis: form.emojis,
            image_mood: form.imageMood,
            perturb_emojis: form.perturbEmojis || null,
            consistency_threshold: form.consistencyThreshold,
          }),
        })
      );
      analysisCompleted = true;
      setResult(analysis);

      const saved = await readJson(
        await fetch(`${API_URL}/memes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: form.caption,
            ocrText: form.ocrText,
            emojis: form.emojis,
            perturbEmojis: form.perturbEmojis,
            imageMood: form.imageMood,
            imageUrl: form.imageUrl,
            mcdScore: analysis.mcd_score,
            consistencyThreshold: analysis.consistency_threshold,
            fusionMode: analysis.fusion_mode,
            predictedSentiment: analysis.predicted_sentiment,
            isConflict: analysis.is_conflict,
            sentimentFlipped: analysis.perturbation_analysis?.sentiment_flipped || false,
            note: form.note,
          }),
        })
      );
      setSaveNotice(`Analysis saved (${saved._id}).`);
      setBackendOnline(true);
      await Promise.all([refreshRecords(), refreshStats()]);
    } catch (error) {
      setPageError(
        analysisCompleted
          ? `Analysis completed, but saving or refreshing failed: ${error.message}`
          : `Analysis failed: ${error.message}`
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecord(id) {
    setPageError("");
    try {
      await readJson(await fetch(`${API_URL}/memes/${id}`, { method: "DELETE" }));
      await Promise.all([refreshRecords(), refreshStats()]);
    } catch (error) {
      setPageError(`Could not delete experiment: ${error.message}`);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="MCD-DFusion home">
          <span className="brand-mark">M</span>
          <span>
            <strong>MCD-DFusion</strong>
            <small>Multimodal inspector</small>
          </span>
        </a>
        <div className="topbar-meta">
          <span className={`status-dot ${backendOnline ? "online" : ""}`} />
          {backendOnline ? "Database connected" : "Connecting to database"}
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span className="eyebrow-line" />
          RESEARCH PROTOTYPE · SOCIAL MEDIA NLP
        </div>
        <h1>
          When modalities disagree,
          <br />
          <span>see the full picture.</span>
        </h1>
        <p>
          Inspect sentiment consistency across captions, OCR, emojis, and image mood—then test how
          robust the result is to perturbation.
        </p>
        <div className="hero-foot">
          <span>01 / ANALYZE</span>
          <span>02 / FUSE</span>
          <span>03 / INSPECT</span>
        </div>
      </section>

      <section className="stats-grid" aria-label="Summary statistics">
        <StatCard label="Total analyzed cases" value={stats.totalCases} index="01" />
        <StatCard label="Conflict / low-MCD" value={stats.conflictCases} index="02" accent />
        <StatCard
          label="Average MCD score"
          value={Number(stats.averageMcdScore || 0).toFixed(2)}
          index="03"
        />
        <StatCard
          label="Flipped under perturbation"
          value={stats.flippedCases}
          index="04"
          accent
        />
      </section>

      {pageError && (
        <div className="alert error-alert" role="alert">
          {pageError}
          <button onClick={() => setPageError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <div className="workspace-grid">
        <section className="panel analysis-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">01 — INPUT</span>
              <h2>New analysis</h2>
            </div>
            <span className="panel-step">MCD / 01</span>
          </div>

          <div className="preset-block">
            <div className="field-caption">START WITH A SCENARIO</div>
            <div className="preset-row">
              {presets.map((preset) => (
                <button
                  className="preset-button"
                  key={preset.label}
                  onClick={() => applyPreset(preset.values)}
                  type="button"
                >
                  <span>{preset.label}</span>
                  <b>↗</b>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submitAnalysis}>
            <label className="field">
              <span>
                Caption <i>required</i>
              </span>
              <textarea
                name="caption"
                value={form.caption}
                onChange={updateField}
                required
                rows="2"
                placeholder="What does the post say?"
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>OCR text</span>
                <textarea
                  name="ocrText"
                  value={form.ocrText}
                  onChange={updateField}
                  rows="2"
                  placeholder="Text detected in the image"
                />
              </label>
              <label className="field">
                <span>Emojis</span>
                <input
                  name="emojis"
                  value={form.emojis}
                  onChange={updateField}
                  placeholder="😄 🎉"
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>
                  Perturbed emojis <i>optional</i>
                </span>
                <input
                  name="perturbEmojis"
                  value={form.perturbEmojis}
                  onChange={updateField}
                  placeholder="😡💔 — simulate an emoji attack"
                />
              </label>
              <label className="field">
                <span>Image mood</span>
                <select name="imageMood" value={form.imageMood} onChange={updateField}>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </label>
            </div>
            <label className="field threshold-field">
              <span>
                Consistency threshold{" "}
                <strong>{Number(form.consistencyThreshold).toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.01"
                name="consistencyThreshold"
                value={form.consistencyThreshold}
                onChange={updateField}
              />
              <span className="range-labels">
                <small>More tolerant · 0.10</small>
                <small>Strict · 0.90</small>
              </span>
            </label>
            <label className="field">
              <span>
                Image URL <i>optional</i>
              </span>
              <input
                type="url"
                name="imageUrl"
                value={form.imageUrl}
                onChange={updateField}
                placeholder="https://example.com/meme.jpg"
              />
              {form.imageUrl && <ImagePreview url={form.imageUrl} />}
            </label>
            <label className="field">
              <span>Research note</span>
              <input
                name="note"
                value={form.note}
                onChange={updateField}
                placeholder="Context or hypothesis for this experiment"
              />
            </label>
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Analyzing…" : "Analyze & Save to Database"}{" "}
              <span>{busy ? "◌" : "→"}</span>
            </button>
          </form>

          {saveNotice && (
            <div className="alert success-alert" role="status">
              {saveNotice}
            </div>
          )}
          {result && <ResultCard result={result} />}
        </section>

        <section className="panel explorer-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">02 — MEMORY</span>
              <h2>Saved experiments</h2>
            </div>
            <span className="record-count">
              {records.length.toString().padStart(2, "0")} RECORDS
            </span>
          </div>
          <div className="filters">
            <label className="search-field">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search captions, notes…"
                aria-label="Search experiments"
              />
            </label>
            <select
              value={sentiment}
              onChange={(event) => setSentiment(event.target.value)}
              aria-label="Filter by sentiment"
            >
              <option value="">All sentiments</option>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
              <option value="Neutral / Sarcastic">Neutral / Sarcastic</option>
            </select>
          </div>
          <label className="toggle-filter">
            <input
              type="checkbox"
              checked={conflictOnly}
              onChange={(event) => setConflictOnly(event.target.checked)}
            />
            <span className="toggle-track" />
            <span>Conflict cases only</span>
          </label>

          <div className="record-list">
            {records.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">∅</div>
                <strong>No experiments found</strong>
                <p>Run an analysis or adjust your filters to see saved cases here.</p>
              </div>
            ) : (
              records.map((record) => (
                <article className="record-card" key={record._id}>
                  {record.imageUrl && <ImagePreview url={record.imageUrl} compact />}
                  <div className="record-topline">
                    <span className="record-date">
                      {new Date(record.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <SentimentBadge sentiment={record.predictedSentiment} />
                  </div>
                  <h3>{record.caption}</h3>
                  <div className="record-meta">
                    <span>{record.emojis || "No emojis"}</span>
                    <span className="record-score">
                      MCD <b>{Number(record.mcdScore).toFixed(2)}</b>
                    </span>
                  </div>
                  <p className="record-fusion">{record.fusionMode}</p>
                  {record.note && <p className="record-note">{record.note}</p>}
                  <div className="record-bottom">
                    <span className={record.isConflict ? "conflict-label" : "aligned-label"}>
                      {record.isConflict ? "● Conflict detected" : "● Aligned"}
                    </span>
                    <button
                      className="delete-button"
                      onClick={() => deleteRecord(record._id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
      <footer>
        <span>MCD-DFUSION · RESEARCH PROTOTYPE</span>
        <span>CONSISTENCY-AWARE MULTIMODAL SENTIMENT</span>
      </footer>
    </main>
  );
}

function StatCard({ label, value, index, accent }) {
  return (
    <article className={`stat-card ${accent ? "stat-accent" : ""}`}>
      <span className="stat-index">{index} / 04</span>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function ResultCard({ result }) {
  const perturbation = result.perturbation_analysis;
  return (
    <section className="result-card" aria-live="polite">
      <div className="result-title">
        <div>
          <span className="section-kicker">ANALYSIS COMPLETE</span>
          <h3>Fusion result</h3>
        </div>
        <SentimentBadge sentiment={result.predicted_sentiment} />
      </div>
      <ScoreMeter score={result.mcd_score} />
      <div className={`threshold-callout ${result.is_conflict ? "is-conflict" : ""}`}>
        <span>
          {result.is_conflict
            ? "⚠ Consistency below threshold"
            : "✓ Consistency meets threshold"}
        </span>
        <small>
          MCD {Number(result.mcd_score).toFixed(2)} {result.is_conflict ? "<" : "≥"} threshold{" "}
          {Number(result.consistency_threshold).toFixed(2)}
        </small>
      </div>
      <div className="fusion-badge">
        <span>FUSION STRATEGY</span>
        <strong>{result.fusion_mode}</strong>
      </div>
      <div className="modality-grid">
        {Object.entries(result.modality_scores || {}).map(([key, value]) => (
          <div className="modality-score" key={key}>
            <span>{key.replace("_", " ")}</span>
            <b>{Number(value).toFixed(2)}</b>
          </div>
        ))}
      </div>
      {perturbation && (
        <div className="perturbation-box">
          <div>
            <span className="section-kicker">EMOJI PERTURBATION</span>
            <strong>
              {perturbation.sentiment_flipped ? "Sentiment flipped" : "Sentiment held"}
            </strong>
          </div>
          <div className="perturb-values">
            <span>
              Δ MCD{" "}
              <b>
                {perturbation.mcd_delta > 0 ? "+" : ""}
                {Number(perturbation.mcd_delta).toFixed(2)}
              </b>
            </span>
            <SentimentBadge sentiment={perturbation.perturbed_sentiment} />
          </div>
          <small>
            {perturbation.robust_under_perturbation
              ? "Robust: predicted sentiment stayed consistent."
              : "Not robust: predicted sentiment changed."}
          </small>
        </div>
      )}
    </section>
  );
}