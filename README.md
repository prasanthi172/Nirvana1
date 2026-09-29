# NIRVANA

**National Infrastructure Risk & Vision Analytics Network**
AI-Powered Infrastructure Project Monitoring & Early Warning System

## Overview
NIRVANA is an AI-powered infrastructure project intelligence platform that transforms project monitoring data into predictive risk insights, early warnings, explainable analytics, and monitoring recommendations. It shifts infrastructure monitoring from descriptive to predictive analytics, enabling policymakers and monitoring officers to identify high-risk projects early.

## Core Features
1. **Executive Dashboard**: High-level KPIs, project risk distribution, cost overruns by sector.
2. **Project Explorer**: Filter, search, and view all infrastructure projects with calculated metrics.
3. **Risk Intelligence Engine**: Powered by Random Forest classification and regression models. Calculates an aggregate 0-100 score based on cost escalation probabilities, schedule slippage probabilities, and physical-financial mismatch.
4. **Early Warning Center**: Automatically generates actionable alerts (e.g., "Progress-Financial Mismatch", "Cost Escalation Risk") based on configurable thresholds.
5. **Model Intelligence**: Transparent ML pipeline status and model performance metrics (ROC-AUC, R²) addressing data leakage protections.
6. **Administration**: Manual retraining triggers for the ML pipeline.

## Technology Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React
- **Backend**: Node.js, Express, Python 3 (scikit-learn, pandas, joblib)
- **Machine Learning**: Random Forest Classifier, Random Forest Regressor, Isolation Forest

## Machine Learning Methodology
The ML pipeline predicts project risk by ensuring robust **Data Leakage Protection**.
- **Cost Prediction**: Does not use `Revised Cost` as a feature.
- **Schedule Prediction**: Does not use `Revised Completion Date`.
- **Anomaly Detection**: Utilizes Isolation Forest to detect unusual multivariate patterns in execution.
- **Model Storage**: Models are pickled and stored in `ml/` and queried dynamically by the Express backend spawning Python processes.

## Limitations
*Prototype uses available project-level data snapshots. Model performance depends on data quality. Risk scores are experimental analytical indicators and require human review before operational use.*
