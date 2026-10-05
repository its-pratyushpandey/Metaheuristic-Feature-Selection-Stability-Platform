# Metaheuristic Feature Selection Stability Platform

## What This Project Does

This project helps find machine-learning features that remain useful when the
training data changes. A feature selected in only one sample may be a search
artefact, so the system runs feature selection repeatedly, measures stability,
and checks the final model before accepting it.

The project includes a FastAPI backend, a Next.js dashboard, reproducible
experiments, independent held-out testing, five negative tests, six KPI checks,
and an evidence package for every completed experiment.


## Complete Workflow

1. Load a built-in dataset or upload a CSV file.
2. Check quality, schema, missing values, duplicates, and data types.
3. Isolate independent held-out data before feature selection.
4. Run the O2 reference baseline.
5. Run GA, PSO, SA, or DE on repeated resampled data.
6. Compare selected subsets across resampling runs.
7. Classify stable features and search artefacts.
8. Evaluate the consensus subset on validation and held-out data.
9. Run NT-1 through NT-5 negative tests.
10. Calculate six KPIs and produce an acceptance decision.
11. Save experiment results, an evidence manifest, and a reproducibility script.

## Implemented Features

### Dataset and preprocessing

- Dataset registry with Ionosphere, Sonar, Waveform, Wine, Zoo, Friedman, and
  Diabetes benchmark examples.
- CSV upload with target-column and file-structure validation.
- Dataset quality reports with missing values, duplicates, feature types,
  statistics, target details, and readiness status.
- Held-out partition isolated before feature selection.
- Imputation and scaling fitted only on training data.
- Validation, held-out, condition, and subgroup evaluation.

### O2 reference baseline

The Reference page compares:

- Full features.
- SelectKBest filter selection.
- Mutual-information selection.

Each approach records performance, selected features, execution time, memory,
p50/p95 inference latency, subgroup performance, and calibration evidence. The
SelectKBest reference is also measured across bootstrap samples for a real O2
stability comparison.

### Metaheuristic search

The Feature Selection page supports:

- Genetic Algorithm (GA).
- Particle Swarm Optimization (PSO).
- Simulated Annealing (SA).
- Differential Evolution (DE).

Users can select a dataset, model, population size, iterations, alpha trade-off,
algorithm parameters, and seed. The dashboard shows convergence, fitness,
selected features, feature rankings, and execution logs.

### O3 stability analysis

The Stability page reports:

- Nogueira stability.
- Kuncheva consistency.
- Average and worst-case Jaccard similarity.
- Ranking consistency.
- 95% bootstrap confidence interval.
- Pairwise subset similarity matrix.
- Per-resample validation and held-out performance.
- Selected feature counts and run time.

### Stable features and artefacts

Each feature is classified using selection frequency and statistical evidence:

- **Consistently Selected:** at least 80% of runs.
- **Potentially Stable:** 50% to less than 80%.
- **Unstable:** 20% to less than 50%.
- **Search Artefact:** less than 20%.

The Stable Features page displays frequency, confidence interval, model
contribution, p-value, final status, and engineering recommendation.

### Workflow and architecture pages

The Training / Serving Loop page explains:

1. Dataset ingestion and partitioning.
2. O2 reference performance.
3. O3 resampling stability.
4. Stable-feature classification.
5. Metaheuristic search.
6. Consensus selection.
7. Shift, calibration, abstention, and feedback.

The Architecture page displays both the training/serving workflow and the
formal validation decision architecture.

### Assurance and recovery

The Assurance page provides:

- Covariate-shift testing using PSI and distribution comparisons.
- Measured held-out calibration and ECE.
- High-confidence and uncertain-query abstention tests.
- Recovery and rollback audit logs.
- Conservative degraded-mode information.

Calibration endpoint:

```text
POST /api/v1/assurance/calibration
```

### Six KPI checks

The KPI dashboard compares the O3 candidate against the O2 reference:

| KPI | Meaning |
| --- | --- |
| KPI-1 | Stability improvement across resamples |
| KPI-2 | Independent held-out performance |
| KPI-3 | Consistently selected feature ratio |
| KPI-4 | Worst-condition performance retention |
| KPI-5 | Expected Calibration Error (ECE) |
| KPI-6 | p95 inference latency |

KPI values come from recorded measurements. Missing evidence fails closed and
is not replaced with synthetic passing values.

### Five negative tests

- **NT-1:** Runs search on disjoint samples and measures subset difference.
- **NT-2:** Injects Gaussian noise and checks that noise is not consistently
  selected.
- **NT-3:** Measures the training-to-held-out generalization gap.
- **NT-4:** Checks configured p95 latency and the 512 MB memory limit.
- **NT-5:** Injects synthetic drift and checks that the detector responds.

### Acceptance decision gate

The Validation page checks:

- AC-1: Independent held-out operation.
- AC-2: Negative and boundary-test operation.
- AC-3: Independent subgroup evidence.
- AC-4: Resource and latency envelope.

