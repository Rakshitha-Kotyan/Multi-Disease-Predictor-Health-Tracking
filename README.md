## Health Assist – Multi-disease Predictor & Health Tracker

### Prerequisites
- Python 3.9+
- pip

### Install dependencies
```
pip install -r requirements.txt
```

### Run the app (Flask + JS frontend)
```
python server.py
```

### Open in browser
- Home: `http://localhost:5000`
- Health Predictor: `http://localhost:5000/predict`
- Tracking: `http://localhost:5000/track`
- About: `http://localhost:5000/about`
- Login: `http://localhost:5000/login`
- Contact: `http://localhost:5000/contact`

### Notes
- Models and data are loaded server-side from `models/` and `data/`.
- Endpoints:
  - GET `/api/symptoms` → list of symptoms
  - POST `/api/predict` → predictions for selected symptoms
  - POST `/api/track` → demo endpoint to echo health metrics

