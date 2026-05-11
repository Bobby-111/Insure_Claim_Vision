# 🚗 InsureClaim Vision

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blue)](https://ai.google.dev/)
[![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20|%20React%20|%20OpenCV-green)]()

**InsureClaim Vision** is an end-to-end, AI-powered motor insurance intelligence platform. It leverages **Google Gemini Vision AI** and **OpenCV** to automate vehicle damage assessment, transforming raw images into itemized repair estimates and instant claim decisions in seconds.

---

## 🚀 The Vision-to-Invoice Pipeline

Traditional insurance claims take days of manual inspection. InsureClaim Vision reduces this to seconds:
1. **Visual Reasoning:** Gemini Vision AI identifies damaged parts and assesses deformation severity.
2. **OpenCV Heatmapping:** Gradient-based analysis highlights damage clusters for human auditors.
3. **Dynamic Pricing:** A specialized engine calculates parts, labor, and GST based on severity.
4. **Instant Decisioning:** Automated logic flags fraud risk and provides pre-approval status.

---

## ✨ Key Features

| Feature | Technical Implementation |
|:---|:---|
| 🧠 **Gemini Vision AI** | Multi-image visual reasoning using Gemini 2.5 Flash for part identification. |
| 🔥 **Damage Heatmaps** | OpenCV gradient-processing to visualize impact intensity. |
| 🎯 **Detection Overlays** | Bounding boxes and confidence labels rendered via Canvas API. |
| 📋 **Intelligent Estimation** | Dynamic calculation of Repair vs. Replace costs + GST/Labour. |
| ✅ **Automated Approval** | Threshold-based logic for instant claim classification (Approved/Flagged). |
| 📄 **Professional PDF Export** | Auto-generated, download-ready claim invoices using `jsPDF`. |
| 🌙 **Next-Gen UI** | Dark-mode, glassmorphic dashboard built with React & Tailwind CSS. |

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend_Layer ["Frontend Layer: User Interaction"]
        UI["React Claim Dashboard"]
        Upload["Image Upload Interface"]
        Vis["Visualization Layer (Heatmaps/Overlays)"]
        PDF["PDF Report Generator"]
    end

    subgraph API_Layer ["API Layer: Orchestration"]
        FastAPI["FastAPI Gateway"]
        Val["Request Validation (Pydantic)"]
        Orch["Inference Orchestrator"]
    end

    subgraph AI_Processing_Layer ["AI Processing Layer: Intelligence"]
        Gemini["Vision AI Analysis (Gemini 2.5 Flash)"]
        OpenCV["Computer Vision (OpenCV Heatmaps)"]
        Price["Claim Estimation Engine"]
        Logic["Approval Decision Engine"]
    end

    subgraph Output_Layer ["Output Layer: Data Delivery"]
        JSON["Structured Claim Data"]
        HMap["Heatmap Visualization"]
        Overlay["Detection Overlay"]
        Invoice["PDF Invoice"]
    end

    %% Data Flow
    Upload -->|"Multipart Images"| FastAPI
    FastAPI --> Val
    Val --> Orch
    Orch --> Gemini
    Orch --> OpenCV
    
    Gemini --> Price
    OpenCV --> HMap
    Price --> Logic
    
    Logic --> JSON
    JSON --> UI
    HMap --> Vis
    Overlay --> Vis
    UI --> PDF
    PDF --> Invoice

```

---

## 🛠️ Tech Stack

* **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons.
* **Backend:** Python 3.10+, FastAPI, Uvicorn.
* **Computer Vision:** OpenCV (cv2), NumPy, PIL.
* **AI/LLM:** Google Generative AI (Gemini 2.5 Flash).
* **Reporting:** jsPDF, AutoTable.

---

## 📂 Project Structure

```text
motor-claim-estimator/
├── 📂 backend/               # Python FastAPI Services
│   ├── main.py               # Server entry & routing
│   ├── cv_processor.py       # OpenCV Heatmap generation
│   ├── llm_agent.py          # Gemini Vision integration
│   ├── pricing_service.py    # Repair cost logic
│   └── models.py             # Pydantic schemas
├── 📂 frontend/              # React Application
│   ├── 📂 src/pages/         # Landing & Estimator Views
│   └── 📂 src/components/    # UI Modules (Heatmap, Overlays)
└── README.md

```

---

## 🚀 Installation & Setup

### 1. Prerequisites

* Python 3.10+ & Node.js 18+
* [Google AI Studio API Key](https://aistudio.google.com/)

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
# Create .env and add: GEMINI_API_KEY=your_key_here
python main.py

```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev

```

*Access the dashboard at `http://localhost:5173*`

---

## 📸 Screenshots

---<img width="1440" height="778" alt="Screenshot 2026-05-11 at 6 58 30 AM" src="https://github.com/user-attachments/assets/07dad5ce-5373-440f-bdc4-0ba05907f286" />
<img width="1440" height="777" alt="Screenshot 2026-05-11 at 7 06 48 AM" src="https://github.com/user-attachments/assets/ce6dd639-c827-49b3-a99e-e89f917fab6b" />
<img width="1440" height="777" alt="Screenshot 2026-05-11 at 7 06 31 AM" src="https://github.com/user-attachments/assets/96fc4353-8dd5-4c36-b160-dd35739de138" />
<img width="1440" height="778" alt="Screenshot 2026-05-11 at 7 07 01 AM" src="https://github.com/user-attachments/assets/804c5f43-0692-470b-b0fb-3bbefee88a8f" />


## 🔮 Future Roadmap

* [ ] **Fraud Detection:** Cross-referencing damage with historical claim data.
* [ ] **Severity Segmentation:** Pixel-perfect damage masks using SAM (Segment Anything Model).
* [ ] **Mobile Integration:** Dedicated iOS/Android app for on-site field agents.
* [ ] **Multi-Agent Workflow:** AI agents for automated communication with workshops.

---

## 👨‍💻 Author

**Bharath Chilaka**
*AI Engineer specializing in Computer Vision and Intelligent Automation Platforms.*

---

## ⚠️ Disclaimer

This platform is for **educational and demonstration purposes**. All AI-generated estimates must be verified by a licensed insurance surveyor before actual settlement.

---

**Built for the future of automated insurance intelligence.**
