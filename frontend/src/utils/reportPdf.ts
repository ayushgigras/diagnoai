import jsPDF from 'jspdf';
import type { LabResult, ReportPatientDetails, XAIDetail, XRayResult } from '../types';
import { calculateParameterStatus, stripEmojis } from './labUtils';

interface PdfReportInput {
    fileName: string;
    reportType: 'xray' | 'lab' | string;
    status?: string;
    analyzedAt?: string;
    analyzedBy?: string;
    patient?: ReportPatientDetails | null;
    result: unknown;
}

type RGB = [number, number, number];

const C = {
    primary:       [15, 118, 110]  as RGB, // Teal fallback
    critical:      [153, 27, 27]   as RGB, // Dark Red
    high:          [239, 68, 68]   as RGB, // Red
    moderate:      [249, 115, 22]  as RGB, // Orange
    borderline:    [234, 179, 8]   as RGB, // Yellow
    low:           [59, 130, 246]  as RGB, // Blue
    normal:        [16, 185, 129]  as RGB, // Green
    teal:          [15, 118, 110]  as RGB, 
    tealLight:     [204, 251, 241] as RGB,
    yellow:        [245, 158, 11]  as RGB, // Amber for border
    yellowLight:   [255, 251, 235] as RGB, 
    dark:          [15, 23, 42]    as RGB,
    slate700:      [51, 65, 85]    as RGB,
    slate600:      [71, 85, 105]   as RGB,
    slate400:      [148, 163, 184] as RGB,
    slate200:      [226, 232, 240] as RGB,
    slate100:      [241, 245, 249] as RGB,
    white:         [255, 255, 255] as RGB,
    grayBox:       [248, 249, 250] as RGB, 
};

const sevColor = (s: string): RGB => {
    const lower = s.toLowerCase();
    if (lower === 'critical') return C.critical;
    if (lower === 'high' || lower === 'abnormal') return C.high;
    if (lower === 'moderate') return C.moderate;
    if (lower === 'borderline') return C.borderline;
    if (lower === 'low')      return C.low;
    if (lower === 'normal')   return C.normal;
    return C.slate400; // unknown
};

const getTextColorForBg = (s: string): RGB => {
    const lower = s.toLowerCase();
    if (lower === 'borderline') return C.dark; 
    return C.white; 
};

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9-_]/g, '_');

const patientName = (patient?: ReportPatientDetails | null) => {
    if (!patient) return 'General Analysis';
    let full = '';
    if (patient.patient_name && patient.patient_name.trim()) full = patient.patient_name.trim();
    else full = `${patient.patient_first_name || ''} ${patient.patient_last_name || ''}`.trim();
    if (!full || full.toLowerCase() === 'unknown patient') return 'General Analysis';
    return full;
};

const isLabResult = (result: unknown): result is LabResult => {
    if (!result || typeof result !== 'object') return false;
    return Array.isArray((result as LabResult).parameters);
};

const isXRayResult = (result: unknown): result is XRayResult => {
    if (!result || typeof result !== 'object') return false;
    return typeof (result as XRayResult).prediction === 'string';
};

const loadImageAsDataUrl = (src: string): Promise<string | null> =>
    new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });

