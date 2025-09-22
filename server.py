from flask import Flask, jsonify, request, send_from_directory, redirect, session, url_for
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import os
import time
import requests
import secrets
import hashlib


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
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

MODEL, MLB, D2DESC, D2PRE = load_assets()
# Per-user in-memory demo store: { user_id: [ { ..data.. } ] }
TRACK_STORE = {}

# OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', 'your-google-client-id')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', 'your-google-client-secret')
FACEBOOK_APP_ID = os.environ.get('FACEBOOK_APP_ID', 'your-facebook-app-id')
FACEBOOK_APP_SECRET = os.environ.get('FACEBOOK_APP_SECRET', 'your-facebook-app-secret')

# OAuth URLs
GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
FACEBOOK_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth'
FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token'
FACEBOOK_USER_INFO_URL = 'https://graph.facebook.com/v18.0/me'


# OAuth Helper Functions
def generate_state():
    return secrets.token_urlsafe(32)

def get_redirect_uri():
    return request.url_root + 'oauth/callback'

# OAuth Routes
@app.route("/oauth/google")
def google_login():
    state = generate_state()
    session['oauth_state'] = state
    
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': get_redirect_uri(),
        'scope': 'openid email profile',
        'response_type': 'code',
        'state': state
    }
    
    auth_url = GOOGLE_AUTH_URL + '?' + '&'.join([f'{k}={v}' for k, v in params.items()])
    return redirect(auth_url)

@app.route("/oauth/facebook")
def facebook_login():
    state = generate_state()
    session['oauth_state'] = state
    
    params = {
        'client_id': FACEBOOK_APP_ID,
        'redirect_uri': get_redirect_uri(),
        'scope': 'email',
        'response_type': 'code',
        'state': state
    }
    
    auth_url = FACEBOOK_AUTH_URL + '?' + '&'.join([f'{k}={v}' for k, v in params.items()])
    return redirect(auth_url)

@app.route("/oauth/callback")
def oauth_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    if error:
        return jsonify({'error': f'OAuth error: {error}'}), 400
    
    if not code or not state or state != session.get('oauth_state'):
        return jsonify({'error': 'Invalid state parameter'}), 400
    
    # Determine provider from referer or state
    provider = 'google'  # Default to google, can be enhanced
    
    try:
        if provider == 'google':
            # Exchange code for token
            token_data = {
                'client_id': GOOGLE_CLIENT_ID,
                'client_secret': GOOGLE_CLIENT_SECRET,
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': get_redirect_uri()
            }
            
            token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)
            token_json = token_response.json()
            
            if 'access_token' not in token_json:
                return jsonify({'error': 'Failed to get access token'}), 400
            
            # Get user info
            user_response = requests.get(
                GOOGLE_USER_INFO_URL,
                headers={'Authorization': f'Bearer {token_json["access_token"]}'}
            )
            user_info = user_response.json()
            
            # Create user object
            user = {
                'id': user_info['id'],
                'email': user_info['email'],
                'name': user_info.get('name', user_info['email'].split('@')[0]),
                'provider': 'google',
                'picture': user_info.get('picture', '')
            }
            
        elif provider == 'facebook':
            # Exchange code for token
            token_data = {
                'client_id': FACEBOOK_APP_ID,
                'client_secret': FACEBOOK_APP_SECRET,
                'code': code,
                'redirect_uri': get_redirect_uri()
            }
            
            token_response = requests.get(FACEBOOK_TOKEN_URL, params=token_data)
            token_json = token_response.json()
            
            if 'access_token' not in token_json:
                return jsonify({'error': 'Failed to get access token'}), 400
            
            # Get user info
            user_response = requests.get(
                FACEBOOK_USER_INFO_URL,
                params={
                    'access_token': token_json['access_token'],
                    'fields': 'id,name,email,picture'
                }
            )
            user_info = user_response.json()
            
            # Create user object
            user = {
                'id': user_info['id'],
                'email': user_info.get('email', f"{user_info['id']}@facebook.com"),
                'name': user_info.get('name', user_info['id']),
                'provider': 'facebook',
                'picture': user_info.get('picture', {}).get('data', {}).get('url', '')
            }
        
        # Store user in session
        session['user'] = user
        
        # Redirect to frontend with success
        return redirect('/?oauth=success')
        
    except Exception as e:
        return jsonify({'error': f'OAuth callback error: {str(e)}'}), 500

@app.route("/api/user")
def get_current_user():
    user = session.get('user')
    if user:
        return jsonify(user)
    return jsonify({'error': 'Not authenticated'}), 401

@app.route("/api/logout")
def logout():
    session.pop('user', None)
    return jsonify({'message': 'Logged out successfully'})

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
    user_id = request.headers.get("X-User-Id") or request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "missing user id"}), 401
    data = request.json or {}
    if not isinstance(data, dict):
        return jsonify({"error": "invalid payload"}), 400
    data.setdefault("ts", int(time.time()))
    series = TRACK_STORE.setdefault(user_id, [])
    series.append(data)
    # limit memory per user
    if len(series) > 500:
        del series[: len(series) - 500]
    return jsonify({"ok": True, "saved": data}), 200


@app.route("/api/track/sample", methods=["POST"])
def track_sample():
    user_id = request.headers.get("X-User-Id") or request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "missing user id"}), 401
    # Generate demo wearable-like values
    ts = int(time.time())
    sample = {
        "ts": ts,
        "heart_rate": int(np.random.normal(76, 6)),
        "steps": int(max(0, np.random.normal(6000, 1500))),
        "sleep_hours": float(max(0.0, np.random.normal(7.0, 1.0)))
    }
    series = TRACK_STORE.setdefault(user_id, [])
    series.append(sample)
    if len(series) > 500:
        del series[: len(series) - 500]
    return jsonify({"ok": True, "saved": sample}), 200


@app.route("/api/track/series", methods=["GET"])
def track_series():
    user_id = request.headers.get("X-User-Id") or request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "missing user id"}), 401
    # Return user's in-memory series
    return jsonify({"series": TRACK_STORE.get(user_id, [])}), 200


@app.route("/api/track/clear", methods=["POST"])
def track_clear():
    user_id = request.headers.get("X-User-Id") or request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "missing user id"}), 401
    TRACK_STORE[user_id] = []
    return jsonify({"ok": True, "cleared": user_id}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)



