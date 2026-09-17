/**
 * Unit Tests for the Deterministic Success-Rate Model.
 * 
 * How to Run:
 * In a standard development environment with a test runner like Jest or Vitest,
 * you would run a command like `npm test` or `npx jest tests/successModel.spec.ts`.
 */
import { computeSuccessRate } from '../services/successModel';
import type { RiskScenario, SuccessRateRecord } from '../types';

// --- MOCK FIXTURE DATA ---
// This is a subset of the new data/success_rates/ransomware.json for testing purposes.
const mockSuccessRates: SuccessRateRecord[] = [
  {
    "source": "sophos_state_of_ransomware_2025",
    "reportTitle": "State of Ransomware 2025",
    "publicationDate": "2025-06-30", "scope": "global_survey_3400_orgs", "bucket": ["ransomware"],
    "metrics": [{ "name": "encryption_success_rate", "value": 0.50, "unit": "ratio" }],
  },
  {
    "source": "sophos_state_of_ransomware_2024",
    "reportTitle": "The State of Ransomware 2024",
    "publicationDate": "2024-04-30", "scope": "global_survey_5000_respondents", "bucket": ["ransomware"],
    "targetProfiles": ["smb", "large_enterprise", "critical_infrastructure"],
    "metrics": [{ "name": "encryption_success_rate", "value": 0.70, "unit": "ratio" }],
  },
  {
    "source": "sophos_state_of_ransomware_2023",
    "reportTitle": "State of Ransomware 2023",
    "publicationDate": "2023-05-10", "scope": "global_survey_3000_orgs", "bucket": ["ransomware"],
    "metrics": [{ "name": "encryption_success_rate", "value": 0.76, "unit": "ratio" }],
  },
  {
    "source": "sophos_state_of_ransomware_state_local_gov_2024",
    "reportTitle": "State of Ransomware in State and Local Government 2024",
    "publicationDate": "2024-08-14", "scope": "us_state_local_government", "bucket": ["ransomware"],
    "targetProfiles": ["government"],
    "metrics": [{ "name": "encryption_success_rate", "value": 0.98, "unit": "ratio" }],
  },
  {
    "source": "sophos_state_of_ransomware_critical_infrastructure_2024",
    "reportTitle": "State of Ransomware in Critical Infrastructure 2024",
    "publicationDate": "2024-07-17", "scope": "global_critical_infrastructure", "bucket": ["ransomware"],
    "targetProfiles": ["critical_infrastructure", "energy", "utilities"],
    "metrics": [{ "name": "device_impact_rate", "value": 0.62, "unit": "ratio" }],
  },
   {
    "source": "coveware_ransomware_report_q1_2024",
    "reportTitle": "Ransomware Demands and Payments: A Q1 2024 Look",
    "publicationDate": "2024-04-18", "scope": "global_coveware_cases", "bucket": ["ransomware"],
    "metrics": [{ "name": "payment_rate", "value": 0.28, "unit": "ratio" }],
  }
];


// --- MOCK TEST RUNNER ---

const expect = (value: any) => ({
    toBe: (expected: any) => {
        if (value !== expected) throw new Error(`Expected ${value} to be ${expected}`);
    },
    toBeCloseTo: (expected: number, precision = 2) => {
        const pass = Math.abs(expected - value) < (Math.pow(10, -precision) / 2);
        if (!pass) throw new Error(`Expected ${value} to be close to ${expected}`);
    },
});

const describe = (name: string, fn: () => void) => {
    console.log(`\n--- Running test suite: ${name} ---`);
    fn();
};

const it = (name: string, fn: () => void) => {
    console.log(`  - ${name}`);
    try {
        fn();
    } catch (e) {
        console.error(`    [FAIL] ${(e as Error).message}`);
    }
};

// --- TEST SUITE ---

describe('computeSuccessRate (v2 Data Logic)', () => {

    const baseScenario: RiskScenario = {
        id: 'test-1', baseYear: 2024, lookbackYears: 1, bucket: 'ransomware',
        sophistication: 'non_advanced', actor_ids: ['Test Actor'], vectors: 'phishing',
        sector: '', region: 'US', targetProfile: 'smb',
    };

    it('should select the correct sector-specific rate for Critical Infrastructure', () => {
        const scenario: RiskScenario = {
            ...baseScenario,
            baseYear: 2023,
            sector: 'Critical Manufacturing',
            targetProfile: 'critical_infrastructure',
        };

        const result = computeSuccessRate({ scenario, successData: mockSuccessRates });

        // Expected to pick 'sophos_state_of_ransomware_critical_infrastructure_2024'
        // and its 'device_impact_rate' of 0.62.
        expect(result.success_rate_mean).toBeCloseTo(0.62, 2);
        expect(result.calculationLedger.baseline_selection.source).toBe("State of Ransomware in Critical Infrastructure 2024");
    });

    it('should select the correct sector-specific rate for Government', () => {
        const scenario: RiskScenario = {
            ...baseScenario,
            baseYear: 2023,
            sector: 'Government',
        };

        const result = computeSuccessRate({ scenario, successData: mockSuccessRates });

        // Expected to pick 'sophos_state_of_ransomware_state_local_gov_2024'
        // and its 'encryption_success_rate' of 0.98.
        expect(result.success_rate_mean).toBeCloseTo(0.98, 2);
        expect(result.calculationLedger.baseline_selection.source).toBe("State of Ransomware in State and Local Government 2024");
    });

    it('should select the latest global baseline for a generic scenario', () => {
        const scenario: RiskScenario = {
            ...baseScenario,
            baseYear: 2024,
            sector: 'Retail', // No specific data for Retail
        };

        const result = computeSuccessRate({ scenario, successData: mockSuccessRates });
        
        // Expected to pick 'sophos_state_of_ransomware_2025' (data for 2024)
        // and its 'encryption_success_rate' of 0.50.
        expect(result.success_rate_mean).toBeCloseTo(0.50, 2);
        expect(result.calculationLedger.baseline_selection.source).toBe("State of Ransomware 2025");
    });

    it('should fall back to the nearest prior year for a historical scenario', () => {
        const scenario: RiskScenario = {
            ...baseScenario,
            baseYear: 2023, // Set one year in the past relative to the latest data
            sector: 'Retail',
        };

        const result = computeSuccessRate({ scenario, successData: mockSuccessRates });

        // Expected to ignore the 2025 report (2024 data) and pick the 2024 report (2023 data)
        // with its 'encryption_success_rate' of 0.70.
        expect(result.success_rate_mean).toBeCloseTo(0.70, 2);
        expect(result.calculationLedger.baseline_selection.source).toBe("The State of Ransomware 2024");
    });
    
    it('should prefer impact metrics but fallback to payment rate', () => {
        const scenario: RiskScenario = {
            ...baseScenario,
            baseYear: 2023,
            sector: 'Retail'
        };
        // Create a dataset where the most recent global entry ONLY has a payment rate
        const paymentOnlyData = mockSuccessRates.filter(r => 
            !r.source.includes("sophos_state_of_ransomware_2024") && 
            !r.source.includes("sophos_state_of_ransomware_2025")
        );
        
        const result = computeSuccessRate({ scenario, successData: paymentOnlyData });
        
        // It should ignore the older Sophos 2023 `encryption_success_rate` and pick the newer Coveware
        // 'payment_rate' as the best available metric for a 2023 scenario.
        expect(result.success_rate_mean).toBeCloseTo(0.28);
        expect(result.calculationLedger.baseline_selection.source).toBe("Ransomware Demands and Payments: A Q1 2024 Look");
    });
});
