


/**
 * Regression "Snapshot" Tests for the Yearly Attempts Workflow.
 * 
 * How to Run:
 * This file simulates snapshot testing. In a real test environment (like Jest), you would
 * use `expect(result).toMatchSnapshot()`. Here, we manually compare the output to a
 * stored JSON object.
 * 
 * A failure in this test means a core calculation has changed. If the change is
 * intentional, update the `SNAPSHOT` object. If not, it indicates a regression.
 */

import { computeAttemptRate } from '../../services/attemptModel';
import { computeSuccessRate } from '../../services/successModel';
import type { RiskScenario } from '../../types';
import type { Datasets } from '../../components/YearlyAttempts';


// --- MOCK FIXTURE DATA (subset of what's needed for the test) ---
const mockDatasets: Datasets = {
    ic3: {
        "2023": { data: [{ bucket: ["ransomware"], metrics: [{ name: "ransomware_incidents", value: 2825, unit: "count" }] }], version: "v1" }
    },
    orgCounts: {
        "2022": { data: { targetProfileAggregates: [{ targetProfile: "critical_infrastructure", organizationCount: 20000 }] }, version: "v1" }
    },
    ciIC3: [
         { source: "fbi_ic3_2023", publicationDate: "2024-01-01", bucket: ["ransomware"], sector: ["energy"], metrics: [{ name: "incident_count", value: 30, unit: "count" }], citationUrl: '#', scope: 'us' }
    ],
    energyOrgCounts: [
        { sector: 'Energy', subsector: 'Test', metricDescription: '', year: 2022, metricValue: 20000, unit: 'count', organization: 'Test', publicationDate: '2023-01-01', citationUrl: '#' }
    ],
    energyAttemptRates: [
        { source: 'trustwave_risk_radar_2024', reportTitle: 'Trustwave Report', publicationDate: '2024-01-15', scope: 'global', bucket: ['ransomware'], sector: ['energy'], metrics: [{ name: 'leak_site_incidents_h2_2023', value: 132, unit: 'count' }], citationUrl: '#' },
        { source: 'ibm_xforce_ti_index_2024_energy', reportTitle: 'IBM Report', publicationDate: '2024-02-16', scope: 'global', bucket: ['ransomware'], sector: ['energy'], metrics: [{ name: 'global_attack_share', value: 0.111, unit: 'ratio' }], citationUrl: '#' },
    ],
    successRates: {
        "ransomware": { data: [
            { source: "sophos_state_of_ransomware_critical_infrastructure_2024", publicationDate: "2024-07-17", scope: "global", bucket: ["ransomware"], targetProfiles: ["critical_infrastructure"], metrics: [{ name: "device_impact_rate", value: 0.62, unit: "ratio" }] },
            { source: "coveware_ransomware_report_q1_2024", publicationDate: "2024-04-18", scope: "global", bucket: ["ransomware"], metrics: [{ name: "payment_rate", value: 0.28, unit: "ratio" }] }
        ], version: "v1" }
    },
    initialAccess: [
        { source: 'Test', vector: 'phishing', metrics: [{ name: 'share', value: 0.24, unit: 'ratio'}], citationUrl: '#' }
    ],
    majorCampaigns: [
        { campaignName: "MOVEit", actor: "clop", metricValue: 2600, unit: "count", citationUrl: '#' }
    ],
    actorTargeting: [],
    sectorSpecific: {},
};


// --- CANONICAL SCENARIOS ---
const CANONICAL_SCENARIOS: Record<string, RiskScenario> = {
    "Ransomware_CI_Energy": {
        id: 'canonical-ci-energy-1',
        baseYear: 2023,
        lookbackYears: 1,
        bucket: 'ransomware',
        sophistication: 'advanced',
        targetProfile: 'critical_infrastructure',
        actor_ids: ['clop'],
        vectors: 'phishing',
        sector: 'Energy',
        region: 'US',
        darkNumber: 50,
        hasExternalSupport: true,
        areSystemsHighValue: false,
        isTargetLucrative: true
    }
};

// --- STORED SNAPSHOT ---
// This object represents the "correct" output for the canonical scenario.
// If the calculation logic is intentionally changed, this snapshot MUST be updated.
const SNAPSHOT = {
    "Ransomware_CI_Energy": {
        attempt_rate: {
            lambda_mean: 0.0768,
            confidence_band: "High"
        },
        success_rate: {
            success_rate_mean: 0.775,
        }
    }
};

// --- MOCK TEST RUNNER ---
const expect = (value: any) => ({
    toBeCloseTo: (expected: number, precision = 4) => {
        const pass = Math.abs(expected - value) < (Math.pow(10, -precision) / 2);
        if (!pass) throw new Error(`REGRESSION DETECTED: Expected ${value} to be close to ${expected}`);
        console.assert(pass);
    },
    toEqual: (expected: any) => {
        const pass = JSON.stringify(value) === JSON.stringify(expected);
         if (!pass) throw new Error(`REGRESSION DETECTED: Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
        console.assert(pass);
    }
});
const describe = (name: string, fn: () => void) => { console.log(`\n--- Running test suite: ${name} ---`); fn(); };
const it = (name: string, fn: () => void) => { console.log(`  - ${name}`); fn(); };

// --- REGRESSION TEST SUITE ---
describe('Yearly Attempts Regression Tests (v2.2)', () => {

    it('should match the snapshot for a canonical Ransomware CI Energy scenario', () => {
        const scenario = CANONICAL_SCENARIOS.Ransomware_CI_Energy;
        const snapshot = SNAPSHOT.Ransomware_CI_Energy;

        const result = computeAttemptRate({
            scenario,
            datasets: mockDatasets,
        });

        // Compare attempt rate results to snapshot
        expect(result.lambda_mean).toBeCloseTo(snapshot.attempt_rate.lambda_mean, 4);
        expect(result.confidence_band).toEqual(snapshot.attempt_rate.confidence_band);

        // Compare success rate results to snapshot
        expect(result.success_rate_mean).toBeCloseTo(snapshot.success_rate.success_rate_mean, 3);

        console.log("    [PASS] Snapshot matched.");
    });

});