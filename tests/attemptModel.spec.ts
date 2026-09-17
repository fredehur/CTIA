/**
 * Unit Tests for the Deterministic Attempt-Rate Model.
 * 
 * How to Run:
 * In a standard development environment with a test runner like Jest or Vitest,
 * you would run a command like `npm test` or `npx jest tests/attemptModel.spec.ts`.
 * 
 * Since this is a sandboxed environment, these tests serve as documentation and
 * a specification for the expected behavior of the `computeAttemptRate` function.
 */

import { computeAttemptRate } from '../services/attemptModel';
import type { RiskScenario, SupplementalSignal, IC3Record, OrgCountRecord, SectorSupplementalRecord, ActorTargetingRecord, MajorCampaignRecord, InitialAccessRecord, EnergyOrgCountRecord } from '../types';
import type { Datasets } from '../components/YearlyAttempts';

// --- MOCK FIXTURE DATA ---

const mockDatasets: Datasets = {
    ic3: {
        "2023": {
            data: [
                { bucket: ["ransomware"], metrics: [{ name: "ransomware_incidents", value: 2825, unit: "count" }] },
                { bucket: ["fraud"], metrics: [{ name: "bec_complaints", value: 21000, unit: "count" }] }
            ],
            version: "2023-v1"
        }
    },
    orgCounts: {
        "2022": {
            data: {
                targetProfileAggregates: [
                    { targetProfile: "smb", organizationCount: 6000000 },
                    { targetProfile: "large_enterprise", organizationCount: 30000 },
                    { targetProfile: "critical_infrastructure", organizationCount: 20000 },
                ],
            },
            version: "2022-v1"
        }
    },
     energyOrgCounts: [
        { sector: "Energy", subsector: "Pipelines – Gas Distribution (operators)", metricDescription: "", year: 2023, metricValue: 1440, unit: "count", organization: "PHMSA", publicationDate: "", citationUrl: "" },
        { sector: "Energy", subsector: "Pipelines – Gas Transmission & Gathering (operators)", metricDescription: "", year: 2023, metricValue: 1464, unit: "count", organization: "PHMSA", publicationDate: "", citationUrl: "" }
    ],
    ciIC3: [
        {
            source: "fbi_ic3_internet_crime_report_2023",
            publicationDate: "2024-04-04",
            bucket: ["ransomware"],
            sector: ["energy"],
            metrics: [{ name: "incident_count", value: 30, unit: "count" }],
            citationUrl: '#',
            scope: 'us'
        }
    ],
    actorTargeting: [
        {
            source: "microsoft_digital_defense_report_2025",
            actor: "russian_threat_actors",
            sector: "government",
            metrics: [{ name: "attack_percentage", value: 0.25, unit: "ratio" }],
            citationUrl: '#'
        }
    ],
    majorCampaigns: [
        { campaignName: "MOVEit Transfer (Clop) 2023", actor: "clop", metricValue: 2600, unit: "count", citationUrl: '#' }
    ],
    initialAccess: [
        { source: 'Test Report', vector: 'phishing', metrics: [{ name: 'share_q4_2023', value: 0.24, unit: 'ratio'}], citationUrl: '#' }
    ],
    sectorSpecific: {},
    successRates: {
        "ransomware": {
            data: [
                {
                    source: "sophos_state_of_ransomware_critical_infrastructure_2024",
                    publicationDate: "2024-07-17", scope: "global_critical_infrastructure", bucket: ["ransomware"],
                    targetProfiles: ["critical_infrastructure", "energy", "utilities"],
                    metrics: [{ name: "device_impact_rate", value: 0.62, unit: "ratio" }],
                }
            ],
            version: "test-v1"
        }
    }
};

// --- TEST SUITE ---

