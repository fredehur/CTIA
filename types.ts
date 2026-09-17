







export interface Scenario {
  threatActor: string;
  modusOperandi: string;
  target: string;
  targetIndustry?: string;
  geographicRegion?: string;
  purdueLevel?: string;
}

export interface Source {
  uri: string;
  title: string;
  snippet?: string;
}

export type ModelUsed = 'flash' | 'pro';

export interface MitreTechnique {
  id: string;
  name: string;
}

export interface AnalysisLoop {
  id: number;
  query: string;
  findings: string;
  conclusion: string;
  sources: Source[];
  modelUsed: ModelUsed;
  status: 'searching' | 'thinking' | 'completed' | 'error';
  confidenceScore?: 'Low' | 'Medium' | 'High';
  mitreTechniques?: MitreTechnique[];
  analystNotes?: string;
  nextQuery?: string;
}

export type CycleStage =
  | 'idle'
  | 'problem'
  | 'needs'
  | 'analysis_gaps'
  | 'collecting'
  | 'new_info'
  | 'analysis_answers';

export interface AnalysisHistoryRecord {
  id: string;
  timestamp: number;
  scenario: Scenario;
  categorization: { category: string; justification: string };
  analysisLoops: AnalysisLoop[];
  executiveSummary: string | null;
}

// Types for Breach Data Analyst feature
export type DataPointType =
  | 'dataLeaksActor'
  | 'fbiIncidentsActor'
  | 'dataLeaksModus'
  | 'fbiIncidentsModus'
  | 'ctiicIncidents'
  | 'companiesExposed'
  | 'organizationsInScope';

export interface DataPointResult {
  status: 'idle' | 'loading' | 'completed' | 'error';
  data: string;
  sources: Source[];
  error?: string;
  statistic?: string | null;
  statisticStatus?: 'idle' | 'loading' | 'completed' | 'error';
}

export interface BreachDataResults {
  dataLeaksActor: DataPointResult;
  fbiIncidentsActor: DataPointResult;
  dataLeaksModus: DataPointResult;
  fbiIncidentsModus: DataPointResult;
  ctiicIncidents: DataPointResult;
  companiesExposed: DataPointResult;
  organizationsInScope: DataPointResult;
}

// Types for Threat Landscape feature (Top Trends and Event Analysis modes)
export interface AnalyticalBiasChallenge {
  challenge: string;
  proposedSolution: string;
}

export interface DetailedAnalysisPoint {
  pointTitle: string;
  analysis: string;
}

export interface Memorandum {
  title?: string;
  introduction?: string; // Brief overview of the situation & context
  purpose: string;
  pointsOfConcern?: string[]; // Specific points of concern / Main areas of concern
  assessment: string; // Key assessments (bulleted or string)
  detailedAnalysis?: (DetailedAnalysisPoint | string)[] | string; // Elaboration paragraphs corresponding to points
  biasChallenges?: (AnalyticalBiasChallenge | string)[] | string; // Biases or analytical challenges with proposed solutions
  // Backward compatibility fields:
  situation?: string;
  considerations?: string;
}

export interface SavedMemorandum {
  id: string;
  timestamp: number;
  eventDescription: string;
  targetAudience: string;
  orgProfile: string;
  memorandum: Memorandum;
}

export interface TailoredAnalysis {
  audience: string;
  impact: string;
  recommendations: string;
  status: 'idle' | 'loading' | 'completed' | 'error';
  memorandum?: Memorandum;
  memorandumStatus?: 'idle' | 'loading' | 'completed' | 'error';
}

export interface ThreatLandscapeTrend {
  trendTitle: string;
  globalImpact: string;
  organizationalImpact: string;
  mitreTechniques: MitreTechnique[];
  sources: Source[];
  validationStatus?: 'idle' | 'validating' | 'validated' | 'error';
  confidenceScore?: 'Low' | 'Medium' | 'High';
  validationSummary?: string;
  tailoredAnalyses?: TailoredAnalysis[];
  correlatedRadarThreat?: ThreatRadarPoint;
  updateStatus?: 'idle' | 'checking' | 'update_available' | 'no_update' | 'error';
  updateSuggestion?: {
    summaryOfChanges: string;
    updatedTrendData: {
      trendTitle: string;
      globalImpact: string;
      organizationalImpact: string;
      mitreTechniques: MitreTechnique[];
      sources: Source[];
    };
  };
}

export interface ThreatLandscapeResult {
  reportTitle: string;
  trends: ThreatLandscapeTrend[];
}


