







import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Scenario, AnalysisLoop, AnalysisHistoryRecord, Source, MitreTechnique, CycleStage, QueryPlan, ScenarioProfile, ActorCategory, Vector } from './types';
import {
  categorizeThreatActor,
  runSearchStream,
  getNextStepStream,
  generateExecutiveSummary,
  generateSourceSnippets
} from './services/geminiService';

import { ScenarioInput } from './components/ScenarioInput';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { CategorizationCard } from './components/CategorizationCard';
import { ModeSelector } from './components/ModeSelector';
import { IntelligenceCycleViz } from './components/IntelligenceCycleViz';
import { ExecutiveSummaryCard } from './components/ExecutiveSummaryCard';
import { HistoryDropdown } from './components/HistoryDropdown';
import { EvidenceTrail } from './components/EvidenceTrail';
import { LeftRailNavigation } from './components/LeftRailNavigation';
import { BreachDataAnalyst } from './components/BreachDataAnalyst';
import { ThreatLandscape } from './components/ThreatLandscape';
import { ThreatRadar } from './components/ThreatRadar';
import { PanelRightIcon } from './components/icons/PanelRightIcon';
import { Overview } from './components/Overview';
import { IntelligenceDashboard } from './components/IntelligenceDashboard';
import { YearlyAttempts } from './components/YearlyAttempts';
import { QueryPlanPreview } from './components/QueryPlanPreview';
import { AttackMapUploader } from './components/AttackMapUploader';
import { ScenarioModeler } from './components/ScenarioModeler';


const BellIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);
const UserCircleIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const TopBar: React.FC = () => (
  <header className="h-[60px] bg-surface/80 backdrop-blur-md border-b border-border/60 flex items-center justify-between px-6 sticky top-0 z-50">
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-text-primary text-surface flex items-center justify-center font-bold text-sm tracking-tighter">
            CT
        </div>
        <h1 className="font-semibold text-sm tracking-tight text-text-primary">Cyber Threat Intelligence</h1>
    </div>
    <div className="flex items-center gap-4">
        <button className="text-text-secondary hover:text-text-primary transition-colors">
            <UserCircleIcon className="w-6 h-6" />
        </button>
    </div>
  </header>
);

// --- MOCK DATA & LOGIC FOR QUERY PLANNER ---
const ACTOR_REGISTRY = [
    { id: 'apt28', aliases: ['APT28', 'Fancy Bear', 'Sofacy'], category: 'state_nexus' as ActorCategory },
    { id: 'fin7', aliases: ['FIN7', 'Carbanak Group'], category: 'eCrime' as ActorCategory },
    { id: 'lazarus', aliases: ['Lazarus Group'], category: 'state_nexus' as ActorCategory },
];

const VECTOR_ONTOLOGY: { [key: string]: Vector[] } = {
    'phishing': ['phish'],
    'ransomware': ['exploit'],
    'spear-phishing': ['phish'],
    'cve': ['exploit'],
};

const METRIC_ROSTER = {
    Ransomware: {
        NonAdvanced: [{ key: 'ic3_ransomware_complaints', title: 'FBI IC3 Complaints' }, { key: 'kev_edge_additions_year', title: 'CISA KEV Edge Additions' }],
    },
    'IP Theft': {
        Advanced: [{ key: 'msft_ns_targeting_share', title: 'Microsoft Nation-State Targeting' }, { key: 'mtrends_espionage_presence', title: 'Mandiant M-Trends Presence' }],
    }
};

const LAST_YEAR_YIELD = {
    'ic3_ransomware_complaints': '2,825',
    'kev_edge_additions_year': '89',
    'msft_ns_targeting_share': '45%',
    'mtrends_espionage_presence': 'High',
};

const SCENARIO_WEIGHTING_TABLE = [
    { vectors: ['phish'], boost: 0.15, metricKey: 'ic3_ransomware_complaints' },
    { actor_category: 'state_nexus', boost: 0.2, metricKey: 'msft_ns_targeting_share' },
];

