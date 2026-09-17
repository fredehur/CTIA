import type { RiskScenario, SupplementalSignal, AttemptCalculationResult, CalculationLedger, IC3Record, OrgCountRecord, EnergyOrgCountRecord, YearlyCalculation } from '../types';
import type { Datasets } from '../components/YearlyAttempts';
import { computeSuccessRate } from './successModel';

// Predefined multipliers for deterministic calculation.
const VECTOR_MULTIPLIERS_FALLBACK: Record<string, number> = { 'default': 1.0 };
const SOPHISTICATION_MULTIPLIERS: Record<'non_advanced' | 'advanced' | '', number> = { 'non_advanced': 1.0, 'advanced': 1.8, '': 1.0 };
const SIGNAL_CONFIDENCE_MULTIPLIERS: Record<'low' | 'medium' | 'high', number> = { 'low': 1.05, 'medium': 1.15, 'high': 1.25 };
const TARGET_LUCRATIVE_MULTIPLIER = 1.3;
const SYSTEM_HIGH_VALUE_MULTIPLIER = 1.2;
const EXTERNAL_SUPPORT_MULTIPLIER = 1.5;
const MAJOR_CAMPAIGN_MULTIPLIER = 1.25;

const IC3_METRIC_MAP: Record<string, string> = { 
    ransomware: 'ransomware_incidents', 
    fraud: 'bec_complaints',
    ip_theft: 'espionage_incidents' 
};

const SECTOR_MAP: Record<string, string> = {
    'manufacturing': 'Critical Manufacturing',
    'government': 'Government',
    'transportation': 'Transportation',
    'it': 'Information Technology',
    'financial_services': 'Financial Services',
    'healthcare': 'Healthcare',
    'energy': 'Energy',
    'communications': 'Communications'
};

// Helper to parse year and period from energy metric names
const getMetricPeriod = (metricName: string, pubDate: string): { year: number; text: string } => {
    // Matches h1_2023, h2_2023, etc.
    const halfYearMatch = metricName.match(/(h1|h2)_?(\d{4})/i);
    if (halfYearMatch) {
        const year = parseInt(halfYearMatch[2], 10);
        const half = halfYearMatch[1].toUpperCase();
        return { year, text: `${half} ${year}` };
    }
    // Matches just a year
    const yearMatch = metricName.match(/\d{4}/);
    if (yearMatch) {
        const year = parseInt(yearMatch[0], 10);
        return { year, text: `${year}` };
    }
    // Fallback: use publication year. Assume data is for the previous year.
    const pubYear = new Date(pubDate).getFullYear();
    // A special case for H1/H2 if the year isn't in the name
    const year = metricName.includes('h1') || metricName.includes('h2') ? pubYear : pubYear - 1;
    return { year, text: `${year}` };
};

/**
 * Deterministically calculates the yearly attempt rate for a cyber risk scenario.
 */
