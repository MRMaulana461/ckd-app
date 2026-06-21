# CKD Digital Twin — Policy Simulator & Patient Risk Predictor

A Chronic Kidney Disease (CKD) decision-support system combining:

- A trained CKD risk model (binary classifier: `ckd` / `notckd`)
- A population-level policy scenario simulator (4 scenarios)
- A manual single-patient risk & cost predictor
- A patient-level intervention "what-if" simulator
- A Cost of Inaction calculator
- An optional Hugging Face LLM narrative layer

the exact formula, stage cost table, and comorbidity multipliers are also
shown live in the dashboard's **Cost Formula Reference** panel.

---

## Architecture

```
Population CSV  ──┐
                  ▼
            CKD Risk Model (model.pkl)
                  │
                  ▼
         Probability → Stage Proxy (7 stages)
                  │
                  ▼
              Cost Engine 
                  │
        ┌─────────┼─────────┐
        ▼                   ▼
   Policy Sim              Single    
   (4 scenarios)           Patient   
        │                 Predictor
        ▼
  Cost of Inaction Calculator
        │
        ▼
  AI Policy Insights (optional LLM)
```

```
ckd-app/
├── backend/         Flask API + model inference + cost engine
└── frontend/        React dashboard (Vite)
```

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- Your trained model artifacts:
  `model.pkl`, `scaler.pkl`, `label_encoders.pkl`, `target_encoder.pkl`,
  `feature_columns.pkl`, `numeric_cols.pkl`, `training_dataset.csv`

---

## 1. Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Copy the env template and fill in your Hugging Face key (optional):

```bash
cp .env.example .env      # macOS/Linux
copy .env.example .env    # Windows
```

```env
HF_API_KEY=hf_your_token_here
HF_MODEL_ID=mistralai/Mistral-7B-Instruct-v0.3
```

Leave `HF_API_KEY` blank to run without it — the LLM endpoints fall back
to a templated summary built from real numbers instead of failing.

### Add your model artifacts

Place these 7 files into `backend/artifacts/`:

```
model.pkl
scaler.pkl
label_encoders.pkl
target_encoder.pkl
feature_columns.pkl
numeric_cols.pkl
training_dataset.csv
```

### Run it

```bash
python app.py
```

Server starts at `http://localhost:5000`. Check `http://localhost:5000/health`
— `model_artifacts_loaded` should be `true`.

---

## 2. Frontend setup

Open a **second terminal** (keep the backend running):

```bash
cd frontend
npm install
cp .env.example .env      # macOS/Linux
copy .env.example .env    # Windows
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Using the dashboard

**Policy Dashboard** (left sidebar) — pick one of 4 scenarios and click
*Run simulation*:

| Scenario | Effect modeled |
|---|---|
| Current Policy | Baseline — model's raw output, no adjustment |
| Enhanced Screening | Shifts predicted probability down → more patients land in early, cheaper stages |
| Screening + Diabetes Management | Same screening effect + reduced diabetes-attributable cost |
| Do Nothing | Shifts predicted probability up → worse simulated outcomes |

Each scenario re-runs the real model across the entire population CSV —
nothing here is a static lookup table.

**Single Patient Predictor** — enter one patient's clinical values to get
CKD probability, stage proxy, and annual cost breakdown.

**Patient Intervention Simulator** — same patient form, but lets you toggle
interventions (control hypertension, control diabetes, improve edema,
improve BP/urea by 10%) and compares before vs. after.

**Cost of Inaction Calculator** — shows, in dollars/year, how much the
active scenario saves (or costs extra) compared to "Do Nothing".

**Cost Formula Reference** — the exact formula and stage cost table used
for every dollar figure on screen, with notes on what was intentionally
omitted from the source PDF and why.

---

## API reference

All responses follow:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "message": "...", "field": "..." } }
```

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Server/artifact/LLM status |
| `/predict` | POST | Single patient prediction + cost |
| `/simulate-dataset` | POST | Bulk CSV population simulation |
| `/simulate-scenario` | POST | Patient before/after intervention comparison |
| `/policy-simulation` | POST | Population policy scenario (body: `{"scenario": "current_policy"}`) |
| `/policy-scenarios` | GET | List of the 4 scenarios + their effect factors |
| `/cost-formula-reference` | GET | The cost formula, stage table, multipliers |
| `/llm/recommendation` | POST | LLM narrative for a policy result |
| `/llm/patient-summary` | POST | LLM narrative for a patient result |

