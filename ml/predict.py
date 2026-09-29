import sys
import json
import pandas as pd
import joblib
import traceback

def main():
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"error": "No data provided"}))
            return
            
        data = json.loads(sys.argv[1])
        df = pd.DataFrame([data])
        
        # Load models
        cost_clf = joblib.load('ml/cost_clf.pkl')
        cost_reg = joblib.load('ml/cost_reg.pkl')
        time_clf = joblib.load('ml/time_clf.pkl')
        time_reg = joblib.load('ml/time_reg.pkl')
        anomaly_model = joblib.load('ml/anomaly.pkl')
        
        # Ensure correct column order
        cols = ['original_cost', 'project_age_days', 'physical_progress', 'expenditure_pct']
        df = df[cols]
        
        # Predict
        cost_prob = cost_clf.predict_proba(df)[0][1]
        cost_pct = cost_reg.predict(df)[0]
        time_prob = time_clf.predict_proba(df)[0][1]
        time_days = time_reg.predict(df)[0]
        anomaly_score = anomaly_model.decision_function(df)[0]
        is_anomaly = int(anomaly_model.predict(df)[0] == -1)
        
        # Risk Score Logic
        risk_score = (cost_prob * 30) + (time_prob * 30) + (100 - df['physical_progress'].iloc[0]) * 0.2 + (df['expenditure_pct'].iloc[0] * 0.2)
        if is_anomaly:
            risk_score += 10
            
        risk_score = min(max(float(risk_score), 0.0), 100.0)
        
        result = {
            "cost_overrun_probability": float(cost_prob),
            "predicted_cost_overrun_pct": float(cost_pct),
            "time_overrun_probability": float(time_prob),
            "predicted_time_overrun_days": float(time_days),
            "anomaly_score": float(anomaly_score),
            "is_anomaly": bool(is_anomaly),
            "risk_score": float(risk_score)
        }
        
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}))

if __name__ == '__main__':
    main()