export const computeAttemptRate = ({
  scenario,
  datasets,
  supplementalSignals,
}: {
  scenario: RiskScenario;
  datasets: Datasets;
  supplementalSignals?: SupplementalSignal[];
}): Omit<AttemptCalculationResult, 'id' | 'status' | 'error' | 'scenario'> & { successCalculationLedger?: any } => {

    const ledger: CalculationLedger = {
        baseline_selection: { target_profile: scenario.targetProfile || 'N/A', sophistication: scenario.sophistication || 'N/A', range_low: 0, range_high: 0, justification: '' },
        reporting_rate_adjustment: { incident_rate_observed: 0, dark_number_percentage: 0, reporting_rate: 1, formula: '', adjusted_incident_rate: 0 },
        calibration: { factors: [], final_calibrated_baseline: 0, calibration_justification: '' },
        success_rate_application: { incident_rate_calibrated: 0, success_rate: 0, success_rate_source: '', success_rate_metric: '', formula: '', final_lambda_mean: 0 },
    };
    
    const sourceExtraction: AttemptCalculationResult['sourceExtraction'] = [];
    const fallbacks: string[] = [];
    
    // --- PRE-STEP: COMPUTE SUCCESS RATE ---
    const successDataForBucket = datasets.successRates[scenario.bucket]?.data;
    if (!successDataForBucket) throw new Error(`Missing success rate data for bucket: ${scenario.bucket}`);
    const successResult = computeSuccessRate({ scenario, successData: successDataForBucket, supplementalSignals });
    const successRate = successResult.success_rate_mean;
    if (typeof successRate !== 'number' || successRate <= 0) {
        throw new Error(`Invalid success rate computed: ${successRate}`);
    }

    // --- 1. GET BASE YEAR DATA ---
    const ic3Years = Object.keys(datasets.ic3).map(Number).sort((a,b) => b-a);
    const orgCountYears = Object.keys(datasets.orgCounts).map(Number).sort((a,b) => b-a);
    const ic3YearToUse = ic3Years.find(y => y <= scenario.baseYear) || ic3Years[0];
    const orgCountYearToUse = orgCountYears.find(y => y <= scenario.baseYear) || orgCountYears[0];
    if (!ic3YearToUse || !orgCountYearToUse) throw new Error(`Missing historical data for year ${scenario.baseYear}. IC3 or SUSB data not found.`);
    const ic3Data = datasets.ic3[ic3YearToUse].data;
    
    // --- 2. BASELINE NUMERATOR (Victim Count) ---
    let victimCount: number;
    let victimCountSource: { source: string, publicationDate: string, metricName: string, citationUrl: string, isFallback: boolean };

    if (scenario.targetProfile === 'critical_infrastructure' && scenario.sector) {
        // Normalize UI sector name ('Critical Manufacturing') to JSON format ('critical_manufacturing')
        const sectorName = (scenario.sector as string).toLowerCase().replace(/\s+/g, '_');

        const sectorRecords = datasets.ciIC3
            .filter(d => d.bucket.includes(scenario.bucket) && d.sector.some(s => s.toLowerCase() === sectorName))
            .sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
        
        const ciRecord = sectorRecords.find(d => (new Date(d.publicationDate).getFullYear() - 1) <= scenario.baseYear);
        const ciMetric = ciRecord?.metrics.find(m => m.name === 'incident_count');

        if (ciRecord && ciMetric && typeof ciMetric.value === 'number') {
            victimCount = ciMetric.value;
            victimCountSource = { source: ciRecord.source, publicationDate: ciRecord.publicationDate, metricName: 'ci_incident_count', citationUrl: ciRecord.citationUrl, isFallback: false };
            const dataYear = new Date(ciRecord.publicationDate).getFullYear() - 1;
            const yearMatchText = dataYear === scenario.baseYear ? '' : ` (using latest available data from ${dataYear})`;
            ledger.baseline_selection.justification = `Prioritized sector-specific baseline using ${victimCount} incidents for '${scenario.sector}' from ${ciRecord.source}${yearMatchText}.`;
        } else {
            fallbacks.push(`ci_ic3_${scenario.sector}_metric`);
            const generalMetricName = IC3_METRIC_MAP[scenario.bucket];
            const generalRecord = ic3Data.find(r => r.bucket.includes(scenario.bucket));
            const generalMetric = generalRecord?.metrics.find(m => m.name === generalMetricName);
            if (!generalMetric || typeof generalMetric.value !== 'number') throw new Error(`Missing required IC3 metric "${generalMetricName}" for year ${scenario.baseYear}.`);
            victimCount = generalMetric.value;
            victimCountSource = { source: generalRecord?.source || 'FBI IC3', publicationDate: generalRecord?.publicationDate || '', metricName: generalMetricName, citationUrl: generalRecord?.citationUrl || '#', isFallback: true };
            ledger.baseline_selection.justification = `FALLBACK: No sector-specific data for '${scenario.sector}'. Using general '${scenario.bucket}' baseline from main IC3 report.`;
        }
    } else {
        const metricName = IC3_METRIC_MAP[scenario.bucket];
        const record = ic3Data.find(r => r.bucket.includes(scenario.bucket));
        const metric = record?.metrics.find(m => m.name === metricName);
        if (!metric || typeof metric.value !== 'number') throw new Error(`Missing required IC3 metric "${metricName}" for bucket "${scenario.bucket}".`);
        victimCount = metric.value;
        victimCountSource = { source: record?.source || 'FBI IC3', publicationDate: record?.publicationDate || '', metricName, citationUrl: record?.citationUrl || '#', isFallback: false };
        ledger.baseline_selection.justification = `Derived from ${victimCount} IC3-reported incidents for the '${scenario.bucket}' bucket.`;
    }
    sourceExtraction.push({ metric_key: victimCountSource.metricName, raw_value: victimCount.toString(), unit: 'count', source_id: victimCountSource.source, dataset_version: victimCountSource.publicationDate, citation_url: victimCountSource.citationUrl });

    // --- 3. BASELINE DENOMINATOR (Organization Count) ---
    const orgCountsForYear = datasets.orgCounts[orgCountYearToUse];
    if (!orgCountsForYear) throw new Error(`Missing SUSB org count data for base year ${scenario.baseYear} (using ${orgCountYearToUse})`);
    const orgCounts = orgCountsForYear.data;
    let organizationCount: number;
    let organizationCountSourceInfo: { source: string, publicationDate: string, citation_url: string };
    
    if (scenario.sector === 'Energy' && datasets.energyOrgCounts && datasets.energyOrgCounts.length > 0) {
        const latestCountsBySubsector = new Map<string, { value: number; year: number }>();
        datasets.energyOrgCounts.forEach(record => {
            const existing = latestCountsBySubsector.get(record.subsector);
            if (!existing || record.year > existing.year) {
                latestCountsBySubsector.set(record.subsector, { value: record.metricValue, year: record.year });
            }
        });
    
        organizationCount = Array.from(latestCountsBySubsector.values()).reduce((sum, item) => sum + item.value, 0);
        organizationCountSourceInfo = {
            source: 'PHMSA/EIA Aggregated',
            publicationDate: 'various',
            citation_url: datasets.energyOrgCounts[0].citationUrl,
        };
        
        ledger.baseline_selection.justification += ` The denominator of ${organizationCount.toLocaleString()} organizations is derived from an aggregation of the latest PHMSA and EIA data.`;
        
        sourceExtraction.push({
            metric_key: 'organization_count_energy_sector',
            raw_value: organizationCount.toString(),
            unit: 'count',
            source_id: organizationCountSourceInfo.source,
            dataset_version: organizationCountSourceInfo.publicationDate,
            citation_url: organizationCountSourceInfo.citation_url
        });
    
    } else {
        const orgCountData = orgCounts.targetProfileAggregates.find(agg => agg.targetProfile === scenario.targetProfile);
        if (!orgCountData) throw new Error(`Could not find organization count for target profile: "${scenario.targetProfile}"`);
        organizationCount = orgCountData.organizationCount;
        organizationCountSourceInfo = {
            source: orgCounts.source || 'SUSB',
            publicationDate: orgCounts.publicationDate || '',
            citation_url: (orgCounts.citations && orgCounts.citations[0]) || '#'
        };
        sourceExtraction.push({ metric_key: 'organization_count', raw_value: organizationCount.toString(), unit: 'count', source_id: organizationCountSourceInfo.source, dataset_version: organizationCountSourceInfo.publicationDate, citation_url: organizationCountSourceInfo.citation_url });
    }
    
    // --- 4. CALCULATE BASE INCIDENT RATE & APPLY REPORTING RATE ADJUSTMENT ---
    const incidentRateObserved = victimCount / organizationCount;
    const darkNumber = scenario.darkNumber || 0;
    const reportingRate = 1 - (darkNumber / 100);
    if (reportingRate <= 0) throw new Error('Dark number must be less than 100.');
    const adjustedIncidentRate = incidentRateObserved / reportingRate;

    ledger.reporting_rate_adjustment = {
        incident_rate_observed: incidentRateObserved,
        dark_number_percentage: darkNumber,
        reporting_rate: reportingRate,
        formula: `${incidentRateObserved.toPrecision(4)} / (1 - ${darkNumber}/100)`,
        adjusted_incident_rate: adjustedIncidentRate
    };

    // --- 5. CALIBRATE INCIDENT RATE ---
    let calibratedBaseline = adjustedIncidentRate;
    let additiveDelta = 0;

    // Multipliers
    const sophisticationMultiplier = SOPHISTICATION_MULTIPLIERS[scenario.sophistication];
    if (sophisticationMultiplier !== 1) {
        calibratedBaseline *= sophisticationMultiplier;
        ledger.calibration.factors.push({ metric_key: 'sophistication_multiplier', evidence_summary: `Scenario sophistication is '${scenario.sophistication}'.`, impact_direction: 'positive', impact_magnitude: 'strong', reasoning: `Applied a ${sophisticationMultiplier}x multiplier.`, factorType: 'multiplier' });
    }

    const vectors = scenario.vectors.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    vectors.forEach(vector => {
        const vectorData = datasets.initialAccess.find(d => vector.includes(d.vector.toLowerCase().replace(/_/g, ' ')));
        const shareMetric = vectorData?.metrics.find(m => m.name.startsWith('share'));
        let vectorMultiplier = VECTOR_MULTIPLIERS_FALLBACK.default;
        if (vectorData && shareMetric && typeof shareMetric.value === 'number') {
            vectorMultiplier = 1 + shareMetric.value;
            sourceExtraction.push({ metric_key: `vector_share_${vector}`, raw_value: shareMetric.value.toString(), unit: 'ratio', source_id: vectorData.source, dataset_version: '', citation_url: vectorData.citationUrl });
            ledger.calibration.factors.push({ metric_key: 'vector_multiplier', evidence_summary: `Vector '${vector}' has a ${Math.round(shareMetric.value * 100)}% share in observed incidents (${vectorData.source}).`, impact_direction: 'positive', impact_magnitude: 'moderate', reasoning: `Applied a ${vectorMultiplier.toFixed(2)}x multiplier.`, factorType: 'multiplier' });
        } else {
            fallbacks.push(`vector_share_${vector}`);
            ledger.calibration.factors.push({ metric_key: 'vector_multiplier', evidence_summary: `No specific share data for vector '${vector}'.`, impact_direction: 'neutral', impact_magnitude: 'weak', reasoning: `Applied a default ${vectorMultiplier}x multiplier.`, factorType: 'multiplier' });
        }
        calibratedBaseline *= vectorMultiplier;
    });

    const actorRecord = datasets.actorTargeting.find(d => scenario.actor_ids.includes(d.actor) && (Object.values(SECTOR_MAP).includes(scenario.sector as any) ? (SECTOR_MAP[d.sector.toLowerCase().replace(/\s/g, '_')] === scenario.sector) : d.sector === scenario.sector));
    if (actorRecord) {
        const metric = actorRecord.metrics.find(m => m.name === 'attack_percentage');
        if (metric && typeof metric.value === 'number') {
            const multiplier = 1 + (metric.value * 0.5);
            calibratedBaseline *= multiplier;
            sourceExtraction.push({ metric_key: 'actor_target_propensity', raw_value: metric.value.toString(), unit: 'ratio', source_id: actorRecord.source, dataset_version: '', citation_url: actorRecord.citationUrl });
            ledger.calibration.factors.push({ metric_key: 'actor_targeting_multiplier', evidence_summary: `${actorRecord.actor} targets '${scenario.sector}' in ${Math.round(metric.value * 100)}% of attacks.`, impact_direction: 'positive', impact_magnitude: 'moderate', reasoning: `Applied a ${multiplier.toFixed(2)}x multiplier.`, factorType: 'multiplier' });
        }
    }

    const campaign = datasets.majorCampaigns.find(c => scenario.actor_ids.includes(c.actor));
    if (campaign) {
        calibratedBaseline *= MAJOR_CAMPAIGN_MULTIPLIER;
        sourceExtraction.push({ metric_key: 'major_campaign_presence', raw_value: campaign.metricValue.toString(), unit: campaign.unit, source_id: campaign.campaignName, dataset_version: '', citation_url: campaign.citationUrl });
        ledger.calibration.factors.push({ metric_key: 'major_campaign_multiplier', evidence_summary: `Actor is associated with a major campaign (${campaign.campaignName}).`, impact_direction: 'positive', impact_magnitude: 'strong', reasoning: `Applied a fixed ${MAJOR_CAMPAIGN_MULTIPLIER}x multiplier.`, factorType: 'multiplier' });
    }

    // Deltas and Multipliers for Energy Sector
    if (scenario.sector === 'Energy' && datasets.energyAttemptRates) {
        const lookbackStartYear = scenario.baseYear - scenario.lookbackYears + 1;
        const allEnergyMetrics = datasets.energyAttemptRates.flatMap(record => {
            const scope = record.scope.toLowerCase();
            if (scenario.region.toLowerCase() === 'us' && !['global', 'north_america', 'united_states'].includes(scope)) { return []; }
            if (scenario.region.toLowerCase() !== 'us' && scope === 'north_america') { return []; }
            return record.metrics.map(metric => ({ record, metric, period: getMetricPeriod(metric.name, record.publicationDate) }));
        });

        const findBestMetric = (filter: (m: any) => boolean) => {
            const candidates = allEnergyMetrics.filter(filter);
            const inWindow = candidates.filter(m => m.period.year >= lookbackStartYear && m.period.year <= scenario.baseYear).sort((a, b) => b.period.year - a.period.year);
            if (inWindow.length > 0) return inWindow[0];
            const beforeWindow = candidates.filter(m => m.period.year < lookbackStartYear).sort((a, b) => b.period.year - a.period.year);
            if (beforeWindow.length > 0) return beforeWindow[0];
            return null;
        };
        
        const additiveMetricTypes = [
            { id: 'trustwave_leak_site', filter: (m: any) => m.record.source.includes('trustwave') && m.metric.name.includes('leak_site') },
            { id: 'socradar_leak_site', filter: (m: any) => m.record.source.includes('socradar') && m.metric.name.includes('leak_site') },
            { id: 'eisac_incidents', filter: (m: any) => m.record.source.includes('eisac') && m.metric.name === 'incident_count' && scenario.region.toLowerCase() === 'us' },
        ];

        additiveMetricTypes.forEach(type => {
            const bestMetric = findBestMetric(type.filter);
            if (bestMetric) {
                const { record, metric, period } = bestMetric;
                const delta = Number(metric.value) / organizationCount;
                additiveDelta += delta;
                ledger.calibration.factors.push({
                    metric_key: `energy_delta_${metric.name}`, factorType: "delta",
                    evidence_summary: `+${delta.toPrecision(2)} incidents/org from ${record.source} (${period.text})`,
                    impact_direction: 'additive', impact_magnitude: 'moderate',
                    reasoning: `Added ${metric.value} incidents, normalized by org count.`,
                });
                sourceExtraction.push({
                    metric_key: `energy_${metric.name}`, raw_value: String(metric.value), unit: metric.unit,
                    source_id: record.source, dataset_version: record.publicationDate, citation_url: record.citationUrl
                });
            }
        });

        const multiplicativeMetricTypes = [{ id: 'ibm_share', filter: (m: any) => m.record.source.includes('ibm') && (m.metric.name === 'incident_share' || m.metric.name === 'global_attack_share') }];
        
        multiplicativeMetricTypes.forEach(type => {
            const bestMetric = findBestMetric(type.filter);
            if (bestMetric) {
                const { record, metric, period } = bestMetric;
                const multiplier = 1 + (Number(metric.value) * 0.5); // 11% share -> 1.055x multiplier
                calibratedBaseline *= multiplier;
                ledger.calibration.factors.push({
                    metric_key: `energy_multiplier_${metric.name}`, factorType: "multiplier",
                    evidence_summary: `${record.organization || record.source} (${period.text}) reports ${Math.round(Number(metric.value) * 100)}% incident share.`,
                    impact_direction: 'positive', impact_magnitude: 'moderate',
                    reasoning: `Applied a ${multiplier.toFixed(2)}x multiplier.`
                });
                sourceExtraction.push({
                    metric_key: `energy_${metric.name}`, raw_value: String(metric.value), unit: metric.unit,
                    source_id: record.source, dataset_version: record.publicationDate, citation_url: record.citationUrl
                });
            }
        });
    }

    if (scenario.isTargetLucrative) { calibratedBaseline *= TARGET_LUCRATIVE_MULTIPLIER; ledger.calibration.factors.push({ factorType: 'multiplier', metric_key: 'target_lucrative_multiplier', evidence_summary: 'Target is flagged as lucrative.', impact_direction: 'positive', impact_magnitude: 'moderate', reasoning: `Applied ${TARGET_LUCRATIVE_MULTIPLIER}x multiplier.` }); }
    if (scenario.areSystemsHighValue) { calibratedBaseline *= SYSTEM_HIGH_VALUE_MULTIPLIER; ledger.calibration.factors.push({ factorType: 'multiplier', metric_key: 'system_value_multiplier', evidence_summary: 'Systems are flagged as high-value.', impact_direction: 'positive', impact_magnitude: 'moderate', reasoning: `Applied ${SYSTEM_HIGH_VALUE_MULTIPLIER}x multiplier.` }); }
    if (scenario.hasExternalSupport) { calibratedBaseline *= EXTERNAL_SUPPORT_MULTIPLIER; ledger.calibration.factors.push({ factorType: 'multiplier', metric_key: 'external_support_multiplier', evidence_summary: 'Adversary has external sponsorship.', impact_direction: 'positive', impact_magnitude: 'strong', reasoning: `Applied ${EXTERNAL_SUPPORT_MULTIPLIER}x multiplier.` }); }
    (supplementalSignals || []).forEach(signal => { const m = SIGNAL_CONFIDENCE_MULTIPLIERS[signal.confidence]; calibratedBaseline *= m; ledger.calibration.factors.push({ factorType: 'multiplier', metric_key: 'supplemental_signal', evidence_summary: `Signal: "${signal.metric}" (${signal.confidence})`, impact_direction: 'positive', impact_magnitude: 'moderate', reasoning: `Applied ${m}x multiplier.` }); });

    const fullyCalibratedIncidentRate = calibratedBaseline + additiveDelta;

    ledger.calibration.final_calibrated_baseline = fullyCalibratedIncidentRate;
    ledger.calibration.calibration_justification = `The reporting-adjusted incident rate of ${adjustedIncidentRate.toPrecision(4)} was modified by multiplicative factors and an additive delta of ${additiveDelta.toPrecision(4)}, resulting in a final calibrated incident rate.`;

    // --- 6. APPLY SUCCESS RATE & FINALIZE ---
    const lambda_mean = fullyCalibratedIncidentRate / successRate;

    ledger.success_rate_application = {
        incident_rate_calibrated: fullyCalibratedIncidentRate,
        success_rate: successRate,
        success_rate_source: successResult.calculationLedger.baseline_selection.source,
        success_rate_metric: successResult.calculationLedger.baseline_selection.metric_name,
        formula: `${fullyCalibratedIncidentRate.toPrecision(4)} / ${successRate.toFixed(2)}`,
        final_lambda_mean: lambda_mean
    };

    const coverage = 1.0 - (fallbacks.length / (5 + vectors.length));
    const confidenceSpread = 0.3 / (coverage || 0.1);
    const lambda_low = lambda_mean * (1 - confidenceSpread);
    const lambda_high = lambda_mean * (1 + confidenceSpread);
    const confidence_band = coverage > 0.8 ? 'High' : coverage > 0.5 ? 'Medium' : 'Low';

    const justification = `The analysis began with an observed incident rate of ${incidentRateObserved.toPrecision(4)}, adjusted for a ${darkNumber}% dark number. This was calibrated for ${ledger.calibration.factors.length} factors to a final incident rate of ${fullyCalibratedIncidentRate.toPrecision(4)}. Dividing by the estimated ${Math.round(successRate*100)}% success rate yields the final attempt rate (λ mean).`;

    return {
        lambda_mean,
        lambda_low: Math.max(0, lambda_low),
        lambda_high,
        headline: lambda_mean,
        summary: ``, // Summary is now generated by AI
        justification,
        confidence_band,
        coverage: coverage * 100,
        fallbacks,
        sourceExtraction,
        calculationLedger: ledger,
        method_version: '2.2-success-div',
        baseline_year: scenario.baseYear,
        success_rate_mean: successResult.success_rate_mean,
        success_rate_low: successResult.success_rate_low,
        success_rate_high: successResult.success_rate_high,
        successCalculationLedger: successResult.calculationLedger,
        sources_hash: 'sha256-placeholder-v2.2',
        weights_hash: 'sha256-placeholder-v2.2-weights',
    } as Omit<AttemptCalculationResult, 'id' | 'status' | 'error' | 'scenario' | 'summary' | 'timeline'> & { summary: string; timeline?: YearlyCalculation[], successCalculationLedger: any };
};