# 🚗 InsureClaim Vision — AI-Powered Motor Claim Estimator

An intelligent, full-stack motor insurance claim estimator that uses **Google Gemini Vision AI** and **OpenCV** to instantly assess vehicle damage from photos, generate an itemized repair estimate, and decide on pre-approval — all in seconds.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 **Gemini Vision AI** | Analyses uploaded vehicle images to identify damaged parts and severity |
| 🔥 **Damage Heatmap** | OpenCV-powered gradient overlay visualizing damage regions |
| 🎯 **Detection Overlay** | Bounding boxes with part labels rendered on the original image |
| 📋 **Invoice Estimate** | Itemized repair cost breakdown with GST, labour, and material costs |
| ✅ **Auto-Approval Logic** | Instantly pre-approves or flags claims based on a configurable threshold |
| 🔴 **Declined Detection** | Red badge with X-mark for undamaged / invalidated claims |
| 📄 **PDF Export** | Professional invoice-style PDF using jsPDF + autotable |
| 🌙 **Dark Theme UI** | Glassmorphic dark-mode frontend built with React + Tailwind CSS |
| 🎬 **Cinematic Landing** | Hero video background with scroll-linked fade animation |

---

## 🏗️ Architecture

```
motor-claim-estimator/
├── backend/              # Python FastAPI backend
│   ├── main.py           # API entrypoint
│   ├── cv_processor.py   # OpenCV heatmap + damage region detection
│   ├── detector.py       # Part detection logic
│   ├── llm_agent.py      # Gemini 2.5 Flash integration + fallback
│   ├── pricing_service.py# Cost estimation engine
│   └── models.py         # Pydantic data models
│
└── frontend/             # React + TypeScript frontend
    └── src/
        ├── pages/
        │   ├── LandingPage.tsx      # Hero + marketing page
        │   └── EstimatorPage.tsx    # Main claim analysis UI
        └── components/
            ├── ImageUploader.tsx    # Drag-and-drop image input
            ├── PipelineTracker.tsx  # Analysis step progress
            ├── HeatmapViewer.tsx    # Damage heatmap display
            ├── DetectionOverlay.tsx # Canvas bounding boxes
            ├── EstimatePanel.tsx    # Invoice table + PDF export
            └── ApprovalBadge.tsx   # Claim decision indicator
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API key

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your GEMINI_API_KEY to .env
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🔧 Tech Stack

**Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, jsPDF  
**Backend:** FastAPI, Python, OpenCV, NumPy, Google Generative AI  
**AI:** Gemini 2.5 Flash (vision + reasoning), OpenCV gradient heatmaps

---

## 📸 How It Works

1. Upload 1–4 photos of the damaged vehicle
2. The backend runs **OpenCV** to generate a damage heatmap
3. **Gemini Vision** identifies damaged parts and assesses severity
4. The **pricing engine** calculates repair vs. replace costs with GST
5. The **approval engine** auto-approves or flags the claim
6. Download the result as a professional **PDF invoice**

---

## ⚠️ Disclaimer

This is a computer-generated AI estimate for demonstration purposes. All assessments are subject to licensed surveyor verification before settlement.

---

*Built with ❤️ for the future of insurance automation.*
