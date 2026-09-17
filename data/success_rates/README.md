# Authoritative Third-Party Success-Rate Data

This directory contains normalized data on success and conversion rates from various authoritative, third-party cybersecurity reports. These datasets provide crucial evidence for calibrating the success-rate component of the "Yearly Attempts" risk quantification model.

## Definition of Success

"Success" is defined within the context of a specific threat bucket:
-   **Ransomware**: Metrics include ransom payment rates, data recovery rates after payment, average payout amounts, and the prevalence of successful data exfiltration.
-   **Fraud/BEC**: Metrics include phishing click-through rates, credential submission rates, and average financial loss per incident.

## Sources

This collection includes, but is not limited to, data from:
-   Coveware Ransomware Reports
-   Sophos "State of Ransomware"
-   Abnormal Security Email Threat Reports
-   Proofpoint "State of the Phish"
-   Verizon DBIR (for phishing success metrics)

## Ingestion Process

Data is manually ingested from official reports. The process involves:
1.  Identifying key metrics within a report relevant to a specific threat bucket's success criteria.
2.  Extracting statistics like payment percentages, click rates, or average losses.
3.  Normalizing the data into the structured JSON format used by this application.
4.  Updating the `index.json` manifest to make the new data discoverable.

## Usage in the Model

The metrics in these files are used by the generative model's playbook to reason about the likelihood of a successful attack, given a certain number of attempts. They inform the relationship between the `attempt-rate` data and the final impact assessment.
