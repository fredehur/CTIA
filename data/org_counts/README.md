# U.S. Census SUSB Organization Counts

This directory contains normalized data from the U.S. Census Bureau's Statistics of U.S. Businesses (SUSB) dataset.

## Source

- **Official URL**: [https://www.census.gov/programs-surveys/susb.html](https://www.census.gov/programs-surveys/susb.html)
- **Publication Cadence**: Data is typically published annually.

## Ingestion Process

Data is ingested from the official SUSB annual data tables (CSV format). The process involves:
1.  Downloading the latest annual data tables.
2.  Aggregating firm counts by employment size class.
3.  Mapping these size classes to the `targetProfile` segments used in the cyber risk model.
4.  Normalizing the data into a structured JSON format (`susb-<year>.json`).
5.  Calculating a checksum of the source document for traceability.
6.  Updating the `index.json` manifest.

## Target Profile Mapping

The firm counts from SUSB are aggregated into three primary `targetProfile` segments for risk modeling:

-   **`smb` (Small and Medium-sized Business)**: Typically maps to firms with 1-249 employees.
-   **`large_enterprise`**: Typically maps to firms with 250-499 employees.
-   **`critical_infrastructure`**: Represents the largest firms, often mapped to the 500+ employee category. This is an approximation, as "critical infrastructure" is a functional designation, but for modeling purposes, we use the largest firms as a proxy for the most likely targets.

**Note:** The SUSB data covers private-sector employer firms only. It excludes most government entities, public administration, and nonemployer businesses. This is a key assumption when using these counts as a denominator in risk calculations.