const generateQueryPlan = (scenario: Scenario): QueryPlan[] => {
    // 1. Intent Parser (Section 7.2)
    const actor_input = scenario.threatActor.toLowerCase();
    const actor = ACTOR_REGISTRY.find(a => a.aliases.some(alias => actor_input.includes(alias.toLowerCase())));
    const profile: ScenarioProfile = {
        year: new Date().getFullYear(),
        actor_input: scenario.threatActor,
        actor_id: actor?.id,
        actor_category: actor?.category || 'unknown',
        mo_input: scenario.modusOperandi,
        vectors: Object.entries(VECTOR_ONTOLOGY).reduce((acc, [keyword, vectors]) => {
            if (scenario.modusOperandi.toLowerCase().includes(keyword)) {
                return [...acc, ...vectors];
            }
            return acc;
        }, [] as Vector[]),
        target_input: scenario.target,
        profile_confidence: actor ? 0.9 : 0.5,
    };

    const plans: QueryPlan[] = [];
    
    // 2. Query Plan Assembly (Section 7.3) - Simplified for Ransomware bucket
    if (profile.vectors.includes('exploit') || profile.actor_category === 'eCrime') {
        const metrics = METRIC_ROSTER.Ransomware.NonAdvanced.map(metric => {
            const boost = SCENARIO_WEIGHTING_TABLE.find(rule => 
                (rule.vectors && profile.vectors.some(v => rule.vectors.includes(v))) && rule.metricKey === metric.key
            )?.boost || 0;
            const baseWeight = 0.5;
            return {
                metricKey: metric.key,
                datasetTitle: metric.title,
                baseWeight,
                boost,
                finalWeight: Math.min(1.0, baseWeight + boost),
                filterApplied: 'Global',
                notes: boost > 0 ? `Vector '${profile.vectors.find(v => SCENARIO_WEIGHTING_TABLE.some(r => r.vectors?.includes(v)))}' triggered boost.` : 'Generic weight.'
            };
        });

        // 3. Quality Gate & Coverage (Section 7.5, 7.7)
        const coverageScore = 100; // Mock
        const qualityGateMessage = metrics.length < 2 ? "Warning: Fewer than two metrics available." : undefined;

        plans.push({
            bucket: 'Ransomware',
            metrics,
            fallbacks: [],
            coverageScore,
            expectedYield: METRIC_ROSTER.Ransomware.NonAdvanced.map(m => ({ metricKey: m.title, lastYearCount: LAST_YEAR_YIELD[m.key as keyof typeof LAST_YEAR_YIELD] || 'N/A' })),
            qualityGateMessage,
        });
    }

    return plans;
};


