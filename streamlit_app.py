"""
DiagnoAI — Streamlit Frontend
Calls the FastAPI backend (uvicorn app.main:app) at localhost:8000
"""

import base64
import io
import streamlit as st
import requests
from PIL import Image

# ──────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────
BACKEND_URL = "http://localhost:8000"

st.set_page_config(
    page_title="DiagnoAI",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ──────────────────────────────────────────
# Custom CSS — dark medical theme
# ──────────────────────────────────────────
st.markdown("""
<style>
    /* Main background */
    .stApp { background-color: #0f172a; color: #e2e8f0; }

    /* Sidebar */
    [data-testid="stSidebar"] { background-color: #1e293b; }

    /* Cards */
    .diag-card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
    }

    /* Severity badges */
    .badge-normal   { background:#166534; color:#bbf7d0; padding:3px 10px; border-radius:12px; font-size:13px; font-weight:600; }
    .badge-low      { background:#1e3a5f; color:#bfdbfe; padding:3px 10px; border-radius:12px; font-size:13px; font-weight:600; }
    .badge-moderate { background:#854d0e; color:#fef08a; padding:3px 10px; border-radius:12px; font-size:13px; font-weight:600; }
    .badge-high     { background:#7c2d12; color:#fed7aa; padding:3px 10px; border-radius:12px; font-size:13px; font-weight:600; }
    .badge-critical { background:#7f1d1d; color:#fecaca; padding:3px 10px; border-radius:12px; font-size:13px; font-weight:600; }

    /* Section headers */
    .section-header {
        font-size: 18px;
        font-weight: 700;
        color: #38bdf8;
        margin-bottom: 12px;
        border-bottom: 1px solid #334155;
        padding-bottom: 8px;
    }

    /* Metric numbers */
    [data-testid="stMetricValue"] { color: #38bdf8 !important; font-size: 28px !important; }

    /* Progress bars */
    .stProgress > div > div { background-color: #38bdf8; }

    /* Buttons */
    .stButton > button {
        background: linear-gradient(135deg, #0ea5e9, #6366f1);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        padding: 10px 24px;
    }
    .stButton > button:hover { opacity: 0.9; transform: translateY(-1px); }

    /* Hide Streamlit branding */
    #MainMenu, footer { visibility: hidden; }
</style>
""", unsafe_allow_html=True)


# ──────────────────────────────────────────
# Sidebar Navigation
# ──────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🏥 DiagnoAI")
    st.markdown("*AI-Powered Medical Diagnostics*")
    st.divider()

    page = st.radio(
        "Navigate",
        ["🫁 X-Ray Analysis", "🧪 Lab Report Analysis"],
        label_visibility="collapsed"
    )

    st.divider()
    st.markdown("### ℹ️ About")
    st.markdown("""
    DiagnoAI uses state-of-the-art AI models to analyze:
    - **Chest X-Rays** — 18 pathologies with Grad-CAM XAI
    - **Lab Reports** — CBC, LFT, KFT values
    """)

    st.divider()
    st.markdown("### ⚠️ Disclaimer")
    st.caption("For educational/research use only. Not a substitute for professional medical advice.")


# ══════════════════════════════════════════
# PAGE 1 — X-Ray Analysis
# ══════════════════════════════════════════
if "🫁 X-Ray Analysis" in page:

    st.markdown("# 🫁 Chest X-Ray Analysis")
    st.markdown("Upload a chest X-ray to detect pathologies using a DenseNet121 model trained on NIH ChestX-ray14 + CheXpert + MIMIC-CXR.")
    st.divider()

    # Upload section
    col_upload, col_info = st.columns([2, 1])

    with col_upload:
        uploaded_file = st.file_uploader(
            "Upload Chest X-Ray (JPG / PNG)",
            type=["jpg", "jpeg", "png"],
            key="xray_uploader"
        )

    with col_info:
        st.markdown("""
        <div class="diag-card">
        <b>✅ Supported:</b> Chest X-Rays<br><br>
        <b>🔬 Model:</b> DenseNet121<br>
        <b>📊 Pathologies:</b> 18<br>
        <b>🧠 XAI:</b> Grad-CAM heatmap<br>
        <b>🏥 Trained on:</b> NIH + CheXpert + MIMIC
        </div>
        """, unsafe_allow_html=True)

    if uploaded_file:
        img_bytes = uploaded_file.read()
        original_image = Image.open(io.BytesIO(img_bytes))

        st.markdown("---")
        col_btn, _ = st.columns([1, 3])
        with col_btn:
            analyze_btn = st.button("🔍 Analyze X-Ray", use_container_width=True)

        if analyze_btn:
            with st.spinner("Running AI analysis + Grad-CAM... (first run loads model, may take ~30s)"):
                try:
                    response = requests.post(
                        f"{BACKEND_URL}/api/xray/analyze",
                        files={"file": (uploaded_file.name, img_bytes, "image/jpeg")},
                        data={"xray_type": "chest"},
                        timeout=120
                    )
                    response.raise_for_status()
                    result = response.json()
                except requests.exceptions.ConnectionError:
                    st.error("❌ Cannot connect to backend. Make sure FastAPI is running:\n```\nuvicorn app.main:app --reload\n```")
                    st.stop()
                except Exception as e:
                    st.error(f"❌ Analysis failed: {e}")
                    st.stop()

            # ── Summary Banner ──
            prediction = result.get("prediction", "Unknown")
            confidence = result.get("confidence", 0) * 100
            region     = result.get("region", "N/A")
            is_normal  = prediction == "Normal"

            if is_normal:
                st.success(f"✅ **Normal / No Significant Findings** — Confidence: {confidence:.1f}%")
            else:
                st.error(f"⚠️ **{prediction} Detected** — Confidence: {confidence:.1f}% | Region: {region}")

            st.divider()

            # ── Image Columns: Original + Heatmap ──
            col_orig, col_heat = st.columns(2)

            with col_orig:
                st.markdown('<div class="section-header">📷 Original X-Ray</div>', unsafe_allow_html=True)
                st.image(original_image, use_container_width=True)

            with col_heat:
                st.markdown('<div class="section-header">🌡️ Grad-CAM Heatmap</div>', unsafe_allow_html=True)
                heatmap_b64 = result.get("heatmap_b64") or result.get("heatmap_base64")
                if heatmap_b64:
                    heatmap_bytes = base64.b64decode(heatmap_b64)
                    heatmap_img   = Image.open(io.BytesIO(heatmap_bytes))
                    st.image(heatmap_img, use_container_width=True)
                    st.caption("🔵 Blue = Low activation → 🔴 Red = High activation (model focus area)")
                elif is_normal:
                    st.info("No heatmap generated for normal findings — no focal activation region.")
                else:
                    st.warning("Heatmap unavailable.")

            st.divider()

            # ── Findings Table ──
            findings = result.get("findings", [])
            if findings:
                st.markdown('<div class="section-header">📋 All Detected Findings</div>', unsafe_allow_html=True)

                SEVERITY_COLOR = {
                    "normal":   ("🟢", "badge-normal"),
                    "low":      ("🔵", "badge-low"),
                    "moderate": ("🟡", "badge-moderate"),
                    "high":     ("🟠", "badge-high"),
                    "critical": ("🔴", "badge-critical"),
                }

                for finding in findings:
                    name     = finding.get("name", "")
                    conf     = finding.get("confidence", 0) * 100
                    severity = finding.get("severity", "moderate")
                    emoji, badge = SEVERITY_COLOR.get(severity, ("⚪", "badge-moderate"))

                    cols = st.columns([3, 5, 2])
                    with cols[0]:
                        st.write(f"**{name}**")
                    with cols[1]:
                        st.progress(conf / 100)
                    with cols[2]:
                        st.markdown(f'<span class="{badge}">{emoji} {severity.title()} {conf:.1f}%</span>', unsafe_allow_html=True)

                st.divider()

            # ── XAI Explanation Cards ──
            xai_details = result.get("xai_details", {})
            if xai_details and not is_normal:
                st.markdown('<div class="section-header">🧠 Explainability — Why This Result?</div>', unsafe_allow_html=True)
                st.caption("Each expander explains what the AI detected. Powered by Grad-CAM + Clinical Knowledge Base.")

                for condition, detail in xai_details.items():
                    if condition == "Normal":
                        continue
                    severity = detail.get("severity", "moderate")
                    conf_pct = detail.get("confidence_pct", 0)
                    with st.expander(f"🔬 **{condition}** — {severity.title()} ({conf_pct:.1f}% confidence)"):
                        c1, c2 = st.columns(2)
                        with c1:
                            st.markdown("**📍 Radiological Finding**")
                            st.info(detail.get("radiological_finding", ""))
                            st.markdown("**⚡ Visual Evidence (Grad-CAM)**")
                            st.info(detail.get("visual_evidence", ""))
                        with c2:
                            st.markdown("**🏥 Clinical Context**")
                            st.warning(detail.get("clinical_context", ""))
                            st.markdown("**💊 Recommendation**")
                            st.success(detail.get("recommendation", ""))

            elif is_normal:
                with st.expander("✅ Why Normal?"):
                    norm_xai = xai_details.get("Normal", {})
                    st.info(norm_xai.get("radiological_finding", "No significant acute cardiopulmonary abnormality detected."))
                    st.success(norm_xai.get("recommendation", "No acute pathology detected. Routine clinical follow-up recommended."))

            st.divider()

            # ── Probability Distribution ──
            st.markdown('<div class="section-header">📊 Probability Distribution (All 18 Pathologies)</div>', unsafe_allow_html=True)
            probs = result.get("probabilities", {})
            if probs:
                sorted_probs = sorted(probs.items(), key=lambda x: -x[1])
                col1, col2 = st.columns(2)
                half = len(sorted_probs) // 2
                for i, (name, prob) in enumerate(sorted_probs):
                    col = col1 if i < half else col2
                    with col:
                        c_name, c_bar, c_val = st.columns([3, 5, 2])
                        with c_name:
                            st.caption(name)
                        with c_bar:
                            st.progress(float(prob))
                        with c_val:
                            st.caption(f"{prob*100:.1f}%")

            st.divider()

            # ── Model Info Footer ──
            model_info = result.get("model_info", {})
            if model_info:
                st.markdown(f"""
                <div class="diag-card">
                <small>
                🤖 <b>Model:</b> {model_info.get('name','DenseNet121')} &nbsp;|&nbsp;
                📚 <b>Trained on:</b> {model_info.get('trained_on','NIH + CheXpert + MIMIC')} &nbsp;|&nbsp;
                🧠 <b>XAI Method:</b> {model_info.get('xai_method','Grad-CAM')} &nbsp;|&nbsp;
                📊 <b>Pathologies:</b> {model_info.get('pathologies_count', 18)}
                </small>
                </div>
                """, unsafe_allow_html=True)


# ══════════════════════════════════════════
# PAGE 2 — Lab Report Analysis
# ══════════════════════════════════════════
else:
    st.markdown("# 🧪 Lab Report Analysis")
    st.markdown("Enter lab values manually to get AI-powered analysis and interpretation.")
    st.divider()

    test_type = st.selectbox(
        "Select Test Type",
        ["cbc", "lft", "kft"],
        format_func=lambda x: {
            "cbc": "CBC — Complete Blood Count",
            "lft": "LFT — Liver Function Test",
            "kft": "KFT — Kidney Function Test"
        }[x]
    )

    st.markdown("### Enter Lab Values")

    # Dynamic input fields based on test type
    CBC_FIELDS  = ["wbc", "rbc", "hemoglobin", "hematocrit", "platelets", "neutrophils", "lymphocytes"]
    LFT_FIELDS  = ["bilirubin_total", "bilirubin_direct", "sgot_ast", "sgpt_alt", "alkaline_phosphatase", "albumin", "total_protein"]
    KFT_FIELDS  = ["creatinine", "bun", "uric_acid", "sodium", "potassium", "chloride", "bicarbonate"]

    FIELD_MAP = {"cbc": CBC_FIELDS, "lft": LFT_FIELDS, "kft": KFT_FIELDS}
    fields = FIELD_MAP[test_type]

    values = {}
    cols_per_row = 3
    for i in range(0, len(fields), cols_per_row):
        row_fields = fields[i:i+cols_per_row]
        row_cols   = st.columns(cols_per_row)
        for col, field in zip(row_cols, row_fields):
            with col:
                val = st.number_input(
                    field.replace("_", " ").title(),
                    min_value=0.0,
                    value=0.0,
                    step=0.1,
                    format="%.2f",
                    key=f"lab_{field}"
                )
                values[field] = val

    st.divider()
    analyze_btn = st.button("🔍 Analyze Lab Values", use_container_width=False)

    if analyze_btn:
        filled = {k: v for k, v in values.items() if v > 0}
        if not filled:
            st.warning("⚠️ Please enter at least one lab value.")
        else:
            with st.spinner("Analyzing lab values..."):
                try:
                    response = requests.post(
                        f"{BACKEND_URL}/api/lab/analyze-manual",
                        json={"test_type": test_type, "values": filled},
                        timeout=30
                    )
                    response.raise_for_status()
                    result = response.json()
                except requests.exceptions.ConnectionError:
                    st.error("❌ Cannot connect to backend. Make sure FastAPI is running.")
                    st.stop()
                except Exception as e:
                    st.error(f"❌ Analysis failed: {e}")
                    st.stop()

            # Display results
            overall = result.get("overall_status", "Unknown")
            if "normal" in overall.lower():
                st.success(f"✅ Overall: {overall}")
            else:
                st.warning(f"⚠️ Overall: {overall}")

            findings_list = result.get("findings", [])
            if findings_list:
                st.markdown("### 📋 Findings")
                for f in findings_list:
                    st.markdown(f"- {f}")

            recommendations = result.get("recommendations", [])
            if recommendations:
                st.markdown("### 💊 Recommendations")
                for r in recommendations:
                    st.info(r)
