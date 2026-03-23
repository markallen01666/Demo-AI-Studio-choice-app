import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  BrainCircuit, 
  Scale, 
  Dices, 
  History, 
  Save, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Loader2,
  Trophy,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Decision, Option, Criterion } from './types';
import { analyzeDecision } from './services/geminiService';

// --- Components ---

const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    {...props}
    className={cn("bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden", className)}
  >
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled,
  loading
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}) => {
  const variants = {
    primary: "bg-black text-white hover:bg-black/90",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    outline: "border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
    ghost: "text-zinc-600 hover:bg-zinc-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

const Input = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props}
    className={cn(
      "w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all",
      props.className
    )}
  />
);

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'home' | 'create' | 'decide' | 'history'>('home');
  const [history, setHistory] = useState<Decision[]>([]);
  const [currentDecision, setCurrentDecision] = useState<Partial<Decision>>({
    title: '',
    description: '',
    type: 'pros-cons',
    options: [
      { id: '1', name: 'Option 1', pros: [], cons: [] },
      { id: '2', name: 'Option 2', pros: [], cons: [] }
    ],
    criteria: [
      { id: 'c1', name: 'Cost', weight: 5 },
      { id: 'c2', name: 'Impact', weight: 8 }
    ]
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<Decision | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('decidewise_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (decision: Decision) => {
    const newHistory = [decision, ...history];
    setHistory(newHistory);
    localStorage.setItem('decidewise_history', JSON.stringify(newHistory));
  };

  const handleStartNew = (type: Decision['type']) => {
    setCurrentDecision({
      title: '',
      description: '',
      type,
      options: [
        { id: Math.random().toString(36).substr(2, 9), name: '', pros: [], cons: [], scores: {} },
        { id: Math.random().toString(36).substr(2, 9), name: '', pros: [], cons: [], scores: {} }
      ],
      criteria: [
        { id: 'c1', name: 'Cost', weight: 5 },
        { id: 'c2', name: 'Impact', weight: 8 }
      ]
    });
    setView('create');
  };

  const addOption = () => {
    setCurrentDecision(prev => ({
      ...prev,
      options: [
        ...(prev.options || []),
        { id: Math.random().toString(36).substr(2, 9), name: '', pros: [], cons: [], scores: {} }
      ]
    }));
  };

  const removeOption = (id: string) => {
    setCurrentDecision(prev => ({
      ...prev,
      options: (prev.options || []).filter(o => o.id !== id)
    }));
  };

  const updateOptionName = (id: string, name: string) => {
    setCurrentDecision(prev => ({
      ...prev,
      options: (prev.options || []).map(o => o.id === id ? { ...o, name } : o)
    }));
  };

  const addCriterion = () => {
    setCurrentDecision(prev => ({
      ...prev,
      criteria: [
        ...(prev.criteria || []),
        { id: Math.random().toString(36).substr(2, 9), name: '', weight: 5 }
      ]
    }));
  };

  const updateCriterion = (id: string, updates: Partial<Criterion>) => {
    setCurrentDecision(prev => ({
      ...prev,
      criteria: (prev.criteria || []).map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const updateScore = (optionId: string, criterionId: string, score: number) => {
    setCurrentDecision(prev => ({
      ...prev,
      options: (prev.options || []).map(o => 
        o.id === optionId 
          ? { ...o, scores: { ...(o.scores || {}), [criterionId]: score } } 
          : o
      )
    }));
  };

  const handleAnalyze = async () => {
    if (!currentDecision.title || !currentDecision.options?.every(o => o.name)) {
      alert("Please fill in the title and all option names.");
      return;
    }

    if (currentDecision.type === 'quick') {
      const finalDecision: Decision = {
        ...currentDecision as Decision,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
      };
      setCurrentDecision(finalDecision);
      saveToHistory(finalDecision);
      setView('decide');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeDecision(
        currentDecision.title!,
        currentDecision.description || '',
        currentDecision.options!.map(o => ({
          name: o.name,
          pros: o.pros || [],
          cons: o.cons || []
        }))
      );
      
      const finalDecision: Decision = {
        ...currentDecision as Decision,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
        aiAnalysis: result
      };
      
      setCurrentDecision(finalDecision);
      saveToHistory(finalDecision);
      setView('decide');
    } catch (error) {
      console.error("Analysis failed", error);
      alert("AI Analysis failed. Showing manual results.");
      setView('decide');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateMatrixScores = (decision: Partial<Decision>) => {
    if (!decision.options || !decision.criteria) return [];
    
    return decision.options.map(option => {
      let total = 0;
      let maxPossible = 0;
      decision.criteria!.forEach(criterion => {
        const score = option.scores?.[criterion.id] || 5;
        total += score * criterion.weight;
        maxPossible += 10 * criterion.weight;
      });
      return {
        id: option.id,
        name: option.name,
        score: total,
        percentage: maxPossible > 0 ? (total / maxPossible) * 100 : 0
      };
    }).sort((a, b) => b.score - a.score);
  };

  const renderHome = () => (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="mb-12 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-black text-white rounded-2xl mb-6"
        >
          <BrainCircuit className="w-8 h-8" />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-bold tracking-tight text-zinc-900 mb-4"
        >
          Make Better Decisions
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-zinc-500 max-w-xl mx-auto"
        >
          Choose the right tool for your choice. From quick flips to complex weighted matrices.
        </motion.p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="p-6 hover:border-black/20 transition-all cursor-pointer group" onClick={() => handleStartNew('pros-cons')}>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Scale className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Balance Sheet</h3>
          <p className="text-sm text-zinc-500 mb-4">Classic Pros & Cons list with AI-powered analysis of trade-offs.</p>
          <div className="flex items-center text-sm font-medium text-black">
            Start <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </Card>

        <Card className="p-6 hover:border-black/20 transition-all cursor-pointer group" onClick={() => handleStartNew('matrix')}>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Weighted Matrix</h3>
          <p className="text-sm text-zinc-500 mb-4">Score options against weighted criteria for objective results.</p>
          <div className="flex items-center text-sm font-medium text-black">
            Start <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </Card>

        <Card className="p-6 hover:border-black/20 transition-all cursor-pointer group" onClick={() => handleStartNew('quick')}>
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Dices className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Quick Pick</h3>
          <p className="text-sm text-zinc-500 mb-4">Sometimes you just need a random choice. Let fate decide.</p>
          <div className="flex items-center text-sm font-medium text-black">
            Start <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </Card>
      </div>

      {history.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5" /> Recent Decisions
            </h2>
            <Button variant="ghost" onClick={() => setView('history')}>View All</Button>
          </div>
          <div className="space-y-4">
            {history.slice(0, 3).map(item => (
              <Card key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 cursor-pointer" onClick={() => {
                setSelectedHistoryItem(item);
                setView('decide');
              }}>
                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-xs text-zinc-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 bg-zinc-100 rounded-full text-zinc-600 uppercase tracking-wider font-bold">
                    {item.type}
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-300" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCreate = () => (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <Button variant="ghost" onClick={() => setView('home')} className="mb-8 -ml-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-2">
          {currentDecision.type === 'pros-cons' && "Balance Sheet Analysis"}
          {currentDecision.type === 'matrix' && "Weighted Decision Matrix"}
          {currentDecision.type === 'quick' && "Quick Random Pick"}
        </h2>
        <p className="text-zinc-500">Define your options and criteria to get started.</p>
      </div>

      <div className="space-y-8">
        <section>
          <label className="block text-sm font-semibold text-zinc-700 mb-2 uppercase tracking-wider">Decision Title</label>
          <Input 
            placeholder="e.g., Which car should I buy?" 
            value={currentDecision.title}
            onChange={e => setCurrentDecision(prev => ({ ...prev, title: e.target.value }))}
            className="text-lg py-3"
          />
        </section>

        <section>
          <label className="block text-sm font-semibold text-zinc-700 mb-2 uppercase tracking-wider">Description (Optional)</label>
          <textarea 
            placeholder="Add some context for the AI..." 
            className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all min-h-[100px]"
            value={currentDecision.description}
            onChange={e => setCurrentDecision(prev => ({ ...prev, description: e.target.value }))}
          />
        </section>

        {currentDecision.type === 'matrix' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold text-zinc-700 uppercase tracking-wider">Criteria & Weights</label>
              <Button variant="outline" onClick={addCriterion} className="py-1 px-3 text-xs">
                <Plus className="w-3 h-3" /> Add Criterion
              </Button>
            </div>
            <div className="space-y-3">
              {currentDecision.criteria?.map(c => (
                <div key={c.id} className="flex gap-4 items-center">
                  <Input 
                    value={c.name} 
                    onChange={e => updateCriterion(c.id, { name: e.target.value })}
                    placeholder="Criterion name"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <span className="text-xs font-mono text-zinc-400">W: {c.weight}</span>
                    <input 
                      type="range" min="1" max="10" 
                      value={c.weight} 
                      onChange={e => updateCriterion(c.id, { weight: parseInt(e.target.value) })}
                      className="accent-black h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <Button variant="ghost" className="p-2 text-zinc-400 hover:text-red-500" onClick={() => {
                    setCurrentDecision(prev => ({ ...prev, criteria: prev.criteria?.filter(x => x.id !== c.id) }));
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-semibold text-zinc-700 uppercase tracking-wider">Options</label>
            <Button variant="outline" onClick={addOption} className="py-1 px-3 text-xs">
              <Plus className="w-3 h-3" /> Add Option
            </Button>
          </div>
          <div className="space-y-4">
            {currentDecision.options?.map((opt, idx) => (
              <Card key={opt.id} className="p-4">
                <div className="flex gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                    {idx + 1}
                  </div>
                  <Input 
                    placeholder="Option name..." 
                    value={opt.name}
                    onChange={e => updateOptionName(opt.id, e.target.value)}
                    className="border-none px-0 py-0 focus:ring-0 text-lg font-medium"
                  />
                  {currentDecision.options!.length > 2 && (
                    <Button variant="ghost" className="p-2 text-zinc-400 hover:text-red-500" onClick={() => removeOption(opt.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {currentDecision.type === 'matrix' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
                    {currentDecision.criteria?.map(c => (
                      <div key={c.id} className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-500 font-medium">{c.name} (1-10)</span>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" min="1" max="10" 
                            value={opt.scores?.[c.id] || 5} 
                            onChange={e => updateScore(opt.id, c.id, parseInt(e.target.value))}
                            className="flex-1 accent-black h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-sm font-mono font-bold w-6">{opt.scores?.[c.id] || 5}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentDecision.type === 'pros-cons' && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Pros</span>
                      {opt.pros.map((p, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2 group">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <input 
                            className="text-sm w-full bg-transparent focus:outline-none" 
                            value={p}
                            onChange={e => {
                              const newPros = [...opt.pros];
                              newPros[pIdx] = e.target.value;
                              setCurrentDecision(prev => ({
                                ...prev,
                                options: prev.options?.map(o => o.id === opt.id ? { ...o, pros: newPros } : o)
                              }));
                            }}
                          />
                          <button className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500" onClick={() => {
                            const newPros = opt.pros.filter((_, i) => i !== pIdx);
                            setCurrentDecision(prev => ({
                              ...prev,
                              options: prev.options?.map(o => o.id === opt.id ? { ...o, pros: newPros } : o)
                            }));
                          }}><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                      <button 
                        className="text-xs text-emerald-600 font-medium flex items-center gap-1 hover:underline"
                        onClick={() => {
                          setCurrentDecision(prev => ({
                            ...prev,
                            options: prev.options?.map(o => o.id === opt.id ? { ...o, pros: [...o.pros, ''] } : o)
                          }));
                        }}
                      >
                        <Plus className="w-3 h-3" /> Add Pro
                      </button>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Cons</span>
                      {opt.cons.map((c, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2 group">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <input 
                            className="text-sm w-full bg-transparent focus:outline-none" 
                            value={c}
                            onChange={e => {
                              const newCons = [...opt.cons];
                              newCons[cIdx] = e.target.value;
                              setCurrentDecision(prev => ({
                                ...prev,
                                options: prev.options?.map(o => o.id === opt.id ? { ...o, cons: newCons } : o)
                              }));
                            }}
                          />
                          <button className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500" onClick={() => {
                            const newCons = opt.cons.filter((_, i) => i !== cIdx);
                            setCurrentDecision(prev => ({
                              ...prev,
                              options: prev.options?.map(o => o.id === opt.id ? { ...o, cons: newCons } : o)
                            }));
                          }}><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                      <button 
                        className="text-xs text-red-600 font-medium flex items-center gap-1 hover:underline"
                        onClick={() => {
                          setCurrentDecision(prev => ({
                            ...prev,
                            options: prev.options?.map(o => o.id === opt.id ? { ...o, cons: [...o.cons, ''] } : o)
                          }));
                        }}
                      >
                        <Plus className="w-3 h-3" /> Add Con
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        <div className="pt-8">
          <Button 
            className="w-full py-4 text-lg" 
            onClick={handleAnalyze}
            loading={isAnalyzing}
          >
            {currentDecision.type === 'quick' ? "Let's Decide!" : "Analyze with AI"}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderDecide = () => {
    const decision = selectedHistoryItem || currentDecision as Decision;
    const matrixScores = decision.type === 'matrix' ? calculateMatrixScores(decision) : [];

    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <Button variant="ghost" onClick={() => {
          setSelectedHistoryItem(null);
          setView('home');
        }} className="mb-8 -ml-4">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Button>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs px-2 py-1 bg-black text-white rounded-full uppercase tracking-wider font-bold">
              {decision.type}
            </span>
            <span className="text-xs text-zinc-400">{new Date(decision.createdAt).toLocaleDateString()}</span>
          </div>
          <h2 className="text-4xl font-bold mb-4">{decision.title}</h2>
          {decision.description && <p className="text-zinc-500 text-lg">{decision.description}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {decision.type === 'matrix' && (
              <section>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Results</h3>
                <div className="space-y-4">
                  {matrixScores.map((res, idx) => (
                    <Card key={res.id} className={cn("p-6", idx === 0 ? "border-black ring-1 ring-black" : "")}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {idx === 0 && <Trophy className="w-5 h-5 text-orange-500" />}
                          <h4 className="text-xl font-bold">{res.name}</h4>
                        </div>
                        <span className="text-2xl font-mono font-black">{Math.round(res.percentage)}%</span>
                      </div>
                      <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${res.percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={cn("h-full", idx === 0 ? "bg-black" : "bg-zinc-400")}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {decision.type === 'pros-cons' && (
              <section className="space-y-6">
                {decision.options.map(opt => (
                  <Card key={opt.id} className="p-6">
                    <h4 className="text-xl font-bold mb-6 pb-4 border-b border-zinc-100">{opt.name}</h4>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Pros</span>
                        </div>
                        {opt.pros.map((p, i) => (
                          <div key={i} className="text-sm text-zinc-600 flex gap-2">
                            <span className="text-emerald-400 mt-1">•</span> {p}
                          </div>
                        ))}
                        {opt.pros.length === 0 && <p className="text-xs text-zinc-400 italic">No pros listed</p>}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Cons</span>
                        </div>
                        {opt.cons.map((c, i) => (
                          <div key={i} className="text-sm text-zinc-600 flex gap-2">
                            <span className="text-red-400 mt-1">•</span> {c}
                          </div>
                        ))}
                        {opt.cons.length === 0 && <p className="text-xs text-zinc-400 italic">No cons listed</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </section>
            )}

            {decision.type === 'quick' && (
              <div className="flex flex-col items-center justify-center py-20">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-48 h-48 bg-black text-white rounded-[40px] flex items-center justify-center text-center p-6 shadow-2xl mb-8"
                >
                  <h3 className="text-2xl font-bold">
                    {decision.options[Math.floor(Math.random() * decision.options.length)].name}
                  </h3>
                </motion.div>
                <p className="text-zinc-400 text-sm">Fate has spoken.</p>
                <Button variant="outline" className="mt-8" onClick={() => setView('decide')}>Pick Again</Button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {decision.aiAnalysis && (
              <Card className="bg-zinc-900 text-white p-6 border-none shadow-xl">
                <div className="flex items-center gap-2 text-zinc-400 mb-6">
                  <BrainCircuit className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">AI Consultant Analysis</span>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-500 uppercase mb-2">Summary</h5>
                    <p className="text-sm leading-relaxed text-zinc-300">{decision.aiAnalysis.summary}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <h5 className="text-xs font-bold text-emerald-400 uppercase mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" /> Recommendation
                    </h5>
                    <p className="text-sm font-medium">{decision.aiAnalysis.recommendation}</p>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-red-400 uppercase mb-3 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> Key Risks
                    </h5>
                    <ul className="space-y-2">
                      {decision.aiAnalysis.risks.map((risk, i) => (
                        <li key={i} className="text-xs text-zinc-400 flex gap-2">
                          <span className="text-red-500">•</span> {risk}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-indigo-400 uppercase mb-3 flex items-center gap-2">
                      <Lightbulb className="w-3 h-3" /> Opportunities
                    </h5>
                    <ul className="space-y-2">
                      {decision.aiAnalysis.opportunities.map((opp, i) => (
                        <li key={i} className="text-xs text-zinc-400 flex gap-2">
                          <span className="text-indigo-500">•</span> {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            <Button variant="outline" className="w-full" onClick={() => {
              const text = `Decision: ${decision.title}\n\nAI Analysis: ${decision.aiAnalysis?.recommendation}`;
              navigator.clipboard.writeText(text);
              alert("Copied to clipboard!");
            }}>
              <Save className="w-4 h-4" /> Share Results
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <Button variant="ghost" onClick={() => setView('home')} className="mb-8 -ml-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">Decision History</h2>
        <Button variant="danger" onClick={() => {
          if (confirm("Clear all history?")) {
            setHistory([]);
            localStorage.removeItem('decidewise_history');
          }
        }}>Clear All</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {history.map(item => (
          <Card key={item.id} className="p-6 hover:border-black/20 transition-all cursor-pointer group" onClick={() => {
            setSelectedHistoryItem(item);
            setView('decide');
          }}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-500 uppercase font-bold tracking-wider">
                {item.type}
              </span>
              <span className="text-[10px] text-zinc-400">{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <h3 className="text-lg font-bold mb-2 group-hover:text-black transition-colors">{item.title}</h3>
            <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{item.description || "No description provided."}</p>
            <div className="flex items-center text-xs font-bold text-black uppercase tracking-widest">
              View Analysis <ChevronRight className="w-3 h-3 ml-1" />
            </div>
          </Card>
        ))}
        {history.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <History className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <p className="text-zinc-400">No decisions saved yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9F9F9] font-sans text-zinc-900 selection:bg-black selection:text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {view === 'home' && renderHome()}
          {view === 'create' && renderCreate()}
          {view === 'decide' && renderDecide()}
          {view === 'history' && renderHistory()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
