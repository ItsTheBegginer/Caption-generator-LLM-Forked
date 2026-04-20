import { useMemo, useRef, useState, useEffect } from "react";
import {
  Camera,
  Sparkles,
  Wand2,
  Upload,
  Download,
  Check,
  ShieldCheck,
  ShieldAlert,
  BookOpen,
} from "lucide-react";

const TONES = [
  {
    value: "casual",
    label: "Casual",
    description: "Relaxed, witty captions with a light vibe.",
    icon: Sparkles,
  },
  {
    value: "professional",
    label: "Professional",
    description: "Polished and business-ready language.",
    icon: Wand2,
  },
  {
    value: "promotional",
    label: "Promotional",
    description: "Bold calls-to-action with marketing flair.",
    icon: Download,
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm, upbeat energy for everyday sharing.",
    icon: Camera,
  },
  {
    value: "informative",
    label: "Informative",
    description: "Clear, descriptive explanations of the scene.",
    icon: Upload,
  },
];


export default function Home() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [tone, setTone] = useState(null);
  const [captions, setCaptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [nsfwResult, setNsfwResult] = useState(null);
  const [nsfwLoading, setNsfwLoading] = useState(false);
  const [nsfwError, setNsfwError] = useState(null);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [storyFiles, setStoryFiles] = useState([]);
  const [storyResult, setStoryResult] = useState(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState(null);
  const [displayedStory, setDisplayedStory] = useState("");

  useEffect(() => {
    if (storyResult?.story) {
      let i = 0;
      setDisplayedStory("");
      const fullText = storyResult.story;
      const interval = setInterval(() => {
        setDisplayedStory(prev => prev + fullText.charAt(i));
        i++;
        if (i >= fullText.length) {
          clearInterval(interval);
        }
      }, 40);
      return () => clearInterval(interval);
    }
  }, [storyResult]);

  const step = useMemo(() => {
    if (!file) return 1;
    if (!tone) return 2;
    return 3;
  }, [file, tone]);

  const apiBase = "http://127.0.0.1:8000";

  const handleFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    setTone(null);
    setCaptions([]);
    setCopiedIndex(null);
    setError(null);
    setNsfwResult(null);
    setNsfwLoading(false);
    setNsfwError(null);
    const url = URL.createObjectURL(selected);
    setPreview(url);
  };

  const onFileChange = (event) => {
    const selected = Array.from(event.target.files);
    if (!selected.length) return;
    if (isStoryMode) {
      handleStoryFiles(selected);
    } else {
      handleFile(selected[0]);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const selected = Array.from(event.dataTransfer.files);
    if (!selected.length) return;
    if (isStoryMode) {
      handleStoryFiles(selected);
    } else {
      handleFile(selected[0]);
    }
  };

  const handleStoryFiles = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const valids = filesList.slice(0, 5);
    setStoryFiles(valids);
    setStoryResult(null);
    setStoryError(null);
    setDisplayedStory("");
    setNsfwResult(null);
    setCaptions([]);
    const urls = valids.map(f => URL.createObjectURL(f));
    setPreview(urls);
  };

  const onDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const generateStory = async () => {
    if (storyFiles.length === 0) return;
    setStoryLoading(true);
    setStoryError(null);
    setDisplayedStory("");

    try {
      const form = new FormData();
      storyFiles.forEach(f => form.append("files", f));
      
      const response = await fetch(`${apiBase}/generate-story`, {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data = await response.json();
      if (data.status === "success") {
        setStoryResult(data);
      } else {
        throw new Error(data.message || "Failed to generate story.");
      }
    } catch (err) {
      setStoryError(err.message || "Something went wrong.");
    } finally {
      setStoryLoading(false);
    }
  };

  const checkSafety = async () => {
    if (!file) return;
    setNsfwLoading(true);
    setNsfwError(null);
    
    try {
      const form = new FormData();
      form.append("file", file);
      
      const response = await fetch(`${apiBase}/check-nsfw`, {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data = await response.json();
      if (data.status === "success") {
        setNsfwResult(data.result);
      } else {
        throw new Error(data.message || "Failed to check image safety.");
      }
    } catch (err) {
      setNsfwError(err.message || "Failed to determine image safety.");
    } finally {
      setNsfwLoading(false);
    }
  };

  const generateCaptions = async (nextTone = tone) => {
  if (!file || !nextTone) return;

  setLoading(true);
  setCopiedIndex(null);
  setError(null);

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("tone", nextTone);
    form.append("num_captions", "3");

    const response = await fetch(`${apiBase}/generate`, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const data = await response.json();
    setCaptions(data.styled || data.captions || []);
  } catch (err) {
    setError(err.message || "Failed to generate captions.");
  } finally {
    setLoading(false);
  }
};

  const onSelectTone = (value) => {
    setTone(value);
    generateCaptions(value);
  };

  const onCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1600);
    } catch (err) {
      setCopiedIndex(null);
    }
  };

  const resetAll = () => {
    setFile(null);
    setStoryFiles([]);
    setPreview(null);
    setTone(null);
    setCaptions([]);
    setCopiedIndex(null);
    setLoading(false);
    setError(null);
    setNsfwResult(null);
    setNsfwLoading(false);
    setNsfwError(null);
    setStoryResult(null);
    setStoryError(null);
    setDisplayedStory("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f0f0f",
    padding: "48px 20px",
    fontFamily: "Inter, sans-serif",
    color: "#f5f5f5",
  },

  shell: {
    maxWidth: 1000,
    margin: "0 auto",
  },

  header: {
    textAlign: "center",
    marginBottom: 40,
  },

  title: {
    fontSize: "2.5rem",
    margin: 0,
    fontWeight: 600,
    letterSpacing: "-0.03em",
  },

  tagline: {
    marginTop: 8,
    color: "#a1a1a1",
    fontSize: "0.95rem",
  },

  card: {
    background: "#1a1a1a",
    borderRadius: 12,
    padding: "28px",
    border: "1px solid #2a2a2a",
  },

  stepper: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    marginBottom: 24,
  },

  stepBadge: (active) => ({
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: "0.8rem",
    background: active ? "#ffffff" : "#2a2a2a",
    color: active ? "#000" : "#aaa",
  }),

  uploadZone: {
    border: "1px dashed #3a3a3a",
    borderRadius: 10,
    padding: "36px",
    textAlign: "center",
    background: "#141414",
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
    marginTop: 18,
  },

  toneCard: (active) => ({
    padding: 16,
    borderRadius: 10,
    border: active ? "1px solid #fff" : "1px solid #2a2a2a",
    background: "#161616",
    cursor: "pointer",
    transition: "all 0.2s ease",
  }),

  toneIcon: {
    marginBottom: 8,
  },

  captionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
    marginTop: 18,
  },

  captionCard: {
    background: "#141414",
    border: "1px solid #2a2a2a",
    padding: 16,
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  captionIndex: {
    fontSize: "0.8rem",
    color: "#888",
  },

  buttonRow: {
    marginTop: 20,
  },

  buttonPrimary: {
    background: "#ffffff",
    color: "#000",
    border: "none",
    padding: "10px 18px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
  },

  buttonGhost: {
    background: "transparent",
    color: "#ddd",
    border: "1px solid #2a2a2a",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },

  previewImage: {
    width: "100%",
    maxHeight: 320,
    objectFit: "cover",
    borderRadius: 8,
    marginTop: 16,
  },

  spinner: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "3px solid #2a2a2a",
    borderTopColor: "#fff",
    animation: "spin 1s linear infinite",
    margin: "0 auto",
  },

  error: {
    marginTop: 12,
    background: "#2a1a1a",
    color: "#ff7b7b",
    padding: "10px",
    borderRadius: 6,
  },
};

  return (
    <div style={styles.page}>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap");
        * {
          box-sizing: border-box;
        }
        button:hover {
          transform: translateY(-2px);
        }
        button:active {
          transform: translateY(0);
        }
        .lift:hover {
          transform: translateY(-6px);
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>

      <div style={styles.shell}>
        <header style={styles.header}>
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontSize: 12,
            }}
          >
            AI Image Captioning
          </p>
          <h1 style={styles.title}>Caption Magic</h1>
          <p style={styles.tagline}>
            Transform any image into polished, on-brand captions with a single
            flow.
          </p>
          <div style={{ display: 'inline-flex', background: '#1a1a1a', padding: 4, borderRadius: 24, margin: '20px auto 0', border: '1px solid #2a2a2a' }}>
            <button onClick={() => { setIsStoryMode(false); resetAll(); }} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: !isStoryMode ? '#6c63ff' : 'transparent', color: !isStoryMode ? '#fff' : '#888', fontWeight: 600, transition: "0.2s" }}>Standard Mode</button>
            <button onClick={() => { setIsStoryMode(true); resetAll(); }} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: isStoryMode ? '#6c63ff' : 'transparent', color: isStoryMode ? '#fff' : '#888', fontWeight: 600, transition: "0.2s" }}>Story Mode</button>
          </div>
        </header>

        <section style={styles.card}>
          <div style={styles.stepper}>
            {isStoryMode 
              ? ["Upload up to 5 Images", "Generate", "Read Story"].map((label, index) => (
                  <span key={label} style={styles.stepBadge(step === index + 1)}>{index + 1}. {label}</span>
                ))
              : ["Upload Image", "Select Tone", "View Captions"].map((label, index) => (
                <span key={label} style={styles.stepBadge(step === index + 1)}>
                  {index + 1}. {label}
                </span>
              ))}
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            <div
              style={styles.uploadZone}
              onClick={() => inputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <div style={styles.circleIcon}>
                <Camera size={34} color="#6c63ff" />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.4rem" }}>
                Drop your image here
              </h3>
              <p style={{ margin: "8px 0 0", color: "#585070" }}>
                Drag and drop or browse your files to get started.
              </p>
              <button style={{ ...styles.buttonPrimary, marginTop: 16 }}>
                Browse Files
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple={isStoryMode}
                accept="image/*"
                onChange={onFileChange}
                style={{ display: "none" }}
              />
            </div>

            {preview && isStoryMode ? (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginTop: 16 }}>
                 {preview.map((src, i) => <img key={i} src={src} alt="Preview" style={{ height: 120, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />)}
              </div>
            ) : preview && !isStoryMode ? (
              <img src={preview} alt="Preview" style={styles.previewImage} />
            ) : null}

            {(isStoryMode && storyFiles.length > 0) ? (
               <div>
                  <h2 style={{ fontFamily: '"Playfair Display", serif', marginBottom: 6 }}>Narrative AI</h2>
                  <p style={{ marginTop: 0, color: "#585070" }}>Combine {storyFiles.length} images into a unique generated story.</p>
                  
                  {!storyLoading && !storyResult && (
                      <button style={{...styles.buttonPrimary, padding: "12px 24px"}} onClick={generateStory}>
                        <BookOpen size={16} style={{verticalAlign: 'text-bottom', marginRight: 8}} /> Generate Story
                      </button>
                  )}

                  {storyLoading && (
                      <div style={{ marginTop: 24, textAlign: "center" }}>
                        <div style={styles.spinner} />
                        <p style={{ color: "#585070" }}>Weaving your narrative...</p>
                      </div>
                  )}

                  {storyError && <div style={styles.error}>{storyError}</div>}

                  {storyResult && (
                     <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", padding: 24, borderRadius: 12, marginTop: 20 }}>
                        <p style={{ fontSize: '1.2rem', lineHeight: '1.6', fontFamily: 'Georgia, serif', color: '#fff', margin: 0 }}>
                           {displayedStory}
                           <span style={{ display: 'inline-block', width: 8, height: 16, background: '#6c63ff', marginLeft: 4, animation: 'pulse 1s infinite' }}></span>
                        </p>
                        <button style={{...styles.buttonGhost, marginTop: 24}} onClick={resetAll}>Start Over</button>
                     </div>
                  )}
               </div>
            ) : null}

            {(!isStoryMode && file) ? (
              <div>
                <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 30 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Content Moderation</h3>
                      <p style={{ margin: "4px 0 0", color: "#888", fontSize: "0.9rem" }}>Check if the uploaded image is safe for work.</p>
                    </div>
                    {!nsfwResult && !nsfwLoading && (
                       <button style={styles.buttonPrimary} onClick={checkSafety}>Check Image Safety</button>
                    )}
                    {nsfwLoading && (
                       <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{...styles.spinner, width: 20, height: 20, borderWidth: 2}}></div><span style={{color: "#888"}}>Analyzing...</span></div>
                    )}
                  </div>
                  {nsfwError && <div style={styles.error}>{nsfwError}</div>}
                  {nsfwResult && (
                      <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: nsfwResult.safe ? "rgba(31, 157, 85, 0.1)" : "rgba(255, 123, 123, 0.1)", border: `1px solid ${nsfwResult.safe ? "#1f9d55" : "#ff7b7b"}`, display: "flex", alignItems: "center", gap: 12 }}>
                        {nsfwResult.safe ? <ShieldCheck size={28} color="#1f9d55" /> : <ShieldAlert size={28} color="#ff7b7b" />}
                        <div>
                           <h4 style={{ margin: 0, color: nsfwResult.safe ? "#1f9d55" : "#ff7b7b" }}>{nsfwResult.safe ? "Safe Image" : "Unsafe Image"}</h4>
                           <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#ccc" }}>Confidence: {(nsfwResult.safe ? nsfwResult.details.normal : nsfwResult.details.nsfw).toFixed(2)}</p>
                        </div>
                      </div>
                  )}
                </div>

                <h2
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    marginBottom: 6,
                  }}
                >
                  Choose a tone
                </h2>
                <p style={{ marginTop: 0, color: "#585070" }}>
                  Each tone shifts the language, pacing, and energy of your
                  captions.
                </p>
                <div style={styles.grid}>
                  {TONES.map((toneOption, index) => {
                    const Icon = toneOption.icon;
                    const active = tone === toneOption.value;
                    return (
                      <div
                        key={toneOption.value}
                        style={{
                          ...styles.toneCard(active),
                          animation: `slideIn 0.5s ease ${index * 0.08}s both`,
                        }}
                        className="lift"
                        onClick={() => onSelectTone(toneOption.value)}
                      >
                        <div style={styles.toneIcon}>
                          <Icon size={20} color="#6c63ff" />
                        </div>
                        <h3 style={{ margin: "4px 0" }}>{toneOption.label}</h3>
                        <p style={{ margin: 0, color: "#585070" }}>
                          {toneOption.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {tone ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontFamily: '"Playfair Display", serif',
                        marginBottom: 6,
                      }}
                    >
                      Generated captions
                    </h2>
                    <p style={{ marginTop: 0, color: "#585070" }}>
                      Tone selected: <strong>{tone}</strong>
                    </p>
                  </div>
                  <button
                    style={styles.buttonPrimary}
                    onClick={() => generateCaptions(tone)}
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "Try Different Tone"}
                  </button>
                </div>

                {error ? <div style={styles.error}>{error}</div> : null}

                {loading ? (
                  <div style={{ marginTop: 24, textAlign: "center" }}>
                    <div style={styles.spinner} />
                    <p style={{ color: "#585070" }}>
                      Captions are coming to life...
                    </p>
                    <div style={styles.captionGrid}>
                      {[0, 1, 2].map((idx) => (
                        <div key={idx} style={styles.shimmer} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={styles.captionGrid}>
                    {captions.map((caption, idx) => (
                      <div
                        key={`${caption}-${idx}`}
                        style={{
                          ...styles.captionCard,
                          animation: `fadeIn 0.4s ease ${idx * 0.1}s both`,
                        }}
                      >
                        <span style={styles.captionIndex}>0{idx + 1}</span>
                        <p style={{ margin: 0 }}>{caption}</p>
                        <button
                          style={{
                            ...styles.buttonGhost,
                            alignSelf: "flex-start",
                            display: "inline-flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                          onClick={() => onCopy(caption, idx)}
                        >
                          {copiedIndex === idx ? (
                            <Check size={16} color="#1f9d55" />
                          ) : (
                            <Copy size={16} />
                          )}
                          {copiedIndex === idx ? "Copied" : "Copy"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={styles.buttonRow}>
                  <button style={styles.buttonGhost} onClick={resetAll}>
                    Start Over
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
