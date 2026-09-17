# FBI IC3 Data

This directory contains normalized data from the FBI's Internet Crime Complaint Center (IC3) annual reports.

## Source

- **Official URL**: [https://www.ic3.gov/Home/AnnualReports](https://www.ic3.gov/Home/AnnualReports)
- **Publication Cadence**: Data is typically published annually, covering the previous calendar year.

## Ingestion Process

Data is manually ingested from the official PDF/CSV reports. The process involves:
1.  Downloading the latest annual report.
2.  Extracting key metrics related to ransomware, fraud (including BEC), and other relevant cybercrime categories.
3.  Normalizing the data into a structured JSON format (`ic3-<year>.json`).
4.  Calculating a checksum (SHA-256) of the source document to ensure data integrity and traceability.
5.  Updating the `index.json` manifest with metadata for the newly ingested year.

## Parsing Assumptions

- Metrics are extracted as published, without modification.
- Complaint counts and victim loss amounts are assumed to be specific to the United States unless otherwise specified in the report.
- The "metrics" array in each JSON file contains objects with a `name`, `value`, and `unit` to provide clear, structured data points.