const App: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>({
    threatActor: 'APT28',
    modusOperandi: 'Phishing campaigns using CVE-2023-38831',
    target: 'NATO government entities',
    targetIndustry: 'Government',
    geographicRegion: 'Europe',
    purdueLevel: 'N/A'
  });
  const [loops, setLoops] = useState<AnalysisLoop[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Analyzing...');
  const [categorization, setCategorization] = useState<{ category: string; justification: string } | null>(null);
  const [mode, setMode] = useState<'manual' | 'manual'>('manual');
  const [pausedLoopId, setPausedLoopId] = useState<number | null>(null);
  const [activeCycleStage, setActiveCycleStage] = useState<CycleStage>('idle');
  const [executiveSummary, setExecutiveSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [history, setHistory] = useState<AnalysisHistoryRecord[]>([]);
  const [allSources, setAllSources] = useState<Source[]>([]);
  const [editedNextQuery, setEditedNextQuery] = useState<string>('');
  const [analystNotes, setAnalystNotes] = useState<string>('');
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'cti' | 'breach' | 'landscape' | 'radar' | 'yearly_attempts' | 'scenario_modeler'>('overview');

  // State for Query Planner
  const [queryPlans, setQueryPlans] = useState<QueryPlan[] | null>(null);
  const [showPlanPreview, setShowPlanPreview] = useState<boolean>(false);

  // State for Context Uploader
  const [uploadedContextContent, setUploadedContextContent] = useState<string>('');
  const [uploadedContextFileName, setUploadedContextFileName] = useState<string | null>(null);


  // Load history from local storage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('ctiAnalysisHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from local storage:", error);
    }
  }, []);

  // Save history to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('ctiAnalysisHistory', JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to local storage:", error);
    }
  }, [history]);


  const resetState = () => {
    setLoops([]);
    setIsLoading(false);
    setCategorization(null);
    setPausedLoopId(null);
    setActiveCycleStage('idle');
    setExecutiveSummary(null);
    setAllSources([]);
    setAnalystNotes('');
    setEditedNextQuery('');
    setQueryPlans(null);
    setShowPlanPreview(false);
    setUploadedContextContent('');
    setUploadedContextFileName(null);
  };
  
  const handleLoadHistory = (id: string) => {
    const record = history.find(h => h.id === id);
    if (record) {
      resetState();
      setScenario(record.scenario);
      setCategorization(record.categorization);
      setLoops(record.analysisLoops);
      setExecutiveSummary(record.executiveSummary);

      // Re-populate allSources from the loaded history
      const sourcesFromHistory = record.analysisLoops.reduce((acc, loop) => {
        loop.sources.forEach(source => {
          if (!acc.some(s => s.uri === source.uri)) {
            acc.push(source);
          }
        });
        return acc;
      }, [] as Source[]);
      setAllSources(sourcesFromHistory);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all analysis history? This action cannot be undone.")) {
        setHistory([]);
    }
  };


  const runAnalysisLoop = useCallback(async (
    currentQuery: string, 
    loopId: number,
    overrideCategorization?: { category: string; justification: string }
  ) => {
    const currentCategorization = overrideCategorization || categorization;
    
    // --- SEARCH STEP (Flash) ---
    setActiveCycleStage('collecting');
    const searchLoop: AnalysisLoop = {
      id: loopId,
      query: currentQuery,
      findings: '',
      conclusion: '',
      sources: [],
      modelUsed: 'flash',
      status: 'searching',
    };
    setLoops(prev => [...prev, searchLoop]);

    try {
        const stream = await runSearchStream(currentQuery);
        let findingsText = '';
        let sources: Source[] = [];

        for await (const chunk of stream) {
            findingsText += chunk.text;
            if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                const newSources = (chunk.candidates[0].groundingMetadata.groundingChunks || [])
                    .filter((c: any) => c.web)
                    .map((c: any) => ({ uri: c.web.uri, title: c.web.title || "Untitled" }));
                
                newSources.forEach((ns: Source) => {
                    if (!sources.some(s => s.uri === ns.uri)) {
                        sources.push(ns);
                    }
                });
            }

            setLoops(prev => prev.map(l => l.id === loopId ? { ...l, findings: findingsText, sources } : l));
        }
        
        setActiveCycleStage('new_info');
        // Generate snippets for sources
        if (sources.length > 0) {
            const snippets = await generateSourceSnippets(findingsText, sources);
            const sourcesWithSnippets = sources.map(s => {
                const snippetData = snippets.find(sn => sn.uri === s.uri);
                return { ...s, snippet: snippetData?.snippet };
            });

             setLoops(prev => prev.map(l => l.id === loopId ? { ...l, sources: sourcesWithSnippets } : l));
             setAllSources(prevAll => {
                const newAllSources = [...prevAll];
                sourcesWithSnippets.forEach(s => {
                    if (!newAllSources.some(as => as.uri === s.uri)) {
                        newAllSources.push(s);
                    }
                });
                return newAllSources;
            });
        }
        
        setLoops(prev => prev.map(l => l.id === loopId ? { ...l, status: 'completed' } : l));

    } catch(error) {
        console.error("Error in search loop:", error);
        setLoops(prev => prev.map(l => l.id === loopId ? { ...l, status: 'error', findings: `Error: ${error instanceof Error ? error.message : 'Unknown search error'}` } : l));
        setIsLoading(false);
        setActiveCycleStage('idle');
        return;
    }
    
    // --- Safeguard for categorization ---
    if (!currentCategorization) {
        console.error("Categorization is null. Cannot proceed with reasoning loop.");
        const reasonLoopId = loopId + 1;
        setLoops(prev => {
            const newLoops = [...prev];
            const searchLoopIndex = newLoops.findIndex(l => l.id === loopId);
            if (searchLoopIndex > -1) {
                newLoops[searchLoopIndex] = { ...newLoops[searchLoopIndex], status: 'completed' };
            }
            newLoops.push({
                id: reasonLoopId,
                query: "Synthesizing next steps...",
                findings: '',
                conclusion: "CRITICAL ERROR: Threat actor categorization was not available. Analysis halted.",
                sources: [],
                modelUsed: 'pro',
                status: 'error',
            });
            return newLoops;
        });
        setIsLoading(false);
        setActiveCycleStage('idle');
        return;
    }

    // --- REASONING STEP (Pro) ---
    setActiveCycleStage('analysis_answers');
    const reasonLoopId = loopId + 1;
    const reasonLoop: AnalysisLoop = {
        id: reasonLoopId,
        query: "Synthesizing next steps based on new findings...",
        findings: '',
        conclusion: '',
        sources: [],
        modelUsed: 'pro',
        status: 'thinking',
    };
    setLoops(prev => [...prev, reasonLoop]);

    try {
        const previousLoops = loops.map(l => l.id <= loopId ? l : { ...l, status: 'completed' }).concat([{...searchLoop, status: 'completed'}]);

        const stream = await getNextStepStream(scenario, previousLoops, currentCategorization.category, analystNotes, uploadedContextContent);
        setAnalystNotes(''); // Clear notes after they've been used

        let conclusionText = '';
        let jsonPayload = '';
        let parsingState: 'conclusion' | 'json' | 'none' = 'none';

        for await (const chunk of stream) {
            const text = chunk.text;
            
            const lines = text.split('\n');
            for (const line of lines) {
                if (line.includes("CONCLUSION_START")) {
                    parsingState = 'conclusion';
                    continue;
                }
                if (line.includes("CONCLUSION_END")) {
                    parsingState = 'none';
                    continue;
                }
                if (line.includes("JSON_PAYLOAD_START")) {
                    parsingState = 'json';
                    continue;
                }
                if (line.includes("JSON_PAYLOAD_END")) {
                    parsingState = 'none';
                    continue;
                }
                
                if (parsingState === 'conclusion') {
                    conclusionText += line + '\n';
                } else if (parsingState === 'json') {
                    jsonPayload += line;
                }
            }
            
            setLoops(prev => prev.map(l => l.id === reasonLoopId ? { ...l, conclusion: conclusionText } : l));
        }

        const parsedPayload = JSON.parse(jsonPayload);
        const nextQuery = parsedPayload.nextQuery as string;
        const confidenceScore = parsedPayload.confidenceScore as 'Low' | 'Medium' | 'High';
        const mitreTechniques = parsedPayload.mitreTechniques as MitreTechnique[];
        
        setLoops(prev => prev.map(l => l.id === reasonLoopId ? { ...l, conclusion: conclusionText.trim(), status: 'completed', confidenceScore, mitreTechniques, nextQuery } : l));
        setEditedNextQuery(nextQuery);

        if (!nextQuery) {
            setIsLoading(false);
            setActiveCycleStage('idle');
        } else {
            if (mode === 'manual') {
                setPausedLoopId(reasonLoopId);
                setIsLoading(false);
                setActiveCycleStage('idle');
            } else {
                runAnalysisLoop(nextQuery, reasonLoopId + 1, currentCategorization);
            }
        }

    } catch (error) {
        console.error("Error in reasoning loop:", error);
        setLoops(prev => prev.map(l => l.id === reasonLoopId ? { ...l, status: 'error', conclusion: `Error: ${error instanceof Error ? error.message : 'Unknown reasoning error'}` } : l));
        setIsLoading(false);
        setActiveCycleStage('idle');
    }
  }, [scenario, loops, categorization, mode, analystNotes, uploadedContextContent]);


  const startAnalysis = useCallback(async (initialQuery: string) => {
    resetState();
    setIsLoading(true);
    setLoadingText('Categorizing...');
    
    // Step 1: Categorize
    setActiveCycleStage('problem');
    let cat;
    try {
        cat = await categorizeThreatActor(scenario.threatActor);
        setCategorization(cat);
    } catch(error) {
        console.error(error);
        setCategorization({ category: 'Error', justification: error instanceof Error ? error.message : 'Failed to categorize actor.' });
        setIsLoading(false);
        setActiveCycleStage('idle');
        return;
    }
    
    // Step 2: Run first loop
    setLoadingText('Analyzing...');
    setActiveCycleStage('needs');
    runAnalysisLoop(initialQuery, 1, cat);

  }, [scenario, runAnalysisLoop]);

  const handleRunFromPlan = () => {
    if (!queryPlans || queryPlans.length === 0) return;
    const firstQuery = queryPlans[0].metrics.sort((a,b) => b.finalWeight - a.finalWeight)[0]?.datasetTitle || scenario.modusOperandi;
    startAnalysis(firstQuery);
    setShowPlanPreview(false);
  };
  
  const handleGeneratePlan = () => {
    const plans = generateQueryPlan(scenario);
    setQueryPlans(plans);
    setShowPlanPreview(true);
  };

  const proceedFromPause = () => {
    const lastLoop = loops[loops.length - 1];
    if (pausedLoopId && lastLoop && lastLoop.nextQuery) {
      setIsLoading(true);
      setPausedLoopId(null);
      runAnalysisLoop(editedNextQuery, lastLoop.id + 1);
    }
  };

  const stopAnalysis = () => {
    setPausedLoopId(null);
    setIsLoading(false);
    setActiveCycleStage('idle');
  };

  const handleGenerateSummary = async () => {
    if (!categorization) return;
    setIsGeneratingSummary(true);
    try {
      const summary = await generateExecutiveSummary(scenario, categorization.category, loops);
      setExecutiveSummary(summary);

      // Save to history
      setHistory(prev => {
        const newRecord: AnalysisHistoryRecord = {
          id: uuidv4(),
          timestamp: Date.now(),
          scenario,
          categorization,
          analysisLoops: loops,
          executiveSummary: summary
        };
        // Avoid duplicates if re-generating
        const existingIndex = prev.findIndex(h => h.scenario.threatActor === scenario.threatActor && h.scenario.modusOperandi === scenario.modusOperandi);
        if (existingIndex > -1) {
            const updatedHistory = [...prev];
            updatedHistory[existingIndex] = newRecord;
            return updatedHistory;
        }
        return [newRecord, ...prev];
      });

    } catch(error) {
      console.error(error);
      setExecutiveSummary("Error generating summary.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };
  
  // Fix: Updated handleFileUpload to accept the 'vectors' argument from AttackMapUploader.
  // Although not used to update state in this implementation, it resolves the prop type mismatch.
  const handleFileUpload = (fileName: string, content: string, vectors: string[]) => {
    setUploadedContextFileName(fileName);
    setUploadedContextContent(content);
  };
  
  const handleFileClear = () => {
    setUploadedContextFileName(null);
    setUploadedContextContent('');
  };


  const renderActiveTab = () => {
    switch(activeTab) {
      case 'overview':
        return <Overview history={history} />;
      case 'intelligence':
        return <IntelligenceDashboard />;
      case 'cti':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <ScenarioInput 
                scenario={scenario} 
                setScenario={setScenario} 
                onGeneratePlan={handleGeneratePlan} 
                isLoading={isLoading}
                loadingText={loadingText}
              />
               {showPlanPreview && queryPlans && (
                <QueryPlanPreview 
                    plans={queryPlans}
                    onRun={handleRunFromPlan}
                    onCancel={() => setShowPlanPreview(false)}
                />
               )}
              <AttackMapUploader
                onFileUpload={handleFileUpload}
                onFileClear={handleFileClear}
                uploadedFileName={uploadedContextFileName}
                isLoading={isLoading}
              />
              <AnalysisDisplay 
                loops={loops} 
                pausedLoopId={pausedLoopId}
                onProceed={proceedFromPause}
                onStop={stopAnalysis}
                editedQuery={editedNextQuery}
                onQueryChange={setEditedNextQuery}
                analystNotes={analystNotes}
                onNotesChange={setAnalystNotes}
              />
              {executiveSummary && <ExecutiveSummaryCard summary={executiveSummary} onGenerate={handleGenerateSummary} isGenerating={isGeneratingSummary} />}
              {loops.length > 0 && !executiveSummary && !isLoading && !pausedLoopId && <ExecutiveSummaryCard summary={null} onGenerate={handleGenerateSummary} isGenerating={isGeneratingSummary} />}
            </div>
            <div className="lg:col-span-1 space-y-6 sticky top-[72px]">
              <CategorizationCard 
                actorName={scenario.threatActor} 
                category={categorization?.category || null} 
                justification={categorization?.justification || null} 
                isLoading={isLoading && loadingText === 'Categorizing...'}
              />
              <IntelligenceCycleViz activeStage={activeCycleStage} />
              {/* <ModeSelector mode={mode} setMode={setMode} disabled={isLoading || loops.length > 0} /> */}
            </div>
          </div>
        );
      case 'scenario_modeler':
        return <ScenarioModeler />;
      case 'breach':
        return <BreachDataAnalyst />;
      case 'landscape':
        return <ThreatLandscape />;
      case 'radar':
        return <ThreatRadar />;
      case 'yearly_attempts':
        return <YearlyAttempts />;
      default:
        return <div>Select a tool</div>;
    }
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <TopBar />
      <div className="flex">
        <LeftRailNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-grow p-6 relative">
          {renderActiveTab()}
          {activeTab === 'cti' && (
             <div className={`fixed top-[56px] right-0 h-[calc(100vh-56px)] bg-surface border-l border-border transition-transform duration-300 ease-in-out ${isInspectorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <button onClick={() => setIsInspectorOpen(false)} className="absolute top-4 -left-10 bg-surface border border-r-0 border-border rounded-l-md p-2 text-text-secondary hover:text-text-primary">
                    <PanelRightIcon className="w-5 h-5" />
                </button>
                <div className="w-[350px] p-4 h-full">
                  <EvidenceTrail sources={allSources} />
                </div>
            </div>
          )}
           {!isInspectorOpen && activeTab === 'cti' && (
                <button onClick={() => setIsInspectorOpen(true)} className="fixed top-20 right-6 bg-surface border border-border rounded-md p-2 text-text-secondary hover:text-text-primary animate-fade-in">
                    <PanelRightIcon className="w-5 h-5" />
                </button>
           )}
        </main>
      </div>
        <style>{`
            .prose {
                color: #111827;
            }
            .prose h2 {
                color: #111827;
                font-weight: 600;
            }
            .prose h3 {
                color: #111827;
                font-weight: 600;
            }
            .prose strong {
                color: #111827;
                font-weight: 600;
            }
             .prose li {
                margin-top: 0.25em;
                margin-bottom: 0.25em;
            }
        `}</style>
    </div>
  );
};

export default App;