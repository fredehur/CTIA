# Yearly Attempts Model - Operational Runbook

This runbook provides operational procedures for maintaining and running the Yearly Attempts risk quantification model.

## 1. Dataset Ingestion Cadence

The model relies on timely, authoritative data. The following datasets must be refreshed according to their publication schedules.

| Dataset          | Source                             | Cadence          | Last Checked |
| ---------------- | ---------------------------------- | ---------------- | ------------ |
| **IC3 Reports**  | FBI IC3                            | Annually (Q1)    | July 2024    |
| **SUSB Counts**  | U.S. Census Bureau                 | Annually (varies)| July 2024    |
| **Coveware**     | Coveware                           | Quarterly        | July 2024    |
| **Sophos**       | Sophos                             | Annually (Q2)    | July 2024    |
| **Verizon DBIR** | Verizon                            | Annually (Q2)    | July 2024    |

**Action**: Monitor source websites at the beginning of each quarter for new reports.

## 2. Dataset Refresh Agent

The "Dataset Refresh Agent" is a manual process for ingesting and normalizing new data.

### How to Run and Merge Outputs

1.  **Download Source**: Download the new report (e.g., `2024_IC3Report.pdf`) from the official source.
2.  **Normalize Data**: Manually extract key metrics relevant to the model's buckets (ransomware, fraud, ip_theft). Create a new JSON file following the existing schema (e.g., `data/ic3/ic3-2024.json`).
    -   Ensure all metrics have a `name`, `value`, and `unit`.
    -   Update all metadata fields (`source`, `reportTitle`, `publicationDate`, etc.).
3.  **Calculate Checksum**: Generate a SHA-256 hash of the *source document* (the PDF, not your JSON file) to ensure traceability. This is a placeholder in the current version and should be implemented with a proper tool in a production environment.
4.  **Update `index.json`**: Add a new entry to the top of the relevant `index.json` file (e.g., `data/ic3/index.json`). This entry must include the new year, `fileName`, `sourceUrl`, `checksum`, and `ingestedAt` timestamp.
5.  **Commit Changes**: Commit the new data file and the updated `index.json` to version control.

## 3. Validation and Testing

Regular testing ensures the deterministic model behaves as expected.

### How to Run Tests

The test suite is located in the `/tests` directory. In a standard development environment with a test runner like Jest or Vitest, you would run:

```bash
# Install dependencies
npm install

# Run all tests
npm test
```

*Since this is a sandboxed environment, tests are provided as documentation and can be manually inspected.*

### Interpreting Failures

-   **`attemptModel.spec.ts` / `successModel.spec.ts` Failures**: These indicate a breaking change in the calculation logic within `computeAttemptRate` or `computeSuccessRate`. The test name will point to the specific scenario (e.g., "should apply vector multipliers correctly") that failed. Review the recent code changes to the respective `services/*.ts` file.
-   **`yearlyAttempts.spec.ts` (Regression) Failures**: This indicates that the final output for a canonical, well-defined scenario has changed.
    -   If the change is **intentional** (e.g., you updated a multiplier), update the "snapshot" object in the test file to reflect the new correct output.
    -   If the change is **unintentional**, it points to a regression. Use the diff to identify what part of the output changed (e.g., `lambda_mean`, `justification` text) and debug the calculation logic.

## 4. AI Studio Prompt & Archetype Signal Handling

### Updating Prompts

-   **Narrative Generation**: The prompt for `generateYearlyAttemptsNarrative` is in `services/geminiService.ts`. To change the tone, structure, or content of the final summary, edit the prompt directly in that function.
-   **Archetype Signal Agent**: The prompt for `fetchArchetypeSignals` is also in `geminiService.ts`. To guide the AI to search for different kinds of metrics or use different sources, modify its instructions.

**Best Practice**: After updating a prompt, run several test scenarios to ensure the output format and quality remain consistent.

### Handling Archetype Signals

The Archetype Signal workflow is a human-in-the-loop process:
1.  **Fetch**: An analyst clicks "Fetch Signals" for a scenario.
2.  **Review**: The AI returns a list of potential signals. The analyst MUST review each signal for:
    -   **Relevance**: Does this metric actually apply to the scenario's archetype and context?
    -   **Credibility**: Is the source URL trustworthy?
    -   **Accuracy**: Does the extracted `value` and `excerpt` match the source?
3.  **Approve/Reject**: The analyst uses the checkboxes to approve credible signals.
4.  **Recalculate**: The analyst must click "Calculate Attempt-Rates" again to re-run the model with the new signals incorporated. The model will apply a multiplier based on the signal's `confidence`.

## 5. Troubleshooting Common Issues

-   **Issue: "Failed to load critical datasets" error.**
    -   **Cause**: The `fetch` calls in `YearlyAttempts.tsx` failed to load the JSON data files from `/data`.
    -   **Fix**: Ensure all data files and their `index.json` manifests exist and are correctly named. Check the browser's network tab for 404 errors.

-   **Issue: Calculation fails with "Missing required IC3 metric" or similar error.**
    -   **Cause**: The model is trying to calculate a rate for a scenario (e.g., `ip_theft` in 2023) for which no corresponding data exists in the ingested files (e.g., `ic3-2023.json` does not have an `espionage_incidents` metric).
    -   **Fix**: Ingest data that covers the required metric or adjust the scenario to one that has data coverage. The model is designed to fail explicitly in zero-evidence situations.

-   **Issue: Narrative generation is poor or nonsensical.**
    -   **Cause**: The deterministic model produced valid numbers, but the AI failed to synthesize a good story.
    -   **Fix**: Review the prompt in `generateYearlyAttemptsNarrative`. It may need more specific instructions or better examples to guide the language model.

-   **Issue: Archetype Signal Agent returns no signals or irrelevant ones.**
    -   **Cause**: The prompt in `fetchArchetypeSignals` may be too narrow, or there may be no recent, public reporting for that specific archetype.
    -   **Fix**:
        1.  Broaden the prompt to include aliases or related threat groups.
        2.  Verify in the UI that the AI provided an `explanation`. If it did, it likely concluded its search and found nothing. This is a valid outcome.
        3.  Manually search for intelligence to confirm if data exists. If it does, refine the prompt to help the AI find it.
