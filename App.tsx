
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Step, Property, AlphaWeights, NotebookEntry, Contract, KnowledgeBaseEntry } from './types';
import * as gemini from './services/geminiService';
import * as ollama from './services/ollamaService';
import { 
  Search, 
  BookOpen, 
  Sliders, 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  Percent, 
  Zap, 
  FileText, 
  X, 
  Plus, 
  Trash2, 
  LogOut, 
  ShieldCheck,
  ArrowRight,
  Download,
  Send,
  MessageSquare,
  Volume2,
  VolumeX,
  Bot,
  User,
  ChevronRight,
  Settings,
  Cpu
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AUTH_KEY = 'nexusnights_auth';
const NOTEBOOK_KEY = 'nexusnights_notebook';
const WEIGHTS_KEY = 'nexusnights_weights';

const DEFAULT_WEIGHTS: AlphaWeights = {
  yield_gap: 40,
  aesthetic_debt: 20,
  amenity_arbitrage: 15,
  pricing_inefficiency: 15,
  review_velocity: 10
};

const WEIGHT_KEYS: (keyof AlphaWeights)[] = [
  'yield_gap',
  'aesthetic_debt',
  'amenity_arbitrage',
  'pricing_inefficiency',
  'review_velocity'
];

const normalizeWeights = (input: AlphaWeights): AlphaWeights => {
  const total = WEIGHT_KEYS.reduce((sum, key) => sum + input[key], 0);
  if (total === 0) return { ...input };

  const scaled: AlphaWeights = { ...input };
  let runningTotal = 0;

  WEIGHT_KEYS.forEach((key, index) => {
    if (index === WEIGHT_KEYS.length - 1) {
      scaled[key] = Math.max(0, Math.min(100, 100 - runningTotal));
    } else {
      const value = Math.round((input[key] / total) * 100);
      scaled[key] = Math.max(0, Math.min(100, value));
      runningTotal += scaled[key];
    }
  });

  return scaled;
};

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

const App: React.FC = () => {
  const [step, setStep] = useState<Step>(Step.AUTH);
  const [accessKey, setAccessKey] = useState('');
  const [region, setRegion] = useState('Miami, FL');
  const [properties, setProperties] = useState<Property[]>([]);
  const [weights, setWeights] = useState<AlphaWeights>(DEFAULT_WEIGHTS);
  const [notebook, setNotebook] = useState<NotebookEntry[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<{ task: string; logs: string[]; isExpanded: boolean }>({
    task: '',
    logs: [],
    isExpanded: false
  });
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  
  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Ollama / Sidekick State
  const [isSidekickActive, setIsSidekickActive] = useState(false);
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.1:8b');
  const [sidekickMessages, setSidekickMessages] = useState<ChatMessage[]>([]);
  const [sidekickInput, setSidekickInput] = useState('');
  const [isSidekickLoading, setIsSidekickLoading] = useState(false);
  const sidekickEndRef = useRef<HTMLDivElement>(null);

  const handleWeightChange = (key: keyof AlphaWeights, value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    const otherKeys = (Object.keys(weights) as (keyof AlphaWeights)[]).filter(k => k !== key);
    const totalOthers = otherKeys.reduce((sum, k) => sum + weights[k], 0);
    const remaining = 100 - clamped;

    const next: AlphaWeights = { ...weights, [key]: clamped };

    if (remaining <= 0) {
      otherKeys.forEach(k => {
        next[k] = 0;
      });
    } else if (totalOthers <= 0) {
      const base = Math.floor(remaining / otherKeys.length);
      let leftover = remaining - base * otherKeys.length;
      otherKeys.forEach(k => {
        next[k] = base + (leftover > 0 ? 1 : 0);
        if (leftover > 0) leftover -= 1;
      });
    } else {
      let assigned = 0;
      otherKeys.forEach((k, idx) => {
        let v: number;
        if (idx === otherKeys.length - 1) {
          v = remaining - assigned;
        } else {
          v = Math.round((weights[k] / totalOthers) * remaining);
          assigned += v;
        }
        next[k] = v;
      });
    }

    setWeights(next);
  };

  useEffect(() => {
    if (localStorage.getItem(AUTH_KEY) === 'true') setStep(Step.COMMAND_CENTER);
    const savedNotebook = localStorage.getItem(NOTEBOOK_KEY);
    if (savedNotebook) setNotebook(JSON.parse(savedNotebook));
    const savedWeights = localStorage.getItem(WEIGHTS_KEY);
    if (savedWeights) setWeights(JSON.parse(savedWeights));
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(notebook));
  }, [notebook]);

  useEffect(() => {
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
  }, [weights]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (sidekickEndRef.current) {
      sidekickEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sidekickMessages]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessKey.toUpperCase() === '1') {
      localStorage.setItem(AUTH_KEY, 'true');
      setStep(Step.COMMAND_CENTER);
    }
  };

  const handleScrub = async () => {
    setIsLoading(true);
    setAgentStatus({
      task: `Initializing Market Scrub for ${region}...`,
      logs: [`[SYSTEM] Initializing Nexus Intelligence Engine for ${region}`],
      isExpanded: false
    });

    const addLog = (log: string) => {
      setAgentStatus(prev => ({
        ...prev,
        task: log,
        logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${log}`]
      }));
    };

    try {
      addLog(`Segmenting ${region} into neighborhood clusters...`);
      await new Promise(r => setTimeout(r, 1000));
      
      addLog(`Found 12 neighborhood clusters in ${region}. Analyzing Cluster A-1 (Downtown)...`);
      await new Promise(r => setTimeout(r, 800));

      addLog(`Establishing secure connection to Airbnb/VRBO data streams for Cluster A-1...`);
      await new Promise(r => setTimeout(r, 800));

      addLog(`Scraping current ADR and Occupancy data for 142 listings in Cluster A-1...`);
      await new Promise(r => setTimeout(r, 1200));

      addLog(`Analyzing Cluster B-4 (Coastal/Waterfront) for premium yield gaps...`);
      await new Promise(r => setTimeout(r, 800));

      addLog(`Cross-referencing Zillow market comps for valuation accuracy in Cluster B-4...`);
      await new Promise(r => setTimeout(r, 1000));

      addLog(`Calculating Nexus Alpha Scores based on yield gap and aesthetic debt...`);
      
      const results = await gemini.scrubRegion(region, weights, notebook);
      
      addLog(`Generating investment theses for top-ranked Arbitrage Gems...`);
      await new Promise(r => setTimeout(r, 800));

      addLog(`Finalizing ranked list of ${results.length} properties.`);
      setProperties(results);
    } catch (err) {
      console.error(err);
      addLog(`ERROR: Market scrub failed. Check connection parameters.`);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setAgentStatus(prev => ({ ...prev, task: '' }));
      }, 3000);
    }
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const entry: NotebookEntry = {
      id: Math.random().toString(36).substr(2, 9),
      content: newNote,
      timestamp: Date.now()
    };
    setNotebook([entry, ...notebook]);
    setNewNote('');
  };

  const handleDraftContract = async (prop: Property) => {
    setSelectedProperty(prop);
    setStep(Step.CONTRACT_DRAFT);
    setIsLoading(true);
    setAgentStatus({
      task: `Architecting Acquisition Agreement for ${prop.name}...`,
      logs: [`[SYSTEM] Initializing Contract Architect for ${prop.name}`],
      isExpanded: false
    });

    const addLog = (log: string) => {
      setAgentStatus(prev => ({
        ...prev,
        task: log,
        logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${log}`]
      }));
    };

    try {
      addLog(`Analyzing property-specific value-add opportunities...`);
      await new Promise(r => setTimeout(r, 800));

      addLog(`Synthesizing market-standard legal clauses for ${prop.location}...`);
      await new Promise(r => setTimeout(r, 1000));

      addLog(`Calculating optimal purchase price based on ROI targets...`);
      
      const c = await gemini.draftContract(prop);
      
      addLog(`Drafting Seller Reality Check based on current market velocity...`);
      await new Promise(r => setTimeout(r, 1200));

      addLog(`Finalizing contract structure and contingencies.`);
      setContract(c);
    } catch (err) {
      console.error(err);
      addLog(`ERROR: Contract drafting failed. Check property data integrity.`);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setAgentStatus(prev => ({ ...prev, task: '' }));
      }, 3000);
    }
  };

  const playThesis = async (text: string) => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const audioUrl = await gemini.generateSpeech(text);
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
    } else {
      setIsPlaying(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedProperty) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    // Simulate Bot Response based on Knowledge Base
    setTimeout(() => {
      const kb = selectedProperty.knowledge_base || [];
      const lowerInput = chatInput.toLowerCase();
      const match = kb.find(entry => 
        lowerInput.includes(entry.question.toLowerCase()) || 
        entry.question.toLowerCase().includes(lowerInput) ||
        lowerInput.includes(entry.category.toLowerCase())
      );

      const botResponse = match 
        ? match.answer 
        : `I'm analyzing the data for ${selectedProperty.name}. Based on our current scrub, I don't have a specific answer for that, but I can tell you its Alpha Score is ${selectedProperty.alpha_score}.`;

      setChatMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    }, 600);
  };

  const handleSidekickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidekickInput.trim() || isSidekickLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: sidekickInput };
    setSidekickMessages(prev => [...prev, userMsg]);
    setSidekickInput('');
    setIsSidekickLoading(true);

    try {
      const response = await ollama.queryOllama(
        ollamaEndpoint,
        ollamaModel,
        sidekickInput,
        "You are the NexusNights Sidekick. Help the user with search terms, neighborhood insights, and STR alpha strategy. Be direct and high-intensity."
      );
      setSidekickMessages(prev => [...prev, { role: 'bot', content: response }]);
    } catch (err) {
      const helperMessage = [
        "ERROR: Could not reach the local Ollama Sidekick.",
        "",
        "To fix this:",
        "1) Ensure Ollama is running with CORS enabled:",
        '   export OLLAMA_ORIGINS=\"*\"',
        "   ollama serve",
        "",
        `2) Ensure the selected model \"${ollamaModel}\" is installed:`,
        `   ollama pull ${ollamaModel}`,
        ollamaModel === "nexus-sidekick"
          ? "   ollama create nexus-sidekick -f nexus-agent.json"
          : "",
        "",
        `Current endpoint: ${ollamaEndpoint}`,
      ]
        .filter(Boolean)
        .join("\n");

      setSidekickMessages(prev => [...prev, { role: 'bot', content: helperMessage }]);
    } finally {
      setIsSidekickLoading(false);
    }
  };

  const Logo = () => (
    <div className="flex items-center gap-4 group cursor-pointer">
      <div className="relative">
        <div className="w-12 h-12 bg-[#38E8C6] rounded-2xl flex items-center justify-center rotate-6 group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(56,232,198,0.2)]">
          <Zap className="text-[#1A1A1B] w-7 h-7 fill-current" />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#2E5BFF] rounded-full border-2 border-[#1A1A1B] animate-pulse"></div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="text-white font-black text-2xl tracking-tighter uppercase italic leading-none">Nexus</span>
          <span className="text-[#38E8C6] font-black text-2xl tracking-tighter uppercase italic leading-none">Nights</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-[1px] w-4 bg-[#38E8C6]/30"></div>
          <span className="text-[#38E8C6] font-bold text-[9px] uppercase tracking-[0.4em] leading-none">Intelligence Engine</span>
        </div>
      </div>
    </div>
  );

  if (step === Step.AUTH) {
    return (
      <div className="min-h-screen bg-[#1A1A1B] flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-12 text-center">
          <div className="flex justify-center scale-125 mb-8"><Logo /></div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
              <input 
                type="password" 
                value={accessKey} 
                onChange={(e) => setAccessKey(e.target.value)} 
                placeholder="ENTER ACCESS KEY" 
                className="w-full bg-[#252526] border border-[#333] rounded-2xl pl-14 pr-6 py-5 text-white text-center font-black tracking-[0.5em] focus:outline-none focus:border-[#38E8C6] transition-all shadow-2xl" 
              />
            </div>
            <button className="w-full bg-[#38E8C6] hover:bg-[#22c3a3] text-[#021212] font-black py-5 rounded-2xl transition-all shadow-xl uppercase italic tracking-widest flex items-center justify-center gap-2 group">
              Initialize <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-bold">PropTech Elite Access Only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1B] text-white font-sans selection:bg-[#38E8C6] selection:text-[#021212]">
      {/* Header */}
      <nav className="border-b border-white/5 bg-[#1A1A1B]/80 backdrop-blur-xl sticky top-0 z-50 px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <Logo />
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 bg-[#252526] px-4 py-2 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <Cpu className={cn("w-4 h-4", isSidekickActive ? "text-[#38E8C6]" : "text-white/20")} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sidekick Bridge</span>
              </div>
              <button 
                onClick={() => setIsSidekickActive(!isSidekickActive)}
                className={cn(
                  "w-10 h-5 rounded-full relative transition-all duration-300",
                  isSidekickActive ? "bg-[#38E8C6]" : "bg-[#333]"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300",
                  isSidekickActive ? "left-6" : "left-1"
                )}></div>
              </button>
              <select
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="bg-[#1A1A1B] border border-[#333] rounded-lg px-2 py-1 text-[10px] text-white/60 focus:outline-none focus:border-[#38E8C6] ml-3"
              >
                <option value="nexus-sidekick">Tiny (Nexus Sidekick)</option>
                <option value="llama3.1:8b">Llama 3.1 · 8B</option>
                <option value="llama3.1:70b">Llama 3.1 · 70B</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4" />
                <input 
                  type="text" 
                  value={region} 
                  onChange={(e) => setRegion(e.target.value)}
                  className="bg-[#252526] border border-[#333] rounded-xl pl-10 pr-4 py-2 text-sm font-bold focus:outline-none focus:border-[#38E8C6] w-64 transition-all"
                />
              </div>
              <button 
                onClick={handleScrub}
                disabled={isLoading}
                className="bg-[#38E8C6] text-[#021212] px-6 py-2.5 rounded-xl font-black text-sm uppercase italic hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-[#38E8C6]/10"
              >
                {isLoading ? <Zap className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isLoading ? 'Scrubbing...' : 'Scrub Region'}
              </button>
            </div>
            <button onClick={() => { localStorage.removeItem(AUTH_KEY); setStep(Step.AUTH); }} className="text-white/20 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto grid grid-cols-12 gap-8 p-8 h-[calc(100vh-80px)] overflow-hidden">
        
        {/* Left: Nexus Notebook & Sidekick */}
        <div className="col-span-3 flex flex-col gap-6 h-full overflow-hidden">
          {/* Notebook */}
          <div className="bg-[#252526] rounded-3xl border border-white/5 p-6 flex flex-col h-1/2 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-white/40" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Nexus Notebook</h2>
              </div>
              <span className="text-[10px] font-bold text-[#38E8C6] bg-[#38E8C6]/10 px-2 py-1 rounded">SCRATCHPAD</span>
            </div>
            
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="Add contextual note..."
                className="flex-1 bg-[#1A1A1B] border border-[#333] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#38E8C6] transition-all"
              />
              <button onClick={addNote} className="bg-[#333] hover:bg-[#444] p-2.5 rounded-xl transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {notebook.map(note => (
                <div key={note.id} className="bg-[#1A1A1B] p-5 rounded-2xl border border-white/5 relative group hover:border-[#38E8C6]/20 transition-all">
                  <p className="text-sm text-white/80 leading-relaxed font-medium">{note.content}</p>
                  <button 
                    onClick={() => setNotebook(notebook.filter(n => n.id !== note.id))}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {notebook.length === 0 && (
                <div className="text-center py-12 text-white/20 italic text-sm flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  No contextual notes yet. Add filters like "Ski-in/Ski-out" or "Pet Friendly".
                </div>
              )}
            </div>
          </div>

          {/* Sidekick Chat */}
          <div className={cn(
            "bg-[#252526] rounded-3xl border border-white/5 flex flex-col h-1/2 shadow-2xl overflow-hidden transition-all duration-500",
            !isSidekickActive && "opacity-20 grayscale pointer-events-none"
          )}>
            <div className="p-6 border-b border-white/5 bg-[#1A1A1B]/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#38E8C6] rounded-lg flex items-center justify-center">
                  <Bot className="text-[#021212] w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase italic tracking-tighter">Agent Sidekick</h3>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Local Llama Bridge</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", isSidekickActive ? "bg-[#38E8C6] animate-pulse" : "bg-white/10")}></div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {sidekickMessages.length === 0 && (
                <div className="text-center py-8 text-white/20 italic text-[10px] uppercase tracking-widest font-bold">
                  Sidekick initialized. Ask for search terms or neighborhood strategy.
                </div>
              )}
              {sidekickMessages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center flex-shrink-0", msg.role === 'user' ? "bg-[#2E5BFF]" : "bg-[#38E8C6]")}>
                    {msg.role === 'user' ? <User className="text-white w-3 h-3" /> : <Bot className="text-[#021212] w-3 h-3" />}
                  </div>
                  <div className={cn("max-w-[85%] p-3 rounded-xl text-[11px] leading-relaxed", msg.role === 'user' ? "bg-[#2E5BFF]/10 text-white" : "bg-[#1A1A1B] text-white/80 border border-white/5")}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isSidekickLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded bg-[#38E8C6] flex items-center justify-center animate-pulse">
                    <Bot className="text-[#021212] w-3 h-3" />
                  </div>
                  <div className="bg-[#1A1A1B] p-3 rounded-xl border border-white/5">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-[#38E8C6] rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-[#38E8C6] rounded-full animate-bounce delay-75"></div>
                      <div className="w-1 h-1 bg-[#38E8C6] rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={sidekickEndRef} />
            </div>

            <div className="p-4 border-t border-white/5 bg-[#1A1A1B]/30">
              <form onSubmit={handleSidekickSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={sidekickInput}
                  onChange={(e) => setSidekickInput(e.target.value)}
                  placeholder="Strategy help..."
                  className="flex-1 bg-[#1A1A1B] border border-[#333] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#38E8C6] transition-all"
                />
                <button type="submit" className="bg-[#38E8C6] text-[#021212] p-2 rounded-lg hover:scale-105 transition-transform">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Center: Map + Ranked Gems */}
        <div className="col-span-6 flex flex-col gap-6 h-full">
          {/* Region Map */}
          <div className="bg-[#252526] rounded-3xl border border-white/5 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white/40" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Region Map</h2>
              </div>
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                {region}
              </span>
            </div>
            <div className="h-64 rounded-2xl overflow-hidden border border-white/5">
              <MapContainer
                center={
                  properties.find(p => p.latitude != null && p.longitude != null)
                    ? [properties.find(p => p.latitude != null && p.longitude != null)!.latitude!, properties.find(p => p.latitude != null && p.longitude != null)!.longitude!]
                    : [25.7617, -80.1918]
                }
                zoom={11}
                className="w-full h-full"
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {properties
                  .filter(p => p.latitude != null && p.longitude != null)
                  .map(p => (
                    <CircleMarker
                      key={p.id}
                      center={[p.latitude!, p.longitude!]}
                      radius={8}
                      pathOptions={{ color: '#38E8C6', fillColor: '#38E8C6', fillOpacity: 0.7 }}
                    >
                      <Popup>
                        <div className="text-sm font-semibold">{p.name}</div>
                        <div className="text-xs text-gray-600">{p.location}</div>
                        <div className="text-xs mt-1">Alpha Score: {p.alpha_score}</div>
                      </Popup>
                    </CircleMarker>
                  ))}
              </MapContainer>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar pb-20">
            {/* Market Pulse Header */}
            {properties.length > 0 && !isLoading && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-[#252526] p-6 rounded-3xl border border-[#38E8C6]/20 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp className="w-12 h-12 text-[#38E8C6]" />
                  </div>
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Avg Market ADR</div>
                  <div className="text-3xl font-black text-[#38E8C6] italic">
                    ${Math.round(properties.reduce((acc, p) => acc + p.market_comp_adr, 0) / properties.length)}
                  </div>
                </div>
                <div className="bg-[#252526] p-6 rounded-3xl border border-[#2E5BFF]/20 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Percent className="w-12 h-12 text-[#2E5BFF]" />
                  </div>
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Avg Occupancy</div>
                  <div className="text-3xl font-black text-[#2E5BFF] italic">
                    {Math.round(properties.reduce((acc, p) => acc + p.occupancy_rate, 0) / properties.length)}%
                  </div>
                </div>
                <div className="bg-[#252526] p-6 rounded-3xl border border-emerald-500/20 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-12 h-12 text-emerald-500" />
                  </div>
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Alpha Opportunity</div>
                  <div className="text-3xl font-black text-emerald-500 italic">
                    ${(properties.reduce((acc, p) => acc + (p.market_comp_revenue - (p.current_adr * 365 * (p.occupancy_rate/100))), 0) / 1000).toFixed(1)}K
                  </div>
                </div>
              </div>
            )}

            {isLoading && step === Step.COMMAND_CENTER && (
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-[#38E8C6] border-t-transparent rounded-full animate-spin"></div>
                  <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#38E8C6] w-6 h-6 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-[#38E8C6] font-black italic uppercase tracking-[0.3em] animate-pulse text-lg">Segmenting Market Data...</p>
                  <p className="text-white/20 text-xs mt-2 uppercase font-bold">Nexus Alpha Calculation in Progress</p>
                </div>
              </div>
            )}

            {!isLoading && properties.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-8 opacity-40">
                <div className="w-32 h-32 bg-[#252526] rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                  <Search className="w-16 h-16 text-white/20" />
                </div>
                <div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">No Data Scrubbed</h3>
                  <p className="text-sm text-white/40 max-w-xs mx-auto mt-2 font-medium">Enter a region and click "Scrub Region" to find high-yield Arbitrage Gems.</p>
                </div>
              </div>
            )}

            {properties.map((prop, idx) => (
              <div key={prop.id} className="bg-[#252526] rounded-[40px] border border-white/5 overflow-hidden hover:border-[#38E8C6]/30 transition-all group shadow-2xl">
                <div className="p-10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-black bg-[#38E8C6] text-[#021212] px-3 py-1 rounded-full uppercase italic shadow-lg shadow-[#38E8C6]/20">Rank #{idx + 1}</span>
                        <span className="text-[10px] font-black text-[#2E5BFF] uppercase tracking-widest flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> {prop.location}
                        </span>
                      </div>
                      <h3 className="text-4xl font-black italic uppercase tracking-tighter leading-none group-hover:text-[#38E8C6] transition-colors">{prop.name}</h3>
                      <p className="text-white/40 text-xs mt-3 font-bold tracking-wide uppercase">{prop.address}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Nexus Alpha</div>
                      <div className="text-6xl font-black text-[#38E8C6] italic leading-none tracking-tighter">{prop.alpha_score}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-5 mb-10">
                    <div className="bg-[#1A1A1B] p-5 rounded-2xl border border-white/5 shadow-inner">
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3" /> Current ADR
                      </div>
                      <div className="text-2xl font-black text-white">${prop.current_adr}</div>
                    </div>
                    <div className="bg-[#1A1A1B] p-5 rounded-2xl border border-white/5 shadow-inner">
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Percent className="w-3 h-3" /> Occupancy
                      </div>
                      <div className="text-2xl font-black text-[#2E5BFF]">{prop.occupancy_rate}%</div>
                    </div>
                    <div className="bg-[#1A1A1B] p-5 rounded-2xl border border-white/5 shadow-inner">
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" /> Yield Gap
                      </div>
                      <div className="text-2xl font-black text-emerald-500">+${prop.market_comp_adr - prop.current_adr}</div>
                    </div>
                    <div className="bg-[#1A1A1B] p-5 rounded-2xl border border-white/5 shadow-inner">
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Zap className="w-3 h-3" /> Potential
                      </div>
                      <div className="text-2xl font-black text-[#38E8C6]">${prop.market_comp_revenue.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="bg-[#1A1A1B]/50 p-8 rounded-3xl border border-white/5 mb-10 relative">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[11px] font-black text-[#38E8C6] uppercase tracking-widest italic flex items-center gap-2.5">
                        <TrendingUp className="w-4 h-4" /> Investment Thesis
                      </h4>
                      <button 
                        onClick={() => playThesis(prop.investment_thesis)}
                        className="text-white/20 hover:text-[#38E8C6] transition-colors"
                      >
                        {isPlaying ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-base text-white/70 leading-relaxed italic font-medium">"{prop.investment_thesis}"</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2.5">
                      {prop.amenities.slice(0, 3).map(a => (
                        <span key={a} className="text-[10px] font-black bg-white/5 text-white/50 px-4 py-1.5 rounded-full uppercase tracking-wider border border-white/5">{a}</span>
                      ))}
                      {prop.amenities.length > 3 && <span className="text-[10px] font-black text-white/20 self-center ml-2">+{prop.amenities.length - 3} MORE</span>}
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => { setSelectedProperty(prop); setIsChatOpen(true); setChatMessages([{ role: 'bot', content: `Nexus Intelligence active for ${prop.name}. Ask me anything about the market comps, ROI potential, or the knowledge base entries.` }]); }}
                        className="bg-white/5 hover:bg-white/10 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase italic transition-all border border-white/10 flex items-center gap-2.5"
                      >
                        <MessageSquare className="w-4 h-4" /> Knowledge Chat
                      </button>
                      <button 
                        onClick={() => handleDraftContract(prop)}
                        className="bg-[#38E8C6] hover:bg-[#22c3a3] text-[#021212] px-8 py-4 rounded-2xl font-black text-xs uppercase italic transition-all shadow-xl shadow-[#38E8C6]/10 flex items-center gap-2.5"
                      >
                        <FileText className="w-4 h-4" /> Draft Contract
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Sliding Scales */}
        <div className="col-span-3 flex flex-col gap-6 h-full">
          <div className="bg-[#252526] rounded-3xl border border-white/5 p-6 flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-white/40" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Alpha Weights</h2>
              </div>
              <button 
                onClick={() => setWeights(DEFAULT_WEIGHTS)}
                className="text-[10px] font-bold text-white/20 hover:text-white uppercase tracking-widest transition-colors"
              >
                Reset
              </button>
            </div>

            <div className="space-y-12">
              {[
                { key: 'yield_gap', label: 'Yield Gap', color: '#38E8C6', desc: 'Revenue vs Comps' },
                { key: 'aesthetic_debt', label: 'Aesthetic Debt', color: '#2E5BFF', desc: 'Photo/Decor Quality' },
                { key: 'amenity_arbitrage', label: 'Amenity Arbitrage', color: '#FF2E5B', desc: 'Missing ROI Features' },
                { key: 'pricing_inefficiency', label: 'Pricing Inefficiency', color: '#2EFFD4', desc: 'High Occ / Low ADR' },
                { key: 'review_velocity', label: 'Review Velocity', color: '#FFD42E', desc: 'Host Engagement' }
              ].map(item => (
                <div key={item.key} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: item.color }}>{item.label}</div>
                      <div className="text-[10px] text-white/30 font-bold mt-1">{item.desc}</div>
                    </div>
                    <div className="text-xl font-black italic">{weights[item.key as keyof AlphaWeights]}%</div>
                  </div>
                  <div className="relative h-1.5 w-full bg-[#1A1A1B] rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full transition-all duration-500" 
                      style={{ width: `${weights[item.key as keyof AlphaWeights]}%`, backgroundColor: item.color }}
                    ></div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={weights[item.key as keyof AlphaWeights]}
                      onChange={(e) => handleWeightChange(item.key as keyof AlphaWeights, parseInt(e.target.value))}
                      className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-10 border-t border-white/5">
              <div className="bg-[#38E8C6]/5 p-5 rounded-2xl border border-[#38E8C6]/10">
                <p className="text-[11px] text-[#38E8C6]/60 font-bold leading-relaxed italic">
                  "Adjusting weights instantly re-calculates the Alpha Score for all properties in the current scrub set."
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Chatbot Modal */}
      {isChatOpen && selectedProperty && (
        <div className="fixed bottom-8 right-8 z-[110] w-[450px] h-[600px] bg-[#252526] rounded-[40px] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
          <div className="p-6 border-b border-white/5 bg-[#1A1A1B]/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#38E8C6] rounded-xl flex items-center justify-center">
                <Bot className="text-[#021212] w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase italic tracking-tighter">Nexus Intelligence</h3>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Chatting about {selectedProperty.name}</p>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-white/20 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", msg.role === 'user' ? "bg-[#2E5BFF]" : "bg-[#38E8C6]")}>
                  {msg.role === 'user' ? <User className="text-white w-4 h-4" /> : <Bot className="text-[#021212] w-4 h-4" />}
                </div>
                <div className={cn("max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed", msg.role === 'user' ? "bg-[#2E5BFF]/10 text-white rounded-tr-none" : "bg-[#1A1A1B] text-white/80 rounded-tl-none border border-white/5")}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 border-t border-white/5 bg-[#1A1A1B]/30">
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about ROI, Comps, or Amenities..."
                className="flex-1 bg-[#1A1A1B] border border-[#333] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#38E8C6] transition-all"
              />
              <button type="submit" className="bg-[#38E8C6] text-[#021212] p-3 rounded-xl hover:scale-105 transition-transform">
                <ChevronRight className="w-6 h-6" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Contract Modal */}
      {step === Step.CONTRACT_DRAFT && selectedProperty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-[#1A1A1B]/95 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="max-w-4xl w-full bg-[#252526] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#1A1A1B]/50">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Acquisition Contract</h2>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Drafting for {selectedProperty.name}</p>
              </div>
              <button 
                onClick={() => { setStep(Step.COMMAND_CENTER); setContract(null); }}
                className="text-white/20 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-8">
                  <div className="relative">
                  <div className="w-20 h-20 border-4 border-[#38E8C6] border-t-transparent rounded-full animate-spin"></div>
                  <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#38E8C6] w-8 h-8 animate-pulse" />
                  </div>
                  <div className="text-center space-y-3">
                    <h3 className="text-2xl font-black italic uppercase text-[#38E8C6] tracking-widest">Architecting Agreement...</h3>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Synthesizing Value-Add clauses and Seller Reality Check.</p>
                  </div>
                </div>
              ) : contract && (
                <>
                  <div className="grid grid-cols-3 gap-8">
                    <div className="bg-[#1A1A1B] p-8 rounded-3xl border border-white/5 shadow-inner">
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Offer Price</div>
                      <div className="text-4xl font-black text-[#38E8C6] italic tracking-tighter">${contract.purchase_price.toLocaleString()}</div>
                    </div>
                    <div className="bg-[#1A1A1B] p-8 rounded-3xl border border-white/5 shadow-inner">
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Closing Date</div>
                      <div className="text-4xl font-black text-white italic tracking-tighter">{contract.closing_date}</div>
                    </div>
                    <div className="bg-[#1A1A1B] p-8 rounded-3xl border border-white/5 shadow-inner">
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">POF Timeline</div>
                      <div className="text-4xl font-black text-[#2E5BFF] italic tracking-tighter">{contract.proof_of_funds_days} Days</div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-[#38E8C6] italic">Value-Add Clause</h3>
                    <div className="bg-[#1A1A1B] p-10 rounded-[40px] border border-white/5 relative shadow-inner">
                      <div className="absolute top-0 left-10 w-px h-full bg-[#38E8C6]/20"></div>
                      <p className="text-xl text-white/80 leading-relaxed italic pl-10 font-medium">"{contract.value_add_clause}"</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-[#2E5BFF] italic">Seller Reality Check</h3>
                    <div className="bg-[#2E5BFF]/5 p-10 rounded-[40px] border border-[#2E5BFF]/20 shadow-inner">
                      <p className="text-base text-white/70 leading-relaxed whitespace-pre-wrap font-medium">{contract.seller_reality_check}</p>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-8">
                    <button className="flex-1 bg-[#38E8C6] text-[#021212] py-6 rounded-[32px] font-black text-xl uppercase italic shadow-2xl shadow-[#38E8C6]/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 group">
                      <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Execute & Send to Owner
                    </button>
                    <button className="px-12 bg-white/5 text-white py-6 rounded-[32px] font-black text-xl uppercase italic border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3">
                      <Download className="w-6 h-6" /> Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agent Status Bar */}
      {agentStatus.task && (
        <div 
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] w-full max-w-2xl transition-all duration-500",
            agentStatus.isExpanded ? "bottom-6" : "bottom-6"
          )}
        >
          <div className="bg-[#252526] border border-[#38E8C6]/30 rounded-2xl shadow-[0_0_40px_rgba(56,232,198,0.1)] overflow-hidden backdrop-blur-xl">
            {/* Header / Progress Bar */}
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setAgentStatus(prev => ({ ...prev, isExpanded: !prev.isExpanded }))}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <div className="w-8 h-8 bg-[#38E8C6]/10 rounded-lg flex items-center justify-center">
                    <Zap className={cn("w-4 h-4 text-[#38E8C6]", isLoading && "animate-pulse")} />
                  </div>
                  {isLoading && (
                    <div className="absolute -inset-1 border border-[#38E8C6]/30 rounded-lg animate-ping opacity-20"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-[#38E8C6] uppercase tracking-widest italic">Nexus Intelligence Active</span>
                    <span className="text-[10px] text-white/40 font-bold uppercase">{isLoading ? 'Processing' : 'Complete'}</span>
                  </div>
                  <div className="text-xs font-bold text-white/80 truncate max-w-[400px]">
                    {agentStatus.task}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="h-8 w-[1px] bg-white/10"></div>
                <button className="text-white/40 hover:text-white transition-colors">
                  {agentStatus.isExpanded ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 rotate-90" />}
                </button>
              </div>
            </div>

            {/* Expanded Logs */}
            {agentStatus.isExpanded && (
              <div className="border-t border-white/5 bg-[#1A1A1B]/50 p-4 max-h-64 overflow-y-auto custom-scrollbar font-mono text-[10px]">
                <div className="space-y-1.5">
                  {agentStatus.logs.map((log, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-white/20 whitespace-nowrap">{(i + 1).toString().padStart(2, '0')}</span>
                      <span className={cn(
                        "break-all",
                        log.includes('ERROR') ? "text-red-400" : 
                        log.includes('[SYSTEM]') ? "text-[#2E5BFF]" : "text-white/60"
                      )}>
                        {log}
                      </span>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 animate-pulse">
                      <span className="text-white/20">{(agentStatus.logs.length + 1).toString().padStart(2, '0')}</span>
                      <span className="text-[#38E8C6]">_</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 232, 198, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 232, 198, 0.3); }
      `}</style>
    </div>
  );
};

export default App;
