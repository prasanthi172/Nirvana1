import os
import sys
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

def main():
    try:
        csv_path = 'data/uploaded_projects.csv'
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            # Ensure required numerical predictor features exist (no leakage features!)
            original_cost = pd.to_numeric(df.get('original_cost', 1000), errors='coerce').fillna(1000).values
            project_age_days = pd.to_numeric(df.get('project_age_days', 730), errors='coerce').fillna(730).values
            physical_progress = pd.to_numeric(df.get('physical_progress', 50), errors='coerce').fillna(50).values
            expenditure_pct = pd.to_numeric(df.get('expenditure_pct', 50), errors='coerce').fillna(50).values

            revised_cost = pd.to_numeric(df.get('revised_cost', original_cost), errors='coerce').fillna(pd.Series(original_cost)).values
            cost_overrun_flag = (revised_cost > original_cost).astype(int)
            safe_orig = np.where(original_cost > 0, original_cost, 1.0)
            cost_overrun_pct = ((revised_cost - safe_orig) / safe_orig) * 100.0

            if 'time_overrun_days' in df.columns:
                time_overrun_days = pd.to_numeric(df['time_overrun_days'], errors='coerce').fillna(0).values
                time_overrun_flag = (time_overrun_days > 0).astype(int)
            else:
                time_prob = ((100 - physical_progress) / 100.0) * 0.5 + (project_age_days / 3000.0) * 0.3
                time_overrun_flag = (time_prob > 0.45).astype(int)
                time_overrun_days = np.maximum(0, time_prob * 600)
            dataset_source = "uploaded_dataset"
        else:
            np.random.seed(42)
            n_samples = 500
            original_cost = np.random.uniform(500, 50000, n_samples)
            project_age_days = np.random.uniform(100, 3000, n_samples)
            physical_progress = np.random.uniform(0, 100, n_samples)
            expenditure_pct = np.random.uniform(0, 120, n_samples)

            cost_overrun_prob = (expenditure_pct / 100.0) * 0.4 + (project_age_days / 3000) * 0.4 + np.random.uniform(-0.1, 0.1, n_samples)
            cost_overrun_flag = (cost_overrun_prob > 0.5).astype(int)
            time_overrun_prob = ((100 - physical_progress) / 100.0) * 0.5 + (project_age_days / 3000) * 0.3 + np.random.uniform(-0.1, 0.1, n_samples)
            time_overrun_flag = (time_overrun_prob > 0.5).astype(int)
            cost_overrun_pct = cost_overrun_prob * 100 * np.random.uniform(0.8, 1.2, n_samples)
            time_overrun_days = time_overrun_prob * 1000 * np.random.uniform(0.8, 1.2, n_samples)
            dataset_source = "prototype_baseline"

        X = pd.DataFrame({
            'original_cost': original_cost,
            'project_age_days': project_age_days,
            'physical_progress': physical_progress,
            'expenditure_pct': expenditure_pct
        })

        # Ensure at least two classes exist for classification even on small custom datasets
        if len(np.unique(cost_overrun_flag)) < 2:
            cost_overrun_flag[0] = 1 - cost_overrun_flag[0]
        if len(np.unique(time_overrun_flag)) < 2:
            time_overrun_flag[0] = 1 - time_overrun_flag[0]

        test_size = 0.2 if len(X) >= 10 else 0.5

        # A. Cost Overrun Classification
        X_train, X_test, y_train, y_test = train_test_split(X, cost_overrun_flag, test_size=test_size, random_state=42)
        rf_clf_cost = RandomForestClassifier(n_estimators=50, random_state=42, class_weight="balanced")
        rf_clf_cost.fit(X_train, y_train)
        preds = rf_clf_cost.predict(X_test)
        acc = accuracy_score(y_test, preds)
        prec = precision_score(y_test, preds, zero_division=0)
        rec = recall_score(y_test, preds, zero_division=0)
        f1 = f1_score(y_test, preds, zero_division=0)
        joblib.dump(rf_clf_cost, 'ml/cost_clf.pkl')

        # B. Cost Overrun Regression
        X_train, X_test, y_train, y_test = train_test_split(X, cost_overrun_pct, test_size=test_size, random_state=42)
        rf_reg_cost = RandomForestRegressor(n_estimators=50, random_state=42)
        rf_reg_cost.fit(X_train, y_train)
        reg_preds = rf_reg_cost.predict(X_test)
        mae = mean_absolute_error(y_test, reg_preds)
        rmse = np.sqrt(mean_squared_error(y_test, reg_preds))
        r2 = r2_score(y_test, reg_preds) if len(y_test) > 1 else 0.0
        joblib.dump(rf_reg_cost, 'ml/cost_reg.pkl')

        # C. Time Overrun Classification
        X_train, X_test, y_train, y_test = train_test_split(X, time_overrun_flag, test_size=test_size, random_state=42)
        rf_clf_time = RandomForestClassifier(n_estimators=50, random_state=42, class_weight="balanced")
        rf_clf_time.fit(X_train, y_train)
        time_preds = rf_clf_time.predict(X_test)
        time_acc = accuracy_score(y_test, time_preds)
        joblib.dump(rf_clf_time, 'ml/time_clf.pkl')

        # D. Time Overrun Regression
        X_train, X_test, y_train, y_test = train_test_split(X, time_overrun_days, test_size=test_size, random_state=42)
        rf_reg_time = RandomForestRegressor(n_estimators=50, random_state=42)
        rf_reg_time.fit(X_train, y_train)
        joblib.dump(rf_reg_time, 'ml/time_reg.pkl')

        # E. Anomaly Detection
        iso_forest = IsolationForest(contamination=0.08, random_state=42)
        iso_forest.fit(X)
        joblib.dump(iso_forest, 'ml/anomaly.pkl')

        importances = dict(zip(X.columns, [round(float(x), 4) for x in rf_clf_cost.feature_importances_]))

        print(json.dumps({
            "status": "success",
            "dataset_source": dataset_source,
            "samples": int(len(X)),
            "feature_importances": importances,
            "metrics": {
                "cost_classification_accuracy": round(float(acc), 4),
                "cost_precision": round(float(prec), 4),
                "cost_recall": round(float(rec), 4),
                "cost_f1": round(float(f1), 4),
                "cost_regression_mae": round(float(mae), 2),
                "cost_regression_rmse": round(float(rmse), 2),
                "cost_regression_r2": round(float(r2), 4),
                "time_classification_accuracy": round(float(time_acc), 4)
            }
        }))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == '__main__':
    main()