### Example: predict one patient

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "Age": 58, "Blood_Pressure": 90, "Specific_Gravity": 1.02, "Albumin": 2,
    "Sugar": 1, "Blood_Urea": 68, "Sodium": 136, "Potassium": 4.8,
    "Packed_Cell_Volume": 35, "White_Blood_Cell_Count": 9200,
    "Red_Blood_Cell_Count": 4.1, "Hypertension": "yes",
    "Diabetes_Mellitus": "yes", "Appetite": "poor", "Pedal_Edema": "yes",
    "Coronary_Artery_Disease": "yes"
  }'
```

### Example: run a policy scenario

```bash
curl -X POST http://localhost:5000/policy-simulation \
  -H "Content-Type: application/json" \
  -d '{"scenario": "enhanced_screening"}'
```

---

## Cost formula

```
Annual CKD Cost = C_stage + C_diabetes + C_HTN + C_CVD
```

| Term | Value |
|---|---|
| `C_stage` | Looked up from the stage cost table below |
| `C_diabetes` | `0.15 × C_stage` if patient has diabetes |
| `C_HTN` | `0.10 × C_stage` if patient has hypertension |
| `C_CVD` | `0.30 × C_stage` if patient has coronary artery disease |

| CKD Stage | Annual Cost (USD) |
|---|---|
| Stage 1 | $3,000 |
| Stage 2 | $5,000 |
| Stage 3a | $12,000 |
| Stage 3b | $20,000 |
| Stage 4 | $35,000 |
| Stage 5 (Pre-Dialysis) | $50,000 |
| Stage 5 + Dialysis | $90,000 |

`C_hospital` is intentionally omitted (the source PDF references it but
provides no value). `C_dialysis` is not added separately — it is already
the $40,000 gap between "Stage 5 (Pre-Dialysis)" and "Stage 5 + Dialysis".

The underlying model is **binary** (`ckd` / `notckd`) and does not predict
clinical stage directly. The 7-stage breakdown is a probability-bucket
proxy used only to look up a cost — not a diagnosed stage.

---

## Project structure

```
backend/
├── app.py                       Flask routes
├── config.py                    Thresholds, cost table, scenario definitions
├── requirements.txt
├── .env.example
├── artifacts/                   ← put your model files + CSV here
└── services/
    ├── preprocessing_service.py
    ├── model_service.py
    ├── risk_service.py          Probability → stage → risk bucket
    ├── cost_service.py          PDF cost formula
    ├── prediction_pipeline.py   Wires preprocessing+model+risk+cost together
    ├── scenario_service.py      Patient intervention simulator
    ├── simulation_service.py    CSV population simulation
    ├── policy_service.py        4 policy scenarios + Cost of Inaction
    └── llm_service.py           Hugging Face integration (stub-safe)

frontend/
└── src/
    ├── App.jsx
    ├── api/client.js
    ├── components/
    ├── hooks/
    └── utils/
```

## Notes & limitations

- The model only predicts binary CKD status; stage and risk bucket are
  derived heuristics for cost simulation, not clinical diagnoses.
- Cost figures are simulation outputs, not real medical bills.
- Policy scenario effects (probability shift, diabetes management factor)
  are heuristic assumptions, not from the source cost PDF.
- LLM output is narrative explanation only and never overrides the model's
  prediction.
