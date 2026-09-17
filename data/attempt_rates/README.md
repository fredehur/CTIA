# Authoritative Third-Party Attempt-Rate Data

This directory contains normalized data from various authoritative, third-party cybersecurity reports. These datasets provide crucial evidence and statistical grounding for the "Yearly Attempts" risk quantification model.

## Sources

This collection includes, but is not limited to, data from:
-   Verizon Data Breach Investigations Report (DBIR)
-   Mandiant M-Trends
-   CrowdStrike Global Threat Report
-   Palo Alto Networks (Unit 42) Threat Reports
-   Microsoft Digital Defense Report
-   Identity Theft Resource Center (ITRC) Data Breach Report

## Ingestion Process

Data is manually ingested from the official PDF/web reports. The process involves:
1.  Identifying key metrics within a report relevant to a specific threat bucket (`ransomware`, `fraud`, `ip_theft`).
2.  Extracting statistics, such as incident counts, victim counts, or observed campaign volumes, that can serve as a baseline for extrapolating attempt rates.
3.  Normalizing the data into the structured JSON format used by this application. Each source corresponds to a single JSON object within the relevant bucket file (e.g., `ransomware.json`).
4.  Updating the `index.json` manifest to make the new data discoverable.

## Usage in the Model

The metrics in these files are not direct "attempt rates" but are the foundational evidence used by the generative model to perform its calculations. The model's playbook instructs it to:
1.  Select a baseline attempt-rate range based on the scenario's target profile.
2.  Use the metrics from these files to calibrate that baseline, justifying whether the final rate should be higher or lower.
3.  Extrapolate total *attempts* from reported *incidents* or *victims*, using the data here as the starting point for that reasoning.
