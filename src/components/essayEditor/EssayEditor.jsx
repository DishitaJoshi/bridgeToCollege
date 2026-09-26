import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../contexts/authContext';
import { db } from '../../firebase/firebase';
import { Link } from 'react-router-dom';
import {
    Folder,
    Plus,
    History,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Save,
    FileText,
    FolderPlus,
    Check,
    X,
    Loader2,
    PanelLeftOpen
} from 'lucide-react';
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from 'firebase/firestore';
import './essayEditor.css';


const DATA_PATH = 'artifacts/default-app-id/public/data/brainstorm-chats';

const MIN_SIDEBAR = 180;
const MAX_SIDEBAR = 500;
const MIN_AI = 200;
const MAX_AI = 600;

const EssayEditor = () => {
    const { currentUser, userLoggedIn } = useAuth();

    // Column widths (px); sidebar collapses to 0 when hidden
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [aiWidth, setAiWidth] = useState(320);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Drag state
    const draggingLeft = useRef(false);
    const draggingRight = useRef(false);
    const dragStartX = useRef(0);
    const dragStartW = useRef(0);

    const [folders, setFolders] = useState([]);
    const [essays, setEssays] = useState([]);
    const essaysRef = useRef([]); // always-fresh ref for use inside debounce
    const foldersRef = useRef([]);
    const [activeEssayId, setActiveEssayId] = useState(null);
    const activeEssayIdRef = useRef(null);
    const [activeVersionIndex, setActiveVersionIndex] = useState(0);
    const activeVersionIndexRef = useRef(0);
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [aiFeedback, setAiFeedback] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'

    const [namingFolder, setNamingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [namingEssay, setNamingEssay] = useState(false);
    const [newEssayName, setNewEssayName] = useState('');

    // Keep refs in sync
    useEffect(() => { essaysRef.current = essays; }, [essays]);
    useEffect(() => { foldersRef.current = folders; }, [folders]);
    useEffect(() => { activeEssayIdRef.current = activeEssayId; }, [activeEssayId]);
    useEffect(() => { activeVersionIndexRef.current = activeVersionIndex; }, [activeVersionIndex]);

    // ── Drag handlers ───────────────────────────────────────────────────
    const onMouseMoveGlobal = useCallback((e) => {
        if (draggingLeft.current) {
            const delta = e.clientX - dragStartX.current;
            const next = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, dragStartW.current + delta));
            setSidebarWidth(next);
        }
        if (draggingRight.current) {
            const delta = dragStartX.current - e.clientX;
            const next = Math.min(MAX_AI, Math.max(MIN_AI, dragStartW.current + delta));
            setAiWidth(next);
        }
    }, []);

    const onMouseUpGlobal = useCallback(() => {
        draggingLeft.current = false;
        draggingRight.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMoveGlobal);
        window.addEventListener('mouseup', onMouseUpGlobal);
        return () => {
            window.removeEventListener('mousemove', onMouseMoveGlobal);
            window.removeEventListener('mouseup', onMouseUpGlobal);
        };
    }, [onMouseMoveGlobal, onMouseUpGlobal]);

    const startDragLeft = (e) => {
        e.preventDefault();
        draggingLeft.current = true;
        dragStartX.current = e.clientX;
        dragStartW.current = sidebarWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const startDragRight = (e) => {
        e.preventDefault();
        draggingRight.current = true;
        dragStartX.current = e.clientX;
        dragStartW.current = aiWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    // ── Persistence ──────────────────────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            if (!currentUser) return;
            try {
                const docRef = doc(db, DATA_PATH, currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFolders(data.essay_folders || []);
                    setEssays(data.essay_list || []);
                }
            } catch (err) {
                console.error('Error loading essay data:', err);
                const localData = localStorage.getItem(`essay_data_${currentUser.uid}`);
                if (localData) {
                    const parsed = JSON.parse(localData);
                    setFolders(parsed.folders || []);
                    setEssays(parsed.essays || []);
                }
            }
        };
        loadData();
    }, [currentUser]);

    useEffect(() => {
        const activeEssay = essays.find(e => e.id === activeEssayId);
        if (activeEssay) {
            setTitle(activeEssay.name);
            const version = activeEssay.versions?.[activeVersionIndex] || activeEssay.versions?.[0];
            setContent(version?.content || '');
        } else {
            setTitle('');
            setContent('');
        }
    }, [activeEssayId, activeVersionIndex, essays]);

    const saveToFirestore = async (newFolders, newEssays, isAutoSave = false) => {
        if (!currentUser) return;
        if (!isAutoSave) setIsSaving(true);
        try {
            const docRef = doc(db, DATA_PATH, currentUser.uid);
            await setDoc(docRef, {
                essay_folders: newFolders,
                essay_list: newEssays,
                updatedAt: serverTimestamp()
            }, { merge: true });
            if (isAutoSave) setSaveStatus('saved');
        } catch (err) {
            console.error('Error saving to Firestore:', err);
            localStorage.setItem(`essay_data_${currentUser.uid}`, JSON.stringify({
                folders: newFolders,
                essays: newEssays
            }));
            if (isAutoSave) setSaveStatus('saved'); // local fallback still counts as saved
        }
        if (!isAutoSave) setIsSaving(false);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        const newFolders = [...folders, { id: Date.now().toString(), name: newFolderName.trim(), createdAt: new Date().toISOString() }];
        setFolders(newFolders);
        await saveToFirestore(newFolders, essays);
        setNewFolderName('');
        setNamingFolder(false);
    };

    const handleCreateEssay = async (folderId = null) => {
        if (!newEssayName.trim()) return;
        const newEssay = {
            id: Date.now().toString(),
            name: newEssayName.trim(),
            folderId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            versions: [{ id: Date.now().toString() + '-v1', versionName: 'Initial Draft', content: '', timestamp: new Date().toISOString() }]
        };
        const newEssays = [...essays, newEssay];
        setEssays(newEssays);
        setActiveEssayId(newEssay.id);
        setActiveVersionIndex(0);
        await saveToFirestore(folders, newEssays);
        setNewEssayName('');
        setNamingEssay(false);
    };

    const handleSaveVersion = async () => {
        if (!activeEssayId) return;
        const label = prompt('Version Label:') || `Version ${essays.find(e => e.id === activeEssayId).versions.length + 1}`;
        const newEssays = essays.map(e => {
            if (e.id === activeEssayId) {
                return { ...e, updatedAt: new Date().toISOString(), versions: [{ id: Date.now().toString(), versionName: label, content, timestamp: new Date().toISOString() }, ...(e.versions || [])] };
            }
            return e;
        });
        setEssays(newEssays);
        setActiveVersionIndex(0);
        await saveToFirestore(folders, newEssays);
    };

    // ── Debounced auto-save (Google Docs style) ───────────────────────
    const autoSaveTimer = useRef(null);

    useEffect(() => {
        if (!activeEssayIdRef.current) return;
        setSaveStatus('unsaved');
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(async () => {
            setSaveStatus('saving');
            const currentEssays = essaysRef.current;
            const idx = activeVersionIndexRef.current;
            const updatedEssays = currentEssays.map(e => {
                if (e.id === activeEssayIdRef.current) {
                    const updatedVersions = [...(e.versions || [])];
                    if (updatedVersions[idx]) {
                        updatedVersions[idx] = { ...updatedVersions[idx], content, timestamp: new Date().toISOString() };
                    }
                    return { ...e, updatedAt: new Date().toISOString(), versions: updatedVersions };
                }
                return e;
            });
            essaysRef.current = updatedEssays;
            setEssays(updatedEssays);
            await saveToFirestore(foldersRef.current, updatedEssays, true);
        }, 1500);
        return () => clearTimeout(autoSaveTimer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    const getAIFeedback = async () => {
        if (!content) return;
        setIsAILoading(true);
        setAiFeedback('');
        try {
            const res = await fetch(
                `/api/gemini`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: `You are an expert college admissions counselor. Provide concrete, actionable feedback on the following essay draft for a high school student applying to university. Focus on structure, tone, clarity, and how well it showcases the student's personality. Keep the tone encouraging but professional.\n\nESSAY CONTENT:\n${content}` }] }],
                    }),
                }
            );
            const data = await res.json();
            setAiFeedback(data?.candidates?.[0]?.content?.parts?.[0]?.text || 'AI Counselor was unable to provide feedback at this time.');
        } catch (err) {
            console.error('Gemini error:', err);
            setAiFeedback('❌ Error talking to Gemini. Please check your connection.');
        }
        setIsAILoading(false);
    };

    if (!userLoggedIn) {
        return (
            <div className="essay-editor-page auth-error">
                <div className="auth-message-card">
                    <Sparkles size={48} />
                    <h2>Start Your Essay Journey</h2>
                    <p>Please log in to use the Essay Editor, save your drafts, and get AI feedback.</p>
                    <Link to="/login" className="login-prompt-btn">Log In to My College Quest</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="essay-editor-page">

            {/* ── Floating reopen button (visible only when sidebar is closed) ── */}
            {!isSidebarOpen && (
                <button
                    className="sidebar-reopen-btn"
                    onClick={() => setIsSidebarOpen(true)}
                    title="Open sidebar"
                >
                    <PanelLeftOpen size={18} />
                </button>
            )}

            {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
            <aside
                className="editor-sidebar"
                style={{ width: isSidebarOpen ? sidebarWidth : 0, minWidth: isSidebarOpen ? MIN_SIDEBAR : 0 }}
            >
                <div className="sidebar-header">
                    <h3>My Essays</h3>
                    <button onClick={() => setIsSidebarOpen(false)} className="collapse-toggle" title="Collapse sidebar">
                        <ChevronLeft size={20} />
                    </button>
                </div>

                <div className="sidebar-content">
                    {/* Folders */}
                    <div className="section">
                        <div className="section-header">
                            <span>Folders</span>
                            <button className="icon-btn" onClick={() => setNamingFolder(true)} title="Add Folder"><FolderPlus size={18} /></button>
                        </div>
                        {namingFolder && (
                            <div className="inline-naming">
                                <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} placeholder="Folder name..." />
                                <div className="naming-actions">
                                    <button onClick={handleCreateFolder} className="naming-save"><Check size={16} /></button>
                                    <button onClick={() => setNamingFolder(false)} className="naming-cancel"><X size={16} /></button>
                                </div>
                            </div>
                        )}
                        <ul className="folder-list">
                            {folders.map(f => <li key={f.id} className="folder-item"><Folder size={16} /> {f.name}</li>)}
                        </ul>
                    </div>

                    {/* Essays */}
                    <div className="section">
                        <div className="section-header">
                            <span>Essays</span>
                            <button className="icon-btn" onClick={() => setNamingEssay(true)} title="Add Essay"><Plus size={18} /></button>
                        </div>
                        {namingEssay && (
                            <div className="inline-naming">
                                <input autoFocus value={newEssayName} onChange={e => setNewEssayName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateEssay()} placeholder="Essay title..." />
                                <div className="naming-actions">
                                    <button onClick={() => handleCreateEssay()} className="naming-save"><Check size={16} /></button>
                                    <button onClick={() => setNamingEssay(false)} className="naming-cancel"><X size={16} /></button>
                                </div>
                            </div>
                        )}
                        <ul className="essay-list">
                            {essays.map(e => (
                                <li key={e.id} className={`essay-item ${activeEssayId === e.id ? 'active' : ''}`} onClick={() => { setActiveEssayId(e.id); setActiveVersionIndex(0); }}>
                                    <FileText size={16} /> {e.name}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Version history */}
                    {activeEssayId && (
                        <div className="section history-section">
                            <div className="section-header">
                                <span>Version History</span>
                                <button className="icon-btn" onClick={handleSaveVersion} title="Save new version"><Save size={18} /></button>
                            </div>
                            <ul className="version-list">
                                {essays.find(e => e.id === activeEssayId)?.versions?.map((v, idx) => (
                                    <li key={v.id} className={`version-item ${activeVersionIndex === idx ? 'active' : ''}`} onClick={() => setActiveVersionIndex(idx)}>
                                        <History size={14} />
                                        <div className="version-info">
                                            <span className="v-name">{v.versionName}</span>
                                            <span className="v-time">{new Date(v.timestamp).toLocaleDateString()}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── DRAG HANDLE: left divider ─────────────────────────────────── */}
            {isSidebarOpen && (
                <div className="drag-handle" onMouseDown={startDragLeft} title="Drag to resize" />
            )}

            {/* ── MAIN EDITOR ───────────────────────────────────────────────── */}
            <main className="editor-main">
                <header className="editor-header">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Essay Title..." className="essay-title-input" />
                    <div className="editor-actions">
                        {activeEssayId && (
                            <span className={`save-status save-status--${saveStatus}`}>
                                {saveStatus === 'unsaved' && '● Unsaved'}
                                {saveStatus === 'saving' && '↻ Saving…'}
                                {saveStatus === 'saved' && '✓ Saved'}
                            </span>
                        )}
                        <button className="ai-btn" onClick={getAIFeedback} disabled={!content || isAILoading}>
                            {isAILoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            {isAILoading ? 'Analyzing...' : 'Get AI Feedback'}
                        </button>
                    </div>
                </header>
                <div className="editor-container">
                    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Start typing your essay here..." className="essay-textarea" />
                </div>
            </main>

            {/* ── DRAG HANDLE: right divider ────────────────────────────────── */}
            <div className="drag-handle" onMouseDown={startDragRight} title="Drag to resize" />

            {/* ── AI PANEL ──────────────────────────────────────────────────── */}
            <section className="ai-panel" style={{ width: aiWidth, minWidth: MIN_AI }}>
                <div className="ai-panel-header">
                    <Sparkles size={20} />
                    <h3>AI Counselor Feedback</h3>
                </div>
                <div className="ai-panel-content">
                    {isAILoading ? (
                        <div className="ai-loading">
                            <Loader2 size={30} className="animate-spin spinner" />
                            <p>Analyzing your essay structure and tone...</p>
                        </div>
                    ) : aiFeedback ? (
                        <div className="feedback-text"><ReactMarkdown>{aiFeedback}</ReactMarkdown></div>
                    ) : (
                        <div className="ai-placeholder">
                            <Sparkles size={40} opacity={0.2} />
                            <p>Click "Get AI Feedback" to receive suggestions on your essay's structure, tone, and clarity.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default EssayEditor;
