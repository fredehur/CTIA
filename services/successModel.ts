




import type { RiskScenario, SupplementalSignal, SuccessCalculationResult, SuccessCalculationLedger, SuccessRateRecord, SuccessRateMetric } from '../types';

// Predefined multipliers for deterministic calibration.
const SOPHISTICATION_MULTIPLIERS: Record<'non_advanced' | 'advanced' | '', number> = {
    'non_advanced': 1.0,
    'advanced': 1.25, // Advanced actors are more likely to succeed
    '': 1.0,
};

const EXTERNAL_SUPPORT_SUCCESS_MULTIPLIER = 1.1; // 10% boost for well-resourced actor

// Define the priority order for success metrics.
const METRIC_PRIORITY = [
    'encryption_success_rate',
    'device_impact_rate',
    'operational_disruption_rate',
    'full_shutdown_rate',
    'ransomware_presence_in_breaches',
    'payment_rate',
    'paid_ransom_rate',
    'ransom_payment_rate'
];


/**
 * Deterministically calculates the success rate for a cyber risk scenario.
 */
export const computeSuccessRate = ({
  scenario,
  successData,
  supplementalSignals,
}: {
  scenario: RiskScenario;
  successData: SuccessRateRecord[];
  supplementalSignals?: SupplementalSignal[];
}): SuccessCalculationResult => {

    const ledger: SuccessCalculationLedger = {
        baseline_selection: {
            bucket: scenario.bucket,
            vector: scenario.vectors.split(',')[0]?.trim() || 'N/A',
            target_profile: scenario.targetProfile || 'N/A',
            baseline_rate: 0,
            source: 'N/A',
            metric_name: 'N/A',
            justification: '',
        },
        calibration: {
            factors: [],
            final_calibrated_rate: 0,
            calibration_justification: '',
        },
    };

    const sourceExtraction: SuccessCalculationResult['sourceExtraction'] = [];
    
    // 1. Prepare and filter data based on the scenario's base year.
    const recordsWithDataYear = successData
        .map(r => {
            // Assumption: A report published in year Y covers data for year Y-1.
            const dataYear = new Date(r.publicationDate).getFullYear() - 1; 
            return { ...r, dataYear };
        })
        .filter(r => r.dataYear <= scenario.baseYear && r.bucket.includes(scenario.bucket))
        .sort((a, b) => b.dataYear - a.dataYear); // Sort by most recent first

    // 2. Find the best baseline record using a scored matching approach.
    const isOtScenario = scenario.purdueLevel !== undefined && scenario.purdueLevel !== 'N/A';
    const normalizedSector = scenario.sector?.toLowerCase().replace(/ /g, '_');
    const normalizedTargetProfile = scenario.targetProfile?.toLowerCase().replace(/ /g, '_');

    let bestMatch: { record: typeof recordsWithDataYear[0]; score: number; reason: string } | null = null;
    
    for (const record of recordsWithDataYear) {
        let score = 0;
        let reason = '';
        
        const targetProfiles = record.targetProfiles?.map(p => p.toLowerCase().replace(/ /g, '_')) || [];
        
        // Priority 1: OT/ICS scenario and Dragos source
        if (isOtScenario && record.source.includes('dragos')) {
            score = 100;
            reason = 'Matched OT/ICS scenario with Dragos source.';
        }
        // Priority 2: Sector match
        else if (normalizedSector && targetProfiles.includes(normalizedSector)) {
            score = 90;
            reason = `Matched sector '${scenario.sector}'.`;
        }
        // Priority 3: Target profile match
        else if (normalizedTargetProfile && targetProfiles.includes(normalizedTargetProfile)) {
            score = 80;
            reason = `Matched target profile '${scenario.targetProfile}'.`;
        }
        // Priority 4: Region match
        else if (scenario.region === 'EU' && record.scope?.includes('european_union')) {
            score = 70;
            reason = 'Matched EU region with ENISA source.';
        }
        // Priority 5: Global scope as a fallback
        else if (record.scope?.startsWith('global')) {
            score = 10;
            reason = 'Selected a generic global data source.';
        }

        if (score > (bestMatch?.score || 0)) {
            bestMatch = { record, score, reason };
        }
    }
    
    const bestRecord = bestMatch?.record;

    if (!bestRecord) {
        throw new Error(`Could not find a suitable success rate baseline for the scenario.`);
    }

    // 3. Select the best metric from the chosen record based on priority.
    let baselineMetric: SuccessRateMetric | undefined;
    for (const metricName of METRIC_PRIORITY) {
        baselineMetric = bestRecord.metrics.find(m => m.name === metricName);
        if (baselineMetric) break;
    }

    if (!baselineMetric) {
        throw new Error(`No suitable success metric found in the selected record: ${bestRecord.source}`);
    }

    const baselineRate = baselineMetric.value;
    
    // 4. Populate ledger and source extraction with detailed info.
    ledger.baseline_selection = {
        bucket: scenario.bucket,
        vector: scenario.vectors.split(',')[0]?.trim() || 'N/A',
        target_profile: scenario.targetProfile || 'N/A',
        baseline_rate: baselineRate,
        source: bestRecord.reportTitle || bestRecord.source,
        metric_name: baselineMetric.name,
        justification: `Selected baseline from ${bestRecord.reportTitle || bestRecord.source} (${bestRecord.dataYear} data). ${bestMatch?.reason || ''}`
    };

    sourceExtraction.push({
        metric_key: baselineMetric.name,
        raw_value: baselineRate.toString(),
        unit: baselineMetric.unit,
        source_id: bestRecord.source,
        dataset_version: bestRecord.publicationDate,
        citation_url: bestRecord.citationUrl || '#',
    });

    // 5. Apply Multipliers for Calibration
    let calibratedRate = baselineRate;
    const sophisticationMultiplier = SOPHISTICATION_MULTIPLIERS[scenario.sophistication];
    if (sophisticationMultiplier !== 1.0) {
        calibratedRate *= sophisticationMultiplier;
        ledger.calibration.factors.push({
            metric_key: 'sophistication_multiplier',
            evidence_summary: `Actor sophistication is '${scenario.sophistication}'.`,
            impact_direction: 'positive',
            impact_magnitude: 'moderate',
            reasoning: `Applied a ${sophisticationMultiplier}x multiplier.`
        });
    }

    if (scenario.hasExternalSupport) {
        calibratedRate *= EXTERNAL_SUPPORT_SUCCESS_MULTIPLIER;
        ledger.calibration.factors.push({
            metric_key: 'external_support_success_multiplier',
            evidence_summary: `Adversary has external sponsorship.`,
            impact_direction: 'positive',
            impact_magnitude: 'weak',
            reasoning: `Applied a ${EXTERNAL_SUPPORT_SUCCESS_MULTIPLIER}x success rate multiplier due to better resources.`
        });
    }

    ledger.calibration.final_calibrated_rate = calibratedRate;
    ledger.calibration.calibration_justification = `The baseline success rate of ${(baselineRate * 100).toFixed(1)}% was adjusted for actor sophistication and support, resulting in a calibrated rate of ${(calibratedRate * 100).toFixed(1)}%.`;

    const success_rate_mean = Math.min(1.0, calibratedRate); // Cap at 100%

    // 6. Confidence Interval
    const success_rate_low = Math.max(0, success_rate_mean * 0.75);
    const success_rate_high = Math.min(1.0, success_rate_mean * 1.25);

    // 7. Generate Summary & Justification
    const summary = `The deterministic model calculates a success probability of ${(success_rate_mean * 100).toFixed(1)}% for this scenario.`;
    const justification = `Based on "${bestRecord.reportTitle || bestRecord.source}" (${bestRecord.dataYear} data), the baseline success rate for this scenario is ${(baselineRate * 100).toFixed(1)}% (using the '${baselineMetric.name}' metric). This was calibrated for the '${scenario.sophistication}' actor profile, yielding a final estimated success rate of ${(success_rate_mean * 100).toFixed(1)}%.`;
    
    return {
        id: scenario.id,
        scenario,
        status: 'completed',
        success_rate_mean,
        success_rate_low,
        success_rate_high,
        summary,
        justification,
        sourceExtraction,
        calculationLedger: ledger,
    };
};