const expect = (value: any) => ({
    toBe: (expected: any) => console.assert(value === expected, `Expected ${value} to be ${expected}`),
    toBeCloseTo: (expected: number, precision = 2) => {
        const pass = Math.abs(expected - value) < (Math.pow(10, -precision) / 2);
        console.assert(pass, `Expected ${value} to be close to ${expected}`);
    },
    toThrow: (expectedErrorMsg?: string) => {
        let threw = false;
        try {
            value();
        } catch (e) {
            threw = true;
            if (expectedErrorMsg) {
                console.assert((e as Error).message.includes(expectedErrorMsg), `Expected error message to include "${expectedErrorMsg}"`);
            }
        }
        console.assert(threw, `Expected function to throw.`);
    },
    toBeTruthy: () => console.assert(!!value, `Expected ${value} to be truthy`),
    toBeFalsy: () => console.assert(!value, `Expected ${value} to be falsy`)
});
const describe = (name: string, fn: () => void) => { console.log(`\n--- Running test suite: ${name} ---`); fn(); };
const it = (name: string, fn: () => void) => { console.log(`  - ${name}`); try { fn(); } catch (e) { console.error(`    [FAIL] ${(e as Error).message}`); } };


describe('computeAttemptRate (Deterministic Model v2.2)', () => {

  it('should use sector-specific CI data and divide by success rate', () => {
    const scenario: RiskScenario = {
      id: 'test-ci-energy',
      baseYear: 2023, lookbackYears: 1, bucket: 'ransomware', sophistication: 'non_advanced',
      targetProfile: 'critical_infrastructure', actor_ids: [], vectors: '', sector: 'Energy', region: 'US', darkNumber: 0
    };
    
    const energyOrgCount = 1440 + 1464;
    const result = computeAttemptRate({ scenario, datasets: mockDatasets });

    const expected_incident_rate = 30 / energyOrgCount; // 0.01033
    const success_rate = 0.62; // from mock sophos CI data
    const expected_lambda = expected_incident_rate / success_rate;

    expect(result.lambda_mean).toBeCloseTo(expected_lambda, 5);
    expect(result.calculationLedger.baseline_selection.justification).toBe("Prioritized sector-specific baseline using 30 incidents for 'Energy' from fbi_ic3_internet_crime_report_2023. The denominator of 2,904 organizations is derived from an aggregation of the latest PHMSA and EIA data.");
  });
  
  it('should fallback to general IC3 data when specific CI data is unavailable', () => {
    const scenario: RiskScenario = {
      id: 'test-ci-fallback',
      baseYear: 2023, lookbackYears: 1, bucket: 'ransomware', sophistication: 'non_advanced',
      targetProfile: 'critical_infrastructure', actor_ids: [], vectors: '', sector: 'Water/Wastewater', region: 'US', darkNumber: 0
    };

    const result = computeAttemptRate({ scenario, datasets: mockDatasets });
    
    const expected_incident_rate = 2825 / 20000;
    const success_rate = 0.62;
    const expected_lambda = expected_incident_rate / success_rate;
    
    expect(result.lambda_mean).toBeCloseTo(expected_lambda, 5);
    expect(result.calculationLedger.baseline_selection.justification).toBe("FALLBACK: No sector-specific data for 'Water/Wastewater'. Using general 'ransomware' baseline from main IC3 report.");
    expect(result.fallbacks.includes('ci_ic3_Water/Wastewater_metric')).toBeTruthy();
  });

  it('should apply the new dark number formula correctly', () => {
    const scenario: RiskScenario = {
      id: 'test-dark-number',
      baseYear: 2023, lookbackYears: 1, bucket: 'ransomware', sophistication: 'non_advanced',
      targetProfile: 'critical_infrastructure', actor_ids: [], vectors: '', sector: 'Energy', region: 'US', darkNumber: 50
    };
     const energyOrgCount = 1440 + 1464;
    const result = computeAttemptRate({ scenario, datasets: mockDatasets });

    const incident_rate_obs = 30 / energyOrgCount;
    const adjusted_incident_rate = incident_rate_obs / (1 - 0.50); // New formula
    const success_rate = 0.62;
    const expected_lambda = adjusted_incident_rate / success_rate;
    
    expect(result.lambda_mean).toBeCloseTo(expected_lambda, 5);
    expect(result.calculationLedger.reporting_rate_adjustment.formula).toBe(`${incident_rate_obs.toPrecision(4)} / (1 - 50/100)`);
  });
  
  it('should throw an error if essential data is missing', () => {
     const scenario: RiskScenario = {
      id: 'test-error',
      baseYear: 2023, lookbackYears: 1, bucket: 'ip_theft', sophistication: 'advanced',
      targetProfile: 'critical_infrastructure', actor_ids: [], vectors: '', sector: 'Energy', region: 'Global'
    };

    // This will fail because there's no success rate data for 'ip_theft'
    const calculate = () => computeAttemptRate({ scenario, datasets: mockDatasets });
    
    expect(calculate).toThrow("Missing success rate data for bucket: ip_theft");
  });

  describe('Energy Sector Supplemental Telemetry (v2.2)', () => {
    const mockDatasetsWithEnergy: Datasets = {
        ...mockDatasets,
        energyAttemptRates: [
            // Multiplicative
            { source: 'ibm_xforce_ti_index_2024_energy', reportTitle: 'IBM Report', publicationDate: '2024-02-16', scope: 'global', bucket: ['ransomware'], sector: ['energy'], metrics: [{ name: 'global_attack_share', value: 0.111, unit: 'ratio' }], citationUrl: '#' },
            // Additive
            { source: 'eisac_end_of_year_report_2023', reportTitle: 'E-ISAC Report', publicationDate: '2024-05-01', scope: 'north_america', bucket: ['ransomware'], sector: ['energy'], metrics: [{ name: 'incident_count', value: 110, unit: 'count' }], citationUrl: '#' },
            // Additive
            { source: 'trustwave_risk_radar_2024', reportTitle: 'Trustwave Report', publicationDate: '2024-01-15', scope: 'global', bucket: ['ransomware'], sector: ['energy'], metrics: [{ name: 'leak_site_incidents_h2_2023', value: 132, unit: 'count' }], citationUrl: '#' },
        ]
    };
     const energyOrgCount = 1440 + 1464;

    it('should correctly apply additive and multiplicative factors before dividing by success rate', () => {
        const scenario: RiskScenario = {
            id: 'test-energy-us',
            baseYear: 2023, lookbackYears: 1, bucket: 'ransomware', sophistication: 'advanced',
            targetProfile: 'critical_infrastructure', actor_ids: [], vectors: '', sector: 'Energy', region: 'US', darkNumber: 0
        };

        const result = computeAttemptRate({ scenario, datasets: mockDatasetsWithEnergy });
        
        const incident_rate_obs = 30 / energyOrgCount;
        
        // Multiplicative factors
        const sophistication_multiplier = 1.8;
        const ibm_multiplier = 1 + (0.111 * 0.5);
        const multiplied_incident_rate = incident_rate_obs * sophistication_multiplier * ibm_multiplier;
        
        // Additive factors (deltas)
        const eisacDelta = 110 / energyOrgCount;
        const trustwaveDelta = 132 / energyOrgCount;
        const totalDelta = eisacDelta + trustwaveDelta;
        
        const fully_calibrated_incident_rate = multiplied_incident_rate + totalDelta;

        // Success Rate (CI baseline * advanced multiplier)
        const success_rate = 0.62 * 1.25;

        const expectedLambda = fully_calibrated_incident_rate / success_rate;
        
        expect(result.lambda_mean).toBeCloseTo(expectedLambda, 5);
        
        const ledger = result.calculationLedger;
        const additiveFactor = ledger.calibration.factors.find(f => f.factorType === 'delta' && f.evidence_summary.includes('E-ISAC'));
        expect(additiveFactor).toBeTruthy();
        expect(additiveFactor?.impact_direction).toBe('additive');
        
        const multiplicativeFactor = ledger.calibration.factors.find(f => f.factorType === 'multiplier' && f.evidence_summary.includes('IBM'));
        expect(multiplicativeFactor).toBeTruthy();
        expect(multiplicativeFactor?.impact_direction).toBe('positive');
    });
  });
});