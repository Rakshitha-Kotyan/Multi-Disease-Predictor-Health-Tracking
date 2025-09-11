import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib

# Load dataset
df = pd.read_csv("data/dataset.csv")

# Combine all symptom columns into a list
symptom_cols = [col for col in df.columns if col != "Disease"]
df["Symptoms"] = df[symptom_cols].apply(lambda x: [str(i).strip() for i in x if pd.notna(i)], axis=1)

# Encode symptoms
mlb = MultiLabelBinarizer()
X = mlb.fit_transform(df["Symptoms"])

# Target variable
y = df["Disease"]

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Save model and encoder
joblib.dump(model, "models/symptom_disease_model.pkl")
joblib.dump(mlb, "models/mlb.pkl")

print("Model trained and saved successfully!")