// Types for Threat Landscape feature (Structured Matrix mode)
export interface ThreatMatrixQuadrant {
  title: string;
  insight: string;
  objective: string;
  relevance: string;
  sectorImpacted: string;
  sources: Source[];
  validationStatus?: 'idle' | 'validating' | 'validated' | 'error';
  confidenceScore?: 'Low' | 'Medium' | 'High';
  validationSummary?: string;
}

export interface ThreatMatrixResult {
  nationStateTech: ThreatMatrixQuadrant;
  nationStateGeopolitical: ThreatMatrixQuadrant;
  criminalTech: ThreatMatrixQuadrant;
  criminalGeopolitical: ThreatMatrixQuadrant;
  reportTitle: string;
}

export interface ThreatMatrixPreview {
  reportTitle: string;
  nationStateTechTitle: string;
  nationStateGeopoliticalTitle: string;
  criminalTechTitle: string;
  criminalGeopoliticalTitle: string;
}

// Types for Threat Radar feature
export interface ThreatRadarQuarterlyPoint {
  quarter: string; // e.g., "Q3 2024"
  motivation: number; // Scale of 1-10
  resources: number; // Scale of 1-10
}

export type ThreatCategory = 'Criminal' | 'Insider' | 'Nation-State' | 'Hacktivist';

export interface ThreatRadarPoint {
  name: string;
  category: ThreatCategory;
  motivation: number; // Current motivation, scale 1-10
  resources: number; // Current resources, scale 1-10
  description: string; // Short description
  quarterlyData: ThreatRadarQuarterlyPoint[];
}

export interface ThreatRadarResult {
  title: string;
  threats: ThreatRadarPoint[];
}

// Types for Chat feature
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

// Types for Overview Dashboard
export interface SavedBreachData {
  id: string;
  timestamp: number;
  threatActor: string;
  modusOperandi: string;
  results: BreachDataResults;
}

export interface SavedThreatLandscape {
  id: string;
  timestamp: number;
  report: ThreatLandscapeResult | ThreatMatrixResult;
  orgProfile: string;
  mode: 'trends' | 'matrix';
}

export interface SavedThreatRadar {
  id: string;
  timestamp: number;
  report: ThreatRadarResult;
  orgProfile: string;
  mode: 'profile' | 'archetype';
}

// Types for Yearly Expected Attempts
export interface SupplementalSignal {
  signalId: string;
  metric: string;
  value: number | string;
  unit: string;
  confidence: 'low' | 'medium' | 'high';
  excerpt: string;
  citationUrl: string;
}

export interface ArchetypeSignalResult {
  scenarioId: string;
  signals: SupplementalSignal[];
  explanation?: string;
}

// Fix: Expanded CISector to include all sectors used in the application.
export type CISector =
  | 'Healthcare'
  | 'Critical Manufacturing'
  | 'Energy'
  | 'Transportation'
  | 'Water/Wastewater'
  | 'Financial Services'
  | 'Government'
  | 'Chemical'
  | 'Commercial Facilities'
  | 'Communications'
  | 'Dams'
  | 'Defense Industrial Base'
  | 'Emergency Services'
  | 'Food and Agriculture'
  | 'Information Technology'
  | 'Nuclear Reactors, Materials, and Waste'
  // Fix: Add 'Retail' to align with its usage in test files and UI components.
  | 'Retail';

export interface RiskScenario {
  id: string;
  baseYear: number;
  lookbackYears: number;
  darkNumber?: number;
  bucket: 'ransomware' | 'fraud' | 'ip_theft' | '';
  sophistication: 'non_advanced' | 'advanced' | '';
  targetProfile?: 'smb' | 'large_enterprise' | 'critical_infrastructure' | '';
  actor_ids: string[];
  vectors: string;
  sector: CISector | '';
  region: string;
  signals?: SupplementalSignal[];
  isTargetLucrative?: boolean;
  areSystemsHighValue?: boolean;
  hasExternalSupport?: boolean;
  purdueLevel?: string; // Added to match its usage in successModel
}

export interface CalculationLedger {
  baseline_selection: {
    target_profile: string;
    sophistication: string;
    range_low: number;
    range_high: number;
    justification: string;
  };
  reporting_rate_adjustment: {
    incident_rate_observed: number;
    dark_number_percentage: number;
    reporting_rate: number;
    formula: string;
    adjusted_incident_rate: number;
  };
  calibration: {
    factors: {
      metric_key: string;
      evidence_summary: string;
      impact_direction: 'positive' | 'negative' | 'neutral' | 'additive';
      impact_magnitude: 'strong' | 'moderate' | 'weak';
      reasoning: string;
      factorType?: 'multiplier' | 'delta';
    }[];
    final_calibrated_baseline: number;
    calibration_justification: string;
  };
  success_rate_application: {
    incident_rate_calibrated: number;
    success_rate: number;
    success_rate_source: string;
    success_rate_metric: string;
    formula: string;
    final_lambda_mean: number;
  };
}


export interface YearlyCalculation {
  year: number;
  error?: string;
  lambda_mean: number | 'N/A' | null;
  lambda_low: number | 'N/A' | null;
  lambda_high: number | 'N/A' | null;
  headline: number | 'N/A' | null;
  summary: string;
  justification: string;
  confidence_band?: 'Low' | 'Medium' | 'High';
  keyFactors?: { metric_key: string; contribution: number }[];
  coverage?: number;
  fallbacks?: string[];
  ignored_signals?: string[];
  method_version?: string;
  baseline_year?: number;
  scenario_hash?: string;
  weights_hash?: string;
  sources_hash?: string;
  sourceExtraction?: {
    metric_key: string;
    raw_value: string;
    unit: string;
    source_id: string;
    dataset_version: string;
    citation_url: string;
  }[];
  calculationLedger?: CalculationLedger;
  successCalculationLedger?: SuccessCalculationLedger;
  success_rate_mean?: number | 'N/A' | null;
  success_rate_low?: number | 'N/A' | null;
  success_rate_high?: number | 'N/A' | null;
}

export interface AttemptCalculationResult {
  id: string;
  scenario: RiskScenario;
  lambda_mean: number | 'N/A' | null;
  lambda_low: number | 'N/A' | null;
  lambda_high: number | 'N/A' | null;
  headline: number | 'N/A' | null;
  summary: string;
  justification: string;
  status: 'idle' | 'loading' | 'completed' | 'error';
  error?: string;
  confidence_band?: 'Low' | 'Medium' | 'High';
  keyFactors?: { metric_key: string; contribution: number }[];
  coverage?: number;
  fallbacks?: string[];
  ignored_signals?: string[];
  method_version?: string;
  baseline_year?: number;
  scenario_hash?: string;
  weights_hash?: string;
  sources_hash?: string;
  sourceExtraction?: {
    metric_key: string;
    raw_value: string;
    unit: string;
    source_id: string;
    dataset_version: string;
    citation_url: string;
  }[];
  calculationLedger?: CalculationLedger;
  timeline?: YearlyCalculation[];
  datasetHashes?: {
    ic3Version?: string;
    susbVersion?: string;
    supplementalSignalHashes?: string[];
    calculationHash?: string;
    narrativeModelVersion?: string;
  };
  success_rate_mean?: number | 'N/A' | null;
  success_rate_low?: number | 'N/A' | null;
  success_rate_high?: number | 'N/A' | null;
}


export interface SavedYearlyAttempts {
  id: string;
  timestamp: number;
  results: AttemptCalculationResult[];
}

// Types for Success Rate Calculation
export interface SuccessCalculationLedger {
  baseline_selection: {
    bucket: string;
    vector: string;
    target_profile: string;
    baseline_rate: number;
    source: string;
    metric_name: string;
    justification: string;
  };
  calibration: {
    factors: {
      metric_key: string;
      evidence_summary: string;
      impact_direction: 'positive' | 'negative' | 'neutral';
      impact_magnitude: 'strong' | 'moderate' | 'weak';
      reasoning: string;
    }[];
    final_calibrated_rate: number;
    calibration_justification: string;
  };
}

export interface SuccessCalculationResult {
  id: string;
  scenario: RiskScenario;
  status: 'idle' | 'loading' | 'completed' | 'error';
  error?: string;
  success_rate_mean: number | 'N/A' | null;
  success_rate_low: number | 'N/A' | null;
  success_rate_high: number | 'N/A' | null;
  summary: string;
  justification: string;
  sourceExtraction?: {
    metric_key: string;
    raw_value: string;
    unit: string;
    source_id: string;
    dataset_version: string;
    citation_url: string;
  }[];
  calculationLedger?: SuccessCalculationLedger;
  datasetHashes?: {
    successDatasetVersion?: string;
  };
}

export interface SavedSuccessRate {
  id: string;
  timestamp: number;
  results: SuccessCalculationResult[];
}

// Data model types for calculations
export interface IC3Metric {
  name: string;
  value: number;
  unit: string;
}

export interface IC3Record {
  bucket: string[];
  metrics: IC3Metric[];
  source?: string;
  publicationDate?: string;
  sector?: string[];
  // Fix: Add optional citationUrl property to align with its usage in attemptModel.ts
  citationUrl?: string;
}

