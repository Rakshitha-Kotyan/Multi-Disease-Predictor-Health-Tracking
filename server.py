from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import os
import time


def load_assets():
    model = joblib.load("models/symptom_disease_model.pkl")
    mlb = joblib.load("models/mlb.pkl")

    desc_df = pd.read_csv("data/symptom_Description.csv")
    disease_to_description = dict(zip(desc_df["Disease"], desc_df["Description"]))

    pre_df = pd.read_csv("data/symptom_precaution.csv").fillna("")
    disease_to_precautions = {}
    for _, row in pre_df.iterrows():
        disease = row["Disease"]
        vals = [
            str(row.get("Precaution_1", "")).strip(),
            str(row.get("Precaution_2", "")).strip(),
            str(row.get("Precaution_3", "")).strip(),
            str(row.get("Precaution_4", "")).strip(),
        ]
        disease_to_precautions[disease] = [v for v in vals if v]

    return model, mlb, disease_to_description, disease_to_precautions


app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

MODEL, MLB, D2DESC, D2PRE = load_assets()
TRACK_BUFFER = []  # in-memory demo store: list of dicts


@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/predict")
def page_predict():
    return send_from_directory("static", "predict.html")

@app.route("/track")
def page_track():
    return send_from_directory("static", "track.html")

@app.route("/about")
def page_about():
    return send_from_directory("static", "about.html")

@app.route("/login")
def page_login():
    return send_from_directory("static", "login.html")

@app.route("/contact")
def page_contact():
    return send_from_directory("static", "contact.html")

@app.route("/services")
def page_services():
    return send_from_directory("static", "services.html")

@app.route("/register")
def page_register():
    return send_from_directory("static", "register.html")


@app.route("/api/symptoms", methods=["GET"])
def get_symptoms():
    return jsonify({
        "symptoms": list(MLB.classes_)
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    payload = request.json or {}
    symptoms = payload.get("symptoms", [])
    top_k = int(payload.get("top_k", 3))

    if not symptoms:
        return jsonify({"error": "symptoms list is required"}), 400

    X = MLB.transform([symptoms])
    try:
        proba = MODEL.predict_proba(X)[0]
        classes = getattr(MODEL, "classes_", None)
        if classes is None:
            classes = np.unique(MODEL.predict(X))
    except Exception:
        pred = MODEL.predict(X)
        classes = np.array([pred[0]])
        proba = np.array([1.0])

    order = np.argsort(proba)[::-1]
    top_indices = order[:top_k]
    top = []
    for i in top_indices:
        disease = str(classes[i])
        top.append({
            "disease": disease,
            "confidence": float(proba[i]),
            "description": D2DESC.get(disease, "Description not available."),
            "precautions": D2PRE.get(disease, []),
        })

    return jsonify({
        "predictions": top
    })


@app.route("/api/track", methods=["POST"])
def track_health():
    data = request.json or {}
    if not isinstance(data, dict):
        return jsonify({"error": "invalid payload"}), 400
    data.setdefault("ts", int(time.time()))
    TRACK_BUFFER.append(data)
    # limit memory
    if len(TRACK_BUFFER) > 500:
        del TRACK_BUFFER[: len(TRACK_BUFFER) - 500]
    return jsonify({"ok": True, "saved": data}), 200


@app.route("/api/track/sample", methods=["POST"])
def track_sample():
    # Generate demo wearable-like values
    ts = int(time.time())
    sample = {
        "ts": ts,
        "heart_rate": int(np.random.normal(76, 6)),
        "steps": int(max(0, np.random.normal(6000, 1500))),
        "sleep_hours": float(max(0.0, np.random.normal(7.0, 1.0)))
    }
    TRACK_BUFFER.append(sample)
    if len(TRACK_BUFFER) > 500:
        del TRACK_BUFFER[: len(TRACK_BUFFER) - 500]
    return jsonify({"ok": True, "saved": sample}), 200


@app.route("/api/track/series", methods=["GET"])
def track_series():
    # Return entire in-memory series
    return jsonify({"series": TRACK_BUFFER}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)



