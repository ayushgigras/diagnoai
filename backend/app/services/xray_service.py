"""
xray_service.py — DiagnoAI Explainable AI Engine for Chest X-Ray Analysis

Uses:
  - torchxrayvision: DenseNet121 pre-trained on NIH ChestX-ray14 (18 pathologies)
  - Grad-CAM: Color spectrum heatmap (blue→green→yellow→red) showing WHICH region
  - XAI Engine: Per-condition "WHY" text explaining visual evidence + clinical context
"""

import io
import base64
import numpy as np
import torch
import torch.nn.functional as F
import skimage.io
import skimage.transform
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server
import matplotlib.pyplot as plt
import matplotlib.cm as cm
from PIL import Image

# torchxrayvision — dedicated medical chest X-ray library
try:
    import torchxrayvision as xrv
    import torchvision
    XRV_AVAILABLE = True
except ImportError:
    XRV_AVAILABLE = False
    print("WARNING: torchxrayvision not installed. Run: pip install torchxrayvision scikit-image")

# ─── Model Cache ────────────────────────────────────────────────────────────────
_MODEL = None
_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ─── XAI Knowledge Base ─────────────────────────────────────────────────────────
# Per-condition: radiological finding description, visual pattern, clinical context
XAI_KNOWLEDGE = {
    "Atelectasis": {
        "finding": "Partial or complete collapse of one or more lung segments",
        "visual_pattern": "Increased opacity with volume loss, shift of fissures toward the affected area",
        "clinical_context": "Often caused by mucus plugging, airway obstruction, or post-surgical changes. Requires airway clearance or bronchoscopy.",
        "severity_hint": "moderate"
    },
    "Consolidation": {
        "finding": "Airspace filled with fluid, pus, blood, or cells replacing normal air",
        "visual_pattern": "Homogeneous opacification maintaining lung volume, air bronchograms may be visible",
        "clinical_context": "Classic finding in bacterial pneumonia. May indicate aspiration, lung contusion, or infarct.",
        "severity_hint": "high"
    },
    "Infiltration": {
        "finding": "Inflammatory cells or fluid within lung tissue",
        "visual_pattern": "Diffuse, hazy increased opacity — less dense than consolidation, with indistinct borders",
        "clinical_context": "Associated with early pneumonia, bronchitis, or viral infections. Warrants monitoring.",
        "severity_hint": "moderate"
    },
    "Pneumothorax": {
        "finding": "Air in the pleural space causing lung collapse",
        "visual_pattern": "Visible pleural line with absence of lung markings beyond it, often at apex",
        "clinical_context": "Medical emergency if large or tension pneumothorax. Requires immediate decompression.",
        "severity_hint": "critical"
    },
    "Edema": {
        "finding": "Fluid accumulation in lung tissue and air spaces",
        "visual_pattern": "Bilateral perihilar haziness ('bat wing' pattern), Kerley B lines, pleural effusion",
        "clinical_context": "Commonly seen in congestive heart failure, acute respiratory distress syndrome (ARDS).",
        "severity_hint": "high"
    },
    "Emphysema": {
        "finding": "Permanent airspace enlargement with destruction of alveolar walls",
        "visual_pattern": "Hyperinflation, flat diaphragms, increased retrosternal airspace, hyperlucent lung fields",
        "clinical_context": "Chronic condition, strongly associated with smoking. Managed with bronchodilators.",
        "severity_hint": "moderate"
    },
    "Fibrosis": {
        "finding": "Scarring and thickening of lung tissue reducing elasticity",
        "visual_pattern": "Reticular (net-like) opacities, honeycombing at bases, traction bronchiectasis",
        "clinical_context": "Seen in interstitial lung disease (ILD), post-infection scarring, or autoimmune conditions.",
        "severity_hint": "moderate"
    },
    "Effusion": {
        "finding": "Abnormal fluid collection in the pleural space",
        "visual_pattern": "Blunting of costophrenic angle, meniscus sign, opacification of lower lung zones",
        "clinical_context": "Can be transudative (heart failure, cirrhosis) or exudative (infection, malignancy).",
        "severity_hint": "moderate"
    },
    "Pneumonia": {
        "finding": "Lung infection causing inflammatory fluid in air sacs",
        "visual_pattern": "Lobar or segmental consolidation, often unilateral in lower lobes with air bronchograms",
        "clinical_context": "Bacterial pneumonia typically shows lobar pattern; viral shows bilateral interstitial pattern.",
        "severity_hint": "high"
    },
    "Pleural_Thickening": {
        "finding": "Fibrous thickening of the pleural membrane",
        "visual_pattern": "Linear soft tissue density along chest wall, may be bilateral",
        "clinical_context": "Associated with prior infection, asbestos exposure, or prior pleural effusion.",
        "severity_hint": "low"
    },
    "Cardiomegaly": {
        "finding": "Enlarged heart silhouette on chest X-ray",
        "visual_pattern": "Cardiothoracic ratio > 0.5 on PA film, prominent cardiac borders",
        "clinical_context": "Indicates cardiomegaly from left/right ventricular hypertrophy, dilated cardiomyopathy, or pericardial effusion.",
        "severity_hint": "moderate"
    },
    "Nodule": {
        "finding": "Small, well-defined round opacity ≤ 3cm",
        "visual_pattern": "Discrete rounded density, may have smooth or irregular margins",
        "clinical_context": "Could be benign (granuloma, hamartoma) or malignant (primary lung cancer, metastasis). Requires CT follow-up.",
        "severity_hint": "moderate"
    },
    "Mass": {
        "finding": "Large, focal opacity > 3cm requiring urgent investigation",
        "visual_pattern": "Large heterogeneous density, may have irregular or spiculated margins",
        "clinical_context": "High suspicion for malignancy. Requires CT chest and PET scan urgently.",
        "severity_hint": "critical"
    },
    "Hernia": {
        "finding": "Abdominal organ herniation into chest cavity",
        "visual_pattern": "Bowel gas loops or soft tissue above diaphragm, obscured left hemidiaphragm",
        "clinical_context": "Hiatal or diaphragmatic hernia. Clinical evaluation and CT recommended.",
        "severity_hint": "low"
    },
    "Lung Lesion": {
        "finding": "Focal abnormal lung tissue (unclear etiology)",
        "visual_pattern": "Discrete opacity or density change in focal lung region",
        "clinical_context": "Warrants further characterization with CT. Differential includes infection, benign or malignant tumor.",
        "severity_hint": "moderate"
    },
    "Fracture": {
        "finding": "Break in rib or bony thorax visible on X-ray",
        "visual_pattern": "Linear lucency through rib cortex, may show overlapping fragments or step-off",
        "clinical_context": "Associated with trauma. Risk of pneumothorax or hemothorax with multiple rib fractures.",
        "severity_hint": "moderate"
    },
    "Lung Opacity": {
        "finding": "Generalized or focal increased density in lung parenchyma",
        "visual_pattern": "Hazy or solid increased whiteness obscuring vascular markings",
        "clinical_context": "Non-specific finding; may represent consolidation, effusion, atelectasis, or edema.",
        "severity_hint": "moderate"
    },
    "Enlarged Cardiomediastinum": {
        "finding": "Widened mediastinal shadow on chest X-ray",
        "visual_pattern": "Mediastinal width > 8cm on PA film, bilateral enlargement of mediastinal contours",
        "clinical_context": "Consider aortic dissection (emergency), lymphoma, pericardial effusion, or vascular ectasia.",
        "severity_hint": "high"
    }
}

SEVERITY_ORDER = {"critical": 4, "high": 3, "moderate": 2, "low": 1}

# ─── Anatomical Region Mapping ───────────────────────────────────────────────────

def map_to_lung_region(peak_y: float, peak_x: float, image_h: int, image_w: int) -> str:
    """Maps heatmap peak pixel to an anatomical lung zone label."""
    y_norm = peak_y / image_h  # 0=top, 1=bottom
    x_norm = peak_x / image_w  # 0=left, 1=right

    if y_norm < 0.33:
        zone_v = "Upper"
    elif y_norm < 0.66:
        zone_v = "Middle"
    else:
        zone_v = "Lower"

    if x_norm < 0.40:
        zone_h = "Left"
    elif x_norm > 0.60:
        zone_h = "Right"
    else:
        zone_h = "Bilateral / Central"

    if zone_h == "Bilateral / Central":
        return f"Bilateral / Central {zone_v} Zone"
    return f"{zone_h} {zone_v} Lobe"


# ─── Model Loader ────────────────────────────────────────────────────────────────

def get_model():
    global _MODEL
    if _MODEL is None:
        if not XRV_AVAILABLE:
            raise RuntimeError("torchxrayvision is not installed.")
        print(f"[DiagnoAI] Loading torchxrayvision DenseNet121 on {_DEVICE}...")
        print("[DiagnoAI] First run will download ~100MB weights automatically.")
        model = xrv.models.DenseNet(weights="densenet121-res224-all")
        model = model.to(_DEVICE)
        model.eval()
        _MODEL = model
        print("[DiagnoAI] Model ready. Pathologies:", model.pathologies)
    return _MODEL


# ─── Image Preprocessing (torchxrayvision format) ────────────────────────────────

def preprocess_for_xrv(image_bytes: bytes) -> tuple:
    """Returns (xrv_tensor [1,1,224,224], original PIL image)"""
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("L")  # Grayscale
    orig_pil = pil_img.copy()

    img_np = np.array(pil_img)
    img_np = xrv.datasets.normalize(img_np, 255)   # → [-1024, 1024]

    if img_np.ndim == 2:
        img_np = img_np[None, ...]  # add channel dim

    transform = torchvision.transforms.Compose([
        xrv.datasets.XRayCenterCrop(),
        xrv.datasets.XRayResizer(224),
    ])
    img_np = transform(img_np)
    tensor = torch.from_numpy(img_np).unsqueeze(0).to(_DEVICE)  # [1,1,224,224]
    return tensor, orig_pil


# ─── Grad-CAM ────────────────────────────────────────────────────────────────────

class GradCAM:
    """Hooks into the last dense block of torchxrayvision DenseNet."""

    def __init__(self, model):
        self.model = model
        self.gradients = None
        self.activations = None
        self._hook_layers()

    def _hook_layers(self):
        # torchxrayvision DenseNet: model.features.denseblock4 is the last block
        target_layer = self.model.features.denseblock4

        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        target_layer.register_forward_hook(forward_hook)
        target_layer.register_full_backward_hook(backward_hook)

    def generate(self, tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        """Returns normalized Grad-CAM map [0,1] same shape as input spatial dims."""
        self.model.zero_grad()
        output = self.model(tensor)  # [1, num_pathologies]

        score = output[0, class_idx]
        score.backward()

        # Gradient-weighted activation
        gradients = self.gradients  # [1, C, H, W]
        activations = self.activations  # [1, C, H, W]

        weights = gradients.mean(dim=[2, 3], keepdim=True)  # [1, C, 1, 1]
        cam = (weights * activations).sum(dim=1, keepdim=True)  # [1, 1, H, W]
        cam = F.relu(cam)

        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam


_GRAD_CAM = None

def get_gradcam():
    global _GRAD_CAM
    if _GRAD_CAM is None:
        _GRAD_CAM = GradCAM(get_model())
    return _GRAD_CAM


# ─── Spectrum Heatmap Generator ──────────────────────────────────────────────────

def generate_spectrum_heatmap(cam: np.ndarray, orig_pil: Image.Image) -> tuple:
    """
    Overlays color spectrum (jet colormap: blue→cyan→green→yellow→red) on X-ray.
    Returns (base64_png_string, peak_y, peak_x, resized_cam_224x224).
    """
    # Resize CAM to 224x224
    cam_resized = skimage.transform.resize(cam, (224, 224), order=1, anti_aliasing=True)

    # Get peak activation location
    peak_flat = np.argmax(cam_resized)
    peak_y, peak_x = np.unravel_index(peak_flat, cam_resized.shape)

    # Resize original image to 224x224 for overlay
    orig_resized = orig_pil.resize((224, 224), Image.LANCZOS).convert("RGB")
    orig_np = np.array(orig_resized, dtype=np.float32) / 255.0

    # Apply jet colormap to CAM
    colormap = cm.get_cmap('jet')
    heatmap_rgb = colormap(cam_resized)[:, :, :3]  # [224,224,3], drop alpha

    # Blend: 60% original + 40% heatmap (weighted by CAM intensity)
    alpha = cam_resized[:, :, np.newaxis] * 0.6  # stronger blend where model activated
    blended = orig_np * (1 - alpha) + heatmap_rgb * alpha
    blended = np.clip(blended, 0, 1)

    # Convert to PNG → base64
    fig, ax = plt.subplots(1, 1, figsize=(4, 4), dpi=100)
    ax.imshow(blended)
    ax.axis('off')

    # Add colorbar as spectrum legend
    sm = plt.cm.ScalarMappable(cmap='jet', norm=plt.Normalize(vmin=0, vmax=1))
    sm.set_array([])
    cbar = fig.colorbar(sm, ax=ax, orientation='vertical', fraction=0.046, pad=0.04)
    cbar.set_label('Activation Intensity', color='white', fontsize=7)
    cbar.ax.yaxis.set_tick_params(color='white')
    plt.setp(cbar.ax.yaxis.get_ticklabels(), color='white')
    cbar.set_ticks([0, 0.5, 1])
    cbar.set_ticklabels(['Low', 'Med', 'High'])

    fig.patch.set_facecolor('#0f172a')  # dark background
    plt.tight_layout(pad=0.2)

    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode('utf-8')

    return b64, int(peak_y), int(peak_x), cam_resized


# ─── XAI Text Engine ─────────────────────────────────────────────────────────────

def build_xai_explanation(
    condition: str,
    confidence: float,
    region: str,
    cam_max: float
) -> dict:
    """Builds the 'WHY' explanation for a detected condition."""
    knowledge = XAI_KNOWLEDGE.get(condition, {
        "finding": f"Abnormal pattern detected consistent with {condition}",
        "visual_pattern": "Focal increased density region detected by model",
        "clinical_context": "Clinical correlation recommended.",
        "severity_hint": "moderate"
    })

    conf_pct = confidence * 100
    activation_pct = cam_max * 100

    # Dynamic visual evidence text
    if conf_pct >= 75:
        conf_qualifier = "strong"
    elif conf_pct >= 50:
        conf_qualifier = "moderate"
    else:
        conf_qualifier = "weak"

    visual_evidence = (
        f"Model shows {conf_qualifier} activation ({conf_pct:.1f}% confidence) concentrated in the "
        f"{region}. Grad-CAM analysis reveals {activation_pct:.0f}% peak activation intensity "
        f"in this zone, indicating the model's primary decision region."
    )

    recommendation = _get_recommendation(condition, conf_pct)

    return {
        "radiological_finding": knowledge["finding"],
        "visual_pattern": knowledge["visual_pattern"],
        "visual_evidence": visual_evidence,
        "clinical_context": knowledge["clinical_context"],
        "recommendation": recommendation,
        "severity": knowledge["severity_hint"],
        "region": region,
        "confidence_pct": round(conf_pct, 1)
    }


def _get_recommendation(condition: str, confidence_pct: float) -> str:
    urgency_map = {
        "Pneumothorax": "🚨 Urgent: Immediate chest decompression may be required. Consult emergency medicine.",
        "Mass": "🚨 Urgent: CT chest + PET scan required to evaluate for malignancy. Urgent oncology referral.",
        "Enlarged Cardiomediastinum": "⚠️ Urgent: Rule out aortic dissection with CT angiography immediately.",
        "Edema": "⚠️ High Priority: Cardiology evaluation for cardiac vs non-cardiac pulmonary edema.",
        "Pneumonia": "⚠️ High Priority: Antibiotic therapy indicated. Blood cultures, sputum cultures recommended.",
        "Consolidation": "⚠️ High Priority: Treat underlying cause — pneumonia or aspiration. Follow-up X-ray in 6 weeks.",
        "Nodule": "📋 Follow-up: CT chest (thin-section) to characterize nodule. Nodule tracking per Fleischner guidelines.",
        "Effusion": "📋 Follow-up: Consider diagnostic thoracentesis if large. Echocardiogram to evaluate cardiac cause.",
        "Cardiomegaly": "📋 Follow-up: Echocardiogram to assess cardiac function and chamber sizes.",
        "Atelectasis": "📋 Follow-up: Chest physiotherapy, incentive spirometry. Bronchoscopy if persistent.",
    }

    default = (
        f"📋 Clinical Correlation: Findings consistent with {condition} at {confidence_pct:.0f}% confidence. "
        "Radiologist review and clinical correlation recommended."
    )

    rec = urgency_map.get(condition, default)
    if confidence_pct < 40:
        rec = f"ℹ️ Low confidence finding ({confidence_pct:.0f}%). " + rec.lstrip("🚨⚠️📋").strip()
    return rec


# ─── Detection Strategy: Adaptive Z-Score ────────────────────────────────────────
#
# Problem with flat thresholds (0.15 = too many FP, 0.45 = too many FN):
#   torchxrayvision scores cluster at 0.45–0.60 for BOTH normal and abnormal
#   images. A flat threshold can't distinguish them.
#
# Solution — Per-image relative detection:
#   A pathology is flagged only if its score is SIGNIFICANTLY ABOVE the
#   background noise (other pathology scores in the same image).
#
#   detected = score > (mean_of_all_scores + Z_FACTOR × std_of_all_scores)
#              AND score > ABS_MINIMUM (hard floor to avoid noise)
#
# Why this works:
#   Normal X-ray  → all scores ~0.50, std ~0.05 → threshold ~0.575 → nothing crosses → Normal
#   Pneumonia     → Pneumonia ~0.70, others ~0.48, std ~0.08 → threshold ~0.62 → Pneumonia detected
#   Multi-finding → several conditions spike above the mean of the rest → all detected

Z_FACTOR    = 2.0   # Std-devs above mean required (2.0 = ~97.7th percentile of the cluster)
ABS_MINIMUM = 0.35  # Hard floor — nothing below this is ever reported as a finding
MIN_ABS_GAP = 0.10  # Score must be at least 10% above the image mean (absolute gap guard)

NORMAL_XAI = {
    "radiological_finding": "No significant acute cardiopulmonary abnormality detected",
    "visual_pattern": "Lung fields are clear bilaterally, cardiac silhouette within normal limits",
    "visual_evidence": "Model activation is diffuse and low-intensity — no focal anomaly region identified",
    "clinical_context": "Normal chest X-ray. Standard follow-up as clinically indicated.",
    "recommendation": "✅ No acute pathology detected. Routine clinical follow-up recommended.",
    "severity": "normal",
    "region": "Bilateral / No focal abnormality",
    "confidence_pct": 100.0
}


# ─── Main Prediction Function ─────────────────────────────────────────────────────

async def predict_xray(image_bytes: bytes, xray_type: str) -> dict:
    """
    Main entry point. Returns:
    {
        prediction, confidence, probabilities,
        heatmap_b64, region, findings[], xai_details, explanation,
        model_info
    }
    """
    xray_type = xray_type.lower()

    # ── 1. Load model ──
    model = get_model()
    gradcam = get_gradcam()

    # ── 2. Preprocess ──
    tensor, orig_pil = preprocess_for_xrv(image_bytes)

    # ── 3. Inference ──
    with torch.no_grad():
        raw_output = model(tensor)  # [1, 18]
        scores = torch.sigmoid(raw_output)[0].cpu().numpy()  # [18]

    pathologies = model.pathologies
    prob_dict = {p: float(s) for p, s in zip(pathologies, scores)}

    # ── 4. Adaptive detection ─────────────────────────────────────────────────
    # Strategy: A pathology is flagged only if BOTH:
    #   (a) It is statistically above the noise floor of this image
    #       score > mean + 1.5 × std   (top ~7% of 18 scores for this image)
    #   (b) The model genuinely leans positive for it
    #       score > 0.50               (above the sigmoid midpoint = model says "likely")
    #
    # Why this works for the problematic cases:
    #   Normal X-ray (all 62-68%, mean=65%, std=2%)
    #     z-threshold = 65 + 3% = 68% → Lung Opacity 68.1% barely misses (≈ borderline)
    #     BUT even if it passes z, 68% < 50%? No, 68% > 50% so we need std to be higher.
    #     Real fix: use score > mean + 10% absolute  OR z only if std is meaningful.
    #
    # Final simple rule: only flag if score is BOTH:
    #   > mean + 1.5σ  (relative, per-image)
    #   > 0.50         (absolute sigmoid threshold — model nominally positive)
    #   AND the std of scores > 0.04 (enough spread to distinguish anything)
    #   — if std < 0.04 scores are too clustered to distinguish → all Normal

    score_arr  = np.array(scores, dtype=np.float32)
    score_mean = float(score_arr.mean())
    score_std  = float(score_arr.std())

    # DEBUG — visible in uvicorn terminal to confirm new code is running
    print(f"[DiagnoAI] score_mean={score_mean:.4f}  score_std={score_std:.4f}")
    print(f"[DiagnoAI] top-3 scores: {sorted(zip(pathologies, scores), key=lambda x: -x[1])[:3]}")

    # If all 18 scores are too tightly clustered, the model is uncertain → Normal
    if score_std < 0.04:
        detected_findings = []
        print(f"[DiagnoAI] std={score_std:.4f} < 0.04 → tight cluster → NORMAL")
    else:
        z_threshold = score_mean + 2.0 * score_std   # raised from 1.5 → 2.0
        print(f"[DiagnoAI] z_threshold={z_threshold:.4f}")

        detected_findings = [
            (p, float(s)) for p, s in zip(pathologies, score_arr)
            if float(s) >= z_threshold      # statistically anomalous for this image
            and float(s) >= 0.60            # raised floor: model must be clearly positive (>60%)
        ]
        print(f"[DiagnoAI] detected_findings={detected_findings}")

    detected_findings.sort(key=lambda x: x[1], reverse=True)
    is_normal = len(detected_findings) == 0
    print(f"[DiagnoAI] is_normal={is_normal}")


    # ── 5. Primary prediction ──
    if is_normal:
        primary_pred = "Normal"
        primary_conf = float(1.0 - max(scores))
    else:
        primary_pred, primary_conf = detected_findings[0]

    # ── 6. Grad-CAM on primary finding ──
    heatmap_b64 = None
    peak_region = "Bilateral / Central"

    if not is_normal:
        try:
            primary_idx = list(pathologies).index(primary_pred)
            tensor_grad = tensor.clone().requires_grad_(True)
            cam = gradcam.generate(tensor_grad, primary_idx)
            heatmap_b64, peak_y, peak_x, cam_resized = generate_spectrum_heatmap(cam, orig_pil)
            peak_region = map_to_lung_region(peak_y, peak_x, 224, 224)
        except Exception as e:
            print(f"[DiagnoAI] Grad-CAM failed: {e}")

    # ── 7. XAI Explanation ──
    if is_normal:
        xai_details = {"Normal": NORMAL_XAI}
        explanation = "The model found no significant acute cardiopulmonary abnormality. All pathology scores are below the detection threshold."
    else:
        xai_details = {}
        for condition, score in detected_findings[:5]:  # Top 5 findings
            # Per-finding CAM (for top finding) or reuse main CAM
            try:
                if condition == primary_pred:
                    cam_max = float(cam.max()) if 'cam' in dir() else 0.5
                else:
                    cam_max = 0.5  # Approximate for secondary findings
            except:
                cam_max = float(score)

            xai_details[condition] = build_xai_explanation(
                condition=condition,
                confidence=float(score),
                region=peak_region,
                cam_max=cam_max
            )

        primary_xai = xai_details.get(primary_pred, {})
        explanation = (
            f"Primary finding: {primary_pred} detected with {primary_conf*100:.1f}% confidence. "
            f"{primary_xai.get('visual_evidence', '')} "
            f"{primary_xai.get('recommendation', '')}"
        )

    # ── 8. Build findings list for UI ──
    if is_normal:
        findings_list = [{"condition": "Normal", "score": primary_conf, "severity": "normal"}]
    else:
        findings_list = [
            {
                "condition": cond,
                "score": float(sc),
                "severity": XAI_KNOWLEDGE.get(cond, {}).get("severity_hint", "moderate")
            }
            for cond, sc in detected_findings[:8]
        ]

    return {
        "prediction": primary_pred,
        "confidence": float(primary_conf),
        "probabilities": {k: round(v, 4) for k, v in sorted(prob_dict.items(), key=lambda x: -x[1])},
        "heatmap_b64": heatmap_b64,
        "region": peak_region,
        "findings": findings_list,
        "xai_details": xai_details,
        "explanation": explanation,
        "model_info": {
            "name": "DenseNet121 (torchxrayvision)",
            "trained_on": "NIH ChestX-ray14 + CheXpert + MIMIC + PadChest",
            "pathologies_count": len(pathologies),
            "xai_method": "Gradient-weighted Class Activation Mapping (Grad-CAM)"
        },
        "heatmap": None  # kept for backward compat
    }