export interface OrgCountRecord {
  targetProfileAggregates: {
    targetProfile: string;
    organizationCount: number;
  }[];
  source?: string;
  publicationDate?: string;
  // Fix: Add optional citations property to align with its usage in attemptModel.ts
  citations?: string[];
}

export interface EnergyOrgCountRecord {
  sector: 'Energy';
  subsector: string;
  metricDescription: string;
  year: number;
  metricValue: number;
  unit: 'count';
  organization: string;
  publicationDate: string;
  citationUrl: string;
}

export interface SuccessRateMetric {
  name: string;
  value: number;
  unit: string;
}

export interface SuccessRateRecord {
  bucket: string[];
  vectors?: string[];
  targetProfiles?: string[];
  metrics: SuccessRateMetric[];
  source: string;
  reportTitle?: string;
  organization?: string;
  publicationDate: string;
  scope?: string;
  citationUrl?: string;
}

// --- Supplemental Data Types ---
export interface SupplementalMetric {
  name: string;
  value: number | string;
  unit: string;
  notes?: string;
}

export interface SectorSupplementalRecord {
  source: string;
  reportTitle?: string;
  publicationDate: string;
  scope: string;
  bucket: string[];
  sector: string[];
  metrics: SupplementalMetric[];
  citationUrl: string;
  // Fix: Add optional organization property to align with its usage in attemptModel.ts
  organization?: string;
}

export interface InitialAccessRecord {
  source: string;
  vector: string;
  metrics: SupplementalMetric[];
  citationUrl: string;
}

export interface MajorCampaignRecord {
  campaignName: string;
  actor: string;
  metricValue: number;
  unit: string;
  citationUrl: string;
  notes?: string;
}

export interface ActorTargetingRecord {
    source: string;
    actor: string;
    sector: string;
    metrics: SupplementalMetric[];
    citationUrl: string;
}

export interface SupplementalData {
    sectorSpecific: Record<string, SectorSupplementalRecord[]>;
    initialAccess: InitialAccessRecord[];
    majorCampaigns: MajorCampaignRecord[];
    actorTargeting: ActorTargetingRecord[];
    // Add new property for energy-specific attempt rate data
    energyAttemptRates?: SectorSupplementalRecord[];
}


export type RecentActivityItem =
    | { type: 'CTI Analysis'; data: AnalysisHistoryRecord }
    | { type: 'Breach Data'; data: SavedBreachData }
    | { type: 'Landscape Report'; data: SavedThreatLandscape }
    | { type: 'Radar Report'; data: SavedThreatRadar }
    | { type: 'Event Memo'; data: SavedMemorandum }
    | { type: 'Yearly Attempts Report'; data: SavedYearlyAttempts }
    | { type: 'Success Rate Report'; data: SavedSuccessRate };


// Types for Intelligence Dashboard
export interface CyberThreat {
    title: string;
    summary: string;
    actorsInvolved: string[];
    targetSectors: string[];
}

export interface CriticalVulnerability {
    cveId: string;
    description: string;
    cvssScore: number | { score: number; [key: string]: any };
    source: string;
}

export interface GeopoliticalEvent {
    region: string;
    eventSummary: string;
    cyberImplication: string;
}

export interface IntelligenceDashboardData {
    cyberIntelligence: {
        keyThreats: CyberThreat[];
        emergingVulnerabilities: CriticalVulnerability[];
    };
    geopoliticalIntelligence: {
        keyEvents: GeopoliticalEvent[];
    };
    sources: Source[];
}

// Types for Query Planner
export type ActorCategory = 'eCrime' | 'state_nexus' | 'unknown';
export type Vector = 'phish' | 'exploit' | 'bruteforce' | 'vec' | 'other';

export interface ScenarioProfile {
  year: number;
  actor_input: string;
  actor_id?: string;
  actor_category: ActorCategory;
  mo_input: string;
  vectors: Vector[];
  target_input: string;
  sector?: string;
  region?: string;
  profile_confidence: number;
}

export interface AttackMapResult {
    scenario: string;
    techniques: {
        tactic: string;
        techniqueId: string;
        techniqueName: string;
        description: string;
    }[];
    sources: Source[];
}

export interface QueryPlanMetric {
  metricKey: string;
  datasetTitle: string;
  baseWeight: number;
  boost: number;
  finalWeight: number;
  filterApplied: string;
  notes: string;
}

export interface QueryPlan {
  bucket: 'Ransomware' | 'IP Theft' | 'Fraud';
  metrics: QueryPlanMetric[];
  fallbacks: string[];
  coverageScore: number;
  expectedYield: { metricKey: string; lastYearCount: string }[];
  qualityGateMessage?: string;
}