export const downloadReportPdf = async (input: PdfReportInput) => {
    const logoDataUrl = await loadImageAsDataUrl('/logo.png');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const MX = 40;
    const CW = PW - MX * 2;
    let y = 85; 

    /* ── helpers ─────────────────────────────────────────────────── */
    const newPageIfNeeded = (needed: number) => {
        if (y + needed > PH - 45) { doc.addPage(); y = 85; }
    };
    const tc  = (rgb: RGB) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    const fc  = (rgb: RGB) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const dc  = (rgb: RGB) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    const t   = (s: string, x: number, ty: number, opts?: { align?: string }) => doc.text(s, x, ty, opts as any);

    const sectionHeader = (title: string) => {
        newPageIfNeeded(50);
        y += 14; 
        fc(C.teal); doc.rect(MX, y, CW, 24, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); tc(C.white);
        t(title.toUpperCase(), MX + 12, y + 17);
        y += 38;
    };

    // Correctly mapped, properly colored badges
    const sevBadge = (sev: string, bx: number, by: number) => {
        const label = sev.toUpperCase();
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        const tw = doc.getTextWidth(label) + 16;
        const color = sevColor(sev);
        const textColor = getTextColorForBg(sev);
        
        fc(color); dc(color);
        doc.roundedRect(bx, by - 12, tw, 18, 3, 3, 'FD');
        tc(textColor);
        t(label, bx + 8, by + 1);
        return tw + 8;
    };

    const drawFootersAndHeaders = () => {
        const pages = (doc.internal as any).getNumberOfPages() as number;
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            
            /* HEADER ─────────────────────────────────────────────────── */
            fc(C.teal); doc.rect(0, 0, PW, 64, 'F');

            // White rounded box — gives contrast for any logo colour
            fc(C.white); dc(C.white); doc.setLineWidth(0);
            doc.roundedRect(10, 5, 50, 40, 6, 6, 'F');

            // Logo image centred inside the white box
            if (logoDataUrl) {
                doc.addImage(logoDataUrl, 'PNG', 17, 7, 36, 36);
            }

            const textX = 70; // text starts after the white box
            doc.setFont('helvetica', 'bold'); doc.setFontSize(22); tc(C.white);
            t('DiagnoAI', textX, 34);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10); tc(C.tealLight);
            t('AI-Powered Medical Diagnostic Report', textX, 50);
            
            const typeLabel = input.reportType === 'xray' ? 'X-RAY ANALYSIS'
                : input.reportType === 'lab' ? 'LAB REPORT ANALYSIS'
                : 'DIAGNOSTIC REPORT';
            doc.setFont('helvetica', 'bold'); doc.setFontSize(14); tc(C.white);
            t(typeLabel, PW - MX, 34, { align: 'right' });
            
            const analyzedAt = input.analyzedAt ? new Date(input.analyzedAt).toLocaleString() : new Date().toLocaleString();
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10); tc(C.tealLight);
            t(`Date: ${analyzedAt}`, PW - MX, 50, { align: 'right' });

            /* FOOTER ─────────────────────────────────────────────────── */
            dc(C.slate200); doc.setLineWidth(1.5); doc.line(MX, PH - 32, PW - MX, PH - 32);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9); tc(C.slate400);
            t('DiagnoAI', MX, PH - 16);
            doc.setFont('helvetica', 'normal');
            t('Disclaimer: For educational & research purposes only. Not a substitute for medical advice.', PW / 2, PH - 16, { align: 'center' });
            t(`Page ${i} of ${pages}`, PW - MX, PH - 16, { align: 'right' });
        }
    };

    /* ── Patient Profile box ────────────────────────────────────── */
    fc(C.grayBox); dc(C.slate200); doc.setLineWidth(1);
    doc.roundedRect(MX, y, CW, 74, 4, 4, 'FD');
    fc(C.teal); doc.roundedRect(MX, y, 4, 74, 4, 4, 'F'); // left accent

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); tc(C.teal);
    t('PATIENT DETAILS', MX + 16, y + 18);
    t('ANALYSIS DETAILS', CW/2 + MX + 10, y + 18);
    
    dc(C.slate200); doc.setLineWidth(1); doc.line(MX + 16, y + 26, PW - MX - 16, y + 26);

    const splitFormat = (k: string, v: string, x: number, lineY: number) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(C.slate700); t(k, x, lineY);
        doc.setFont('helvetica', 'normal'); tc(C.dark); t(v, x + doc.getTextWidth(k) + 6, lineY);
    };

    const pX = MX + 16;
    const aX = CW/2 + MX + 10;
    
    splitFormat('Name:', patientName(input.patient), pX, y + 44);
    splitFormat('Report Type:', input.reportType === 'xray' ? 'X-Ray' : 'Lab', aX, y + 44);
    
    splitFormat('DOB:', input.patient?.patient_date_of_birth || 'N/A', pX, y + 60);
    splitFormat('Analyzed By:', input.analyzedBy || 'N/A', aX, y + 60);

    y += 94; // Move below patient box with breathing room

    /* ══════════════════════════════════════════════════════════════
       X-RAY REPORT
    ══════════════════════════════════════════════════════════════ */
    if (isXRayResult(input.result)) {
        const result = input.result;
        
        doc.setFont('helvetica', 'bold'); doc.setFontSize(20); tc(C.dark);
        const title = stripEmojis(result.prediction);
        t(title, MX, y);
        y += 22;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11); tc(C.slate600);
        t(`Confidence: ${(result.confidence * 100).toFixed(1)}%`, MX, y);
        if (result.region) t(`  ·  Region: ${result.region}`, MX + doc.getTextWidth(`Confidence: ${(result.confidence * 100).toFixed(1)}%`), y);
        y += 24;

        if (result.explanation) {
            doc.setFontSize(11); tc(C.dark);
            const lines = doc.splitTextToSize(stripEmojis(result.explanation), CW);
            lines.forEach((line: string) => { t(line, MX, y); y += 14; });
            y += 12;
        }

        /* ── All Detected Findings Table ─────────────────────────── */
        if (result.findings?.length && result.findings.length > 0) {
            sectionHeader('ALL DETECTED FINDINGS');
            
            fc(C.tealLight); dc(C.slate200); doc.setLineWidth(1); doc.rect(MX, y, CW, 24, 'FD');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(C.teal);
            t('FINDING', MX + 12, y + 16);
            t('CONFIDENCE', MX + CW * 0.5, y + 16);
            t('SEVERITY', MX + CW * 0.75, y + 16);
            y += 24;

            result.findings.forEach((finding, i) => {
                newPageIfNeeded(36);
                fc(i % 2 === 0 ? C.white : C.grayBox); dc(C.slate200); doc.setLineWidth(0.5);
                doc.rect(MX, y, CW, 32, 'FD');
                
                doc.setFont('helvetica', 'bold'); doc.setFontSize(12); tc(C.dark);
                t(stripEmojis(finding.condition), MX + 12, y + 20);
                
                doc.setFont('helvetica', 'normal'); doc.setFontSize(11); tc(C.dark);
                t(`${(finding.score * 100).toFixed(1)}%`, MX + CW * 0.5, y + 20);
                
                sevBadge(finding.severity, MX + CW * 0.75, y + 20);
                y += 32; 
            });
            y += 20; 
        }

        /* ── Explainability ─────────────────────────────────────── */
        const xaiEntries = Object.entries(result.xai_details || {}) as [string, XAIDetail][];
        if (xaiEntries.length > 0) {
            sectionHeader('EXPLAINABILITY');
            
            xaiEntries.forEach(([condition, detail]) => {
                const cleanCond = stripEmojis(condition);
                const cleanRec = stripEmojis(detail.recommendation);
                const recLines = (doc.splitTextToSize(cleanRec, CW - 32) as string[]).length;
                const rfLines  = (doc.splitTextToSize(stripEmojis(detail.radiological_finding), CW - 32) as string[]).length;
                const veLines  = (doc.splitTextToSize(stripEmojis(detail.visual_evidence), CW - 32) as string[]).length;
                const ccLines  = (doc.splitTextToSize(stripEmojis(detail.clinical_context), CW - 32) as string[]).length;
                
                const cardH = 46 + (rfLines + veLines + ccLines) * 14 + recLines * 14 + 60;

                newPageIfNeeded(cardH + 16);
                
                fc(C.grayBox); dc(C.slate200); doc.setLineWidth(1);
                doc.roundedRect(MX, y, CW, cardH, 4, 4, 'FD');
                
                doc.setFont('helvetica', 'bold'); doc.setFontSize(14); tc(C.teal);
                t(cleanCond, MX + 16, y + 26);
                
                let ry = y + 48;

                const detailBlock = (label: string, val: string) => {
                    const cleanVal = stripEmojis(val);
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); tc(C.slate400); // small caps gray
                    t(label.toUpperCase(), MX + 16, ry);
                    ry += 14;
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); tc(C.dark); // body text dark
                    (doc.splitTextToSize(cleanVal, CW - 32) as string[]).forEach((line: string) => {
                        t(line, MX + 16, ry); ry += 14;
                    });
                    ry += 8;
                };

                detailBlock('Radiological Finding', detail.radiological_finding);
                detailBlock('Visual Evidence (Grad-CAM)', detail.visual_evidence);
                detailBlock('Clinical Context', detail.clinical_context);

                doc.setFont('helvetica', 'bold'); doc.setFontSize(9); tc(C.slate400);
                t('RECOMMENDATION', MX + 16, ry);
                ry += 14;
                doc.setFont('helvetica', 'normal'); doc.setFontSize(11); tc(C.dark);
                (doc.splitTextToSize(cleanRec, CW - 32) as string[]).forEach((line: string) => {
                    t(line, MX + 16, ry); ry += 14;
                });

                y += cardH + 16;
            });
        }

        /* ── Probability Distribution ───────────────────────────── */
        const probs = Object.entries(result.probabilities || {}).sort(([, a], [, b]) => b - a).slice(0, 18);
        if (probs.length > 0) {
            sectionHeader('PROBABILITY DISTRIBUTION');
            const colW = (CW - 24) / 2;
            let rowY = y;
            probs.forEach(([cond, prob], idx) => {
                const col = idx % 2;
                if (col === 0 && idx > 0) { rowY += 24; }
                if (col === 0) { 
                    if (rowY + 24 > PH - 60) { doc.addPage(); rowY = 85; y = 85; }
                } 
                
                const px = MX + col * (colW + 24);
                const condW = 120;
                const barW  = colW - condW - 45;
                const cleanCond = stripEmojis(cond);
                const label = cleanCond.length > 20 ? cleanCond.slice(0, 19) + '…' : cleanCond;
                
                doc.setFont('helvetica', 'normal'); doc.setFontSize(11); tc(C.slate700);
                t(label, px, rowY + 12);
                
                fc(C.slate200); doc.roundedRect(px + condW, rowY + 3, barW, 8, 2, 2, 'F');
                fc(C.teal); doc.roundedRect(px + condW, rowY + 3, Math.max(4, prob * barW), 8, 2, 2, 'F');
                
                doc.setFont('helvetica', 'bold'); doc.setFontSize(10); tc(C.slate600);
                t(`${(prob * 100).toFixed(1)}%`, px + condW + barW + 8, rowY + 11);
            });
            y = rowY + 36;
        }

    /* ══════════════════════════════════════════════════════════════
       LAB REPORT
    ══════════════════════════════════════════════════════════════ */
    } else if (isLabResult(input.result)) {
        const result = input.result;

        // Prominent Status top of document
        newPageIfNeeded(60);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); tc(C.slate700);
        t('OVERALL STATUS', MX, y);
        y += 28;
        
        doc.setFont('helvetica', 'bold'); doc.setFontSize(20); tc(sevColor(result.assessment));
        t(stripEmojis(result.assessment).toUpperCase(), MX, y);
        
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11); tc(C.slate600);
        t(`Confidence: ${(result.confidence * 100).toFixed(1)}%     |     Parameters analyzed: ${result.parameters.length}`, CW/2 + MX - 40, y);
        y += 24;

        if (result.interpretation) {
            newPageIfNeeded(40);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(11); tc(C.slate700);
            const lines = doc.splitTextToSize(`"${stripEmojis(result.interpretation)}"`, CW);
            lines.forEach((line: string) => { t(line, MX, y); y += 14; });
            y += 16;
        }

        /* parameters */
        sectionHeader('DETAILED PARAMETER ANALYSIS');

        fc(C.tealLight); dc(C.slate200); doc.setLineWidth(1); doc.rect(MX, y, CW, 24, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(C.teal);
        t('PARAMETER', MX + 12, y + 16);
        t('VALUE', MX + CW * 0.45, y + 16);
        t('REFERENCE RANGE', MX + CW * 0.65, y + 16);
        t('STATUS', MX + CW * 0.85, y + 16);
        y += 24;

        result.parameters.forEach((param, i) => {
            const calculatedStatus = calculateParameterStatus(param);

            newPageIfNeeded(36);
            const bg = i % 2 === 0 ? C.white : C.grayBox;
            fc(bg); dc(C.slate200); doc.setLineWidth(0.5);
            doc.rect(MX, y, CW, 32, 'FD'); // Zebra stripes
            
            doc.setFont('helvetica', 'bold'); doc.setFontSize(12); tc(C.dark); // Columns are bold
            t(stripEmojis(param.name).toUpperCase(), MX + 12, y + 20);

            doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(C.dark);
            const valStr = `${param.value}${param.unit ? ` ${param.unit}` : ''}`;
            t(valStr, MX + CW * 0.45, y + 20);

            doc.setFont('helvetica', 'normal'); doc.setFontSize(11); tc(C.slate600);
            t(stripEmojis(param.reference_range), MX + CW * 0.65, y + 20);

            sevBadge(calculatedStatus, MX + CW * 0.85, y + 20); // Status inside column
            y += 32;
        });
        y += 24;

        /* recommendations — keep entire section together (KeepTogether equivalent) */
        if (result.recommendations?.length) {
            // Pre-calculate every card's height to decide up-front whether the
            // whole section fits on the remaining page or needs a fresh page.
            doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
            const recHeights = result.recommendations.map((rec) => {
                const lines = doc.splitTextToSize(`•  ${stripEmojis(rec)}`, CW - 24) as string[];
                return lines.length * 14 + 16 + 12; // card + gap
            });
            const sectionTotalH = 52 + recHeights.reduce((a, b) => a + b, 0); // 52 = sectionHeader

            // Jump to a new page before drawing the header so nothing is orphaned.
            if (y + sectionTotalH > PH - 45) {
                doc.addPage(); y = 85;
            }

            sectionHeader('RECOMMENDATIONS');
            result.recommendations.forEach((rec) => {
                const cleanRec = stripEmojis(rec);
                const lines = doc.splitTextToSize(`•  ${cleanRec}`, CW - 24) as string[];
                const rh = lines.length * 14 + 16;
                // Safety net: only triggers if a single card alone exceeds one full page.
                newPageIfNeeded(rh + 16);

                fc(C.yellowLight); dc(C.slate200); doc.setLineWidth(0.5);
                doc.roundedRect(MX, y, CW, rh, 4, 4, 'FD');
                fc(C.yellow); doc.roundedRect(MX, y, 4, rh, 4, 4, 'F');

                doc.setFont('helvetica', 'normal'); doc.setFontSize(11); tc(C.dark);
                lines.forEach((line: string, idx: number) => {
                    t(line, MX + 16, y + 20 + idx * 14);
                });
                y += rh + 12;
            });
        }

    } else {
        sectionHeader('RESULT');
        doc.setFontSize(11); tc(C.slate600);
        const lines = doc.splitTextToSize(JSON.stringify(input.result, null, 2), CW) as string[];
        lines.forEach((l: string) => {
            newPageIfNeeded(14);
            t(l, MX, y); y += 14;
        });
    }

    drawFootersAndHeaders();
    doc.save(`${sanitizeFileName(input.fileName)}.pdf`);
};
