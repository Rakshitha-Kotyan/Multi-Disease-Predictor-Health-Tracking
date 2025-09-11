import streamlit as st
import joblib
import pandas as pd
import numpy as np

st.set_page_config(
    page_title="Health Assist • Symptom to Disease Predictor",
    page_icon="🩺",
    layout="wide",
)

# ----------------------------
# Data/model loaders (cached)
# ----------------------------
@st.cache_resource
def load_model_and_encoder():
    model_loaded = joblib.load("models/symptom_disease_model.pkl")
    mlb_loaded = joblib.load("models/mlb.pkl")
    return model_loaded, mlb_loaded

@st.cache_data
def load_descriptions():
    df = pd.read_csv("data/symptom_Description.csv")
    return dict(zip(df["Disease"], df["Description"]))

@st.cache_data
def load_precautions():
    df = pd.read_csv("data/symptom_precaution.csv")
    df = df.fillna("")
    # bring to dictionary mapping disease -> list of precautions
    precautions = {}
    for _, row in df.iterrows():
        disease = row["Disease"]
        items = [
            str(row.get("Precaution_1", "")).strip(),
            str(row.get("Precaution_2", "")).strip(),
            str(row.get("Precaution_3", "")).strip(),
            str(row.get("Precaution_4", "")).strip(),
        ]
        precautions[disease] = [p for p in items if p]
    return precautions

@st.cache_data
def load_symptom_severity():
    df = pd.read_csv("data/Symptom-severity.csv")
    df["Symptom"] = df["Symptom"].astype(str)
    return dict(zip(df["Symptom"], df["weight"]))

# Load all assets
model, mlb = load_model_and_encoder()
disease_descriptions = load_descriptions()
disease_precautions = load_precautions()
symptom_severity = load_symptom_severity()

# ----------------------------
# Sidebar & Header
# ----------------------------
st.markdown("## 🩺 Health Assist")
st.caption("Interactive symptom checker with disease insights, severity, and precautions.")

with st.sidebar:
    st.header("Your Profile")
    colA, colB = st.columns(2)
    with colA:
        age = st.number_input("Age", min_value=0, max_value=120, value=30)
    with colB:
        sex = st.selectbox("Sex", ["Prefer not to say", "Female", "Male", "Other"], index=0)
    st.divider()
    st.subheader("How to use")
    st.markdown("- Search and select symptoms\n- View severity and predicted diseases\n- Read descriptions and precautions")
    st.divider()
    st.caption("Models: RandomForestClassifier • MultiLabelBinarizer")

# ----------------------------
# Symptom selection
# ----------------------------
all_symptoms = list(mlb.classes_)

selected_symptoms = st.multiselect(
    "Select your symptoms",
    options=all_symptoms,
    default=[],
    help="Start typing to filter."
)

# Severity summary
def compute_severity(symptoms):
    weights = [symptom_severity.get(s, 0) for s in symptoms]
    return int(np.sum(weights)), list(zip(symptoms, weights))

severity_total, severity_breakdown = compute_severity(selected_symptoms)

col1, col2 = st.columns([1, 2])
with col1:
    st.metric("Reported symptoms", len(selected_symptoms))
    st.metric("Severity score", severity_total)
with col2:
    if severity_breakdown:
        sev_df = pd.DataFrame(severity_breakdown, columns=["Symptom", "Weight"]).sort_values("Weight", ascending=False)
        st.bar_chart(sev_df.set_index("Symptom"))

st.divider()

# ----------------------------
# Prediction
# ----------------------------
colL, colR = st.columns([2, 1])
with colR:
    top_k = st.slider("Top N predictions", min_value=1, max_value=5, value=3)

predict_clicked = st.button("🔮 Predict")

if predict_clicked:
    if not selected_symptoms:
        st.warning("Please select at least one symptom.")
    else:
        input_data = mlb.transform([selected_symptoms])
        try:
            proba = model.predict_proba(input_data)[0]
            classes = getattr(model, "classes_", None)
            if classes is None:
                # Fallback if classes_ missing
                classes = np.unique(model.predict(input_data))
        except Exception:
            # If model doesn't support predict_proba
            pred = model.predict(input_data)
            classes = np.array([pred[0]])
            proba = np.array([1.0])

        # Rank top-k
        order = np.argsort(proba)[::-1]
        top_indices = order[:top_k]
        top_diseases = [(str(classes[i]), float(proba[i])) for i in top_indices]

        st.subheader("Results")
        primary_disease, primary_score = top_diseases[0]

        # Primary card
        st.success(f"Predicted: {primary_disease}  •  Confidence: {primary_score:.2%}")
        st.write(disease_descriptions.get(primary_disease, "Description not available."))

        # Precautions
        precautions = disease_precautions.get(primary_disease, [])
        if precautions:
            st.markdown("**Recommended precautions:**")
            for p in precautions:
                st.markdown(f"- {p}")

        # Alternative predictions table
        if len(top_diseases) > 1:
            st.markdown("**Other possible conditions:**")
            alt_df = pd.DataFrame(top_diseases[1:], columns=["Disease", "Confidence"]) \
                .assign(Confidence=lambda d: (d["Confidence"] * 100).round(2))
            st.dataframe(alt_df, hide_index=True, use_container_width=True)

        # Simple report download
        report_lines = [
            "Health Assist • Prediction Report",
            "",
            f"Age: {age}  |  Sex: {sex}",
            f"Symptoms: {', '.join(selected_symptoms)}",
            f"Severity score: {severity_total}",
            "",
            f"Primary prediction: {primary_disease} ({primary_score:.2%})",
            f"Description: {disease_descriptions.get(primary_disease, 'N/A')}",
        ]
        if precautions:
            report_lines.append("Precautions:")
            report_lines.extend([f"- {p}" for p in precautions])
        report_text = "\n".join(report_lines)
        st.download_button(
            label="Download report",
            data=report_text,
            file_name="health_assist_report.txt",
            mime="text/plain",
        )