The final decision is `PASS / ACCEPT`, `REVISE`, or `HOLD / STOP`. Deployment is
blocked when mandatory safety tests fail.

### Evidence and reproducibility

Each completed experiment stores configuration, seed, dataset metadata,
partition metadata, O2 results, O3 results, feature classifications, negative
tests, KPI results, acceptance decision, SHA-256 fingerprint, JSON-LD manifest,
and a standalone Python reproducibility script.

The Evidence page allows the evaluator to inspect, copy, and download the
manifest and script.

## Dashboard Pages

- Dashboard: start a complete experiment and view the latest result.
- Datasets & Quality: inspect and upload datasets.
- Architecture Flow: view both architecture diagrams.
- O2 Reference Baseline: compare reference methods.
- Metaheuristic Selector: run one configurable search.
- O3 Stability Across Resamples: run repeated stability analysis.
- Stable vs Artefacts: inspect feature classifications.
- Training / Serving Loop: follow the full workflow.
- Validation & Decision Gate: inspect AC-1 to AC-4.
- Negative Test Center: inspect NT-1 to NT-5.
- 6-KPI Performance: compare all KPI values.
- Shift, Calibration & Abstention: test runtime assurance.
- Experiment History: inspect saved runs.
- Evidence & Provenance: inspect manifests and scripts.
- Capstone Roadmap: review O1 to O5 milestones.
- System Health & Jobs: inspect resources, jobs, and runs.

## Technologies

Backend: Python 3.14, FastAPI, Pydantic, NumPy, pandas, scikit-learn, SciPy,
psutil, and pytest.

Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts, and Lucide.

## Installation and Startup

Requirements: Python 3.10+, Node.js 18+, and npm.

From the project root:

```bash
./start.sh
```

The launcher builds and starts the production frontend and starts the FastAPI
backend.

- Dashboard: http://localhost:3000
- API documentation: http://localhost:8000/docs

Keep the terminal open while using the application. Press `Ctrl+C` to stop it.

### Manual backend setup

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
PYTHONPATH=. python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

### Manual frontend setup

```bash
cd frontend
npm install
npm run dev
```

Production verification:

```bash
npm run typecheck
npm run build
npm run start
```

## Testing

Backend tests:

```bash
PYTHONPATH=. ./venv/bin/pytest backend/tests/test_all.py -v
```

The tests cover dataset loading, leakage-free partitioning, all four algorithms,
O2 reference and oracle behavior, O3 metrics, feature classification, negative
tests, the decision gate, and fail-closed KPI behavior.

Frontend checks:

```bash
cd frontend
npm run typecheck
npm run build
```

## Review-2 Rubric Coverage

### 1. Implementation Progress and Module Completion

Working modules cover datasets, preprocessing, O2 reference, metaheuristics, O3
stability, feature classification, assurance, validation, evidence, API routes,
async orchestration, and the dashboard. The Roadmap page records O1 to O5.

### 2. Technical Implementation and Code Quality

The code is separated by responsibility and uses typed frontend contracts,
Pydantic request validation, error handling, deterministic seeds, reusable
model-evaluation functions, and pinned backend dependencies.

### 3. Integration and System Functionality

The Next.js dashboard communicates with FastAPI through the configured proxy.
Users can start an asynchronous experiment, monitor progress, inspect results,
view the decision gate, and download evidence.

### 4. Testing and Validation

The automated backend suite covers the main workflow. NT-1 through NT-5 test
sample sensitivity, noise, overfitting, resources, latency, and drift. The
acceptance gate converts the evidence into a final decision.

### 5. Results and Performance Analysis

The system records accuracy or R2, stability, confidence intervals, feature
counts, subgroup performance, calibration, memory, execution time, and latency.
The dashboard presents these results in cards, charts, tables, and manifests.

### 6. Innovation and Problem-Solving

The main contribution is repeated feature selection across changing samples.
The system separates stable signals from search artefacts, checks injected noise,
and blocks unsafe results through measurable acceptance rules.

### 7. Documentation and Project Management

This README explains the architecture, modules, setup, testing, APIs, results,
and Review-2 coverage. The dashboard includes architecture, roadmap, experiment
history, provenance, and evidence pages.

### 8. Presentation, Demonstration, and Technical Q&A

Recommended live demonstration:

1. Open Dashboard.
2. Select a dataset and algorithm.
3. Start the end-to-end pipeline.
4. Show live job progress.
5. Explain the Stability metrics.
6. Explain Stable vs Artefacts.
7. Show NT-1 through NT-5.
8. Show KPI and Validation results.
9. Run shift, calibration, abstention, and rollback checks.
10. Download the evidence manifest and reproducibility script.

This sequence demonstrates implementation, integration, testing, results,
innovation, and technical understanding of the complete project.
# Metaheuristic-Feature-Selection-Stability-Platform
