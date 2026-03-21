import jsPDF from 'jspdf';
import type { LabResult, ReportPatientDetails, XAIDetail, XRayResult } from '../types';

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
    primary:       [37, 99, 235]   as RGB,
    primaryLight:  [219, 234, 254] as RGB,
    critical:      [220, 38, 38]   as RGB,
    criticalLight: [254, 226, 226] as RGB,
    high:          [234, 88, 12]   as RGB,
    highLight:     [255, 237, 213] as RGB,
    moderate:      [161, 98, 7]    as RGB,
    moderateLight: [254, 249, 195] as RGB,
    normal:        [22, 101, 52]   as RGB,
    normalLight:   [220, 252, 231] as RGB,
    violet:        [109, 40, 217]  as RGB,
    violetLight:   [237, 233, 254] as RGB,
    dark:          [15, 23, 42]    as RGB,
    slate700:      [51, 65, 85]    as RGB,
    slate600:      [71, 85, 105]   as RGB,
    slate400:      [148, 163, 184] as RGB,
    slate200:      [226, 232, 240] as RGB,
    slate100:      [241, 245, 249] as RGB,
    white:         [255, 255, 255] as RGB,
};

const sevColor = (s: string): RGB => {
    if (s === 'critical') return C.critical;
    if (s === 'high')     return C.high;
    if (s === 'moderate') return C.moderate;
    if (s === 'normal')   return C.normal;
    return C.primary;
};

const sevLightColor = (s: string): RGB => {
    if (s === 'critical') return C.criticalLight;
    if (s === 'high')     return C.highLight;
    if (s === 'moderate') return C.moderateLight;
    if (s === 'normal')   return C.normalLight;
    return C.primaryLight;
};

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9-_]/g, '_');

const patientName = (patient?: ReportPatientDetails | null) => {
    if (!patient) return 'N/A';
    if (patient.patient_name && patient.patient_name.trim()) return patient.patient_name;
    const first = patient.patient_first_name || '';
    const last = patient.patient_last_name || '';
    const full = `${first} ${last}`.trim();
    return full || 'N/A';
};

const isLabResult = (result: unknown): result is LabResult => {
    if (!result || typeof result !== 'object') return false;
    return Array.isArray((result as LabResult).parameters);
};

const isXRayResult = (result: unknown): result is XRayResult => {
    if (!result || typeof result !== 'object') return false;
    return typeof (result as XRayResult).prediction === 'string';
};

export const downloadReportPdf = (input: PdfReportInput) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const MX = 40;
    const CW = PW - MX * 2;
    const LH = 15;
    let y = 0;

    /* ── helpers ─────────────────────────────────────────────────── */
    const newPageIfNeeded = (needed: number) => {
        if (y + needed > PH - 44) { doc.addPage(); y = 44; }
    };
    const tc  = (rgb: RGB) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    const fc  = (rgb: RGB) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const dc  = (rgb: RGB) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    const t   = (s: string, x: number, ty: number, opts?: { align?: string }) =>
        doc.text(s, x, ty, opts as any);

    const writeLine = (str: string, x: number, size: number, color: RGB, bold = false) => {
        newPageIfNeeded(LH);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        tc(color);
        t(str, x, y);
        y += LH;
    };

    const writeWrapped = (str: string, x: number, maxW: number, size: number, color: RGB, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        tc(color);
        (doc.splitTextToSize(str, maxW) as string[]).forEach((line) => {
            newPageIfNeeded(LH);
            t(line, x, y);
            y += LH;
        });
    };

    const sectionHeader = (title: string, color: RGB = C.primary) => {
        newPageIfNeeded(32);
        y += 6;
        fc(color); dc(color);
        doc.roundedRect(MX, y, CW, 22, 3, 3, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); tc(C.white);
        t(title, MX + 10, y + 15);
        y += 30;
    };

    const badge = (label: string, bx: number, by: number, color: RGB, light: RGB) => {
        doc.setFontSize(7);
        const tw = doc.getTextWidth(label) + 8;
        fc(light); dc(color);
        doc.roundedRect(bx, by - 9, tw, 12, 2, 2, 'FD');
        tc(color); doc.setFont('helvetica', 'bold');
        t(label, bx + 4, by);
        return tw + 4;
    };

    const sevBadge = (sev: string, bx: number, by: number) =>
        badge(sev.charAt(0).toUpperCase() + sev.slice(1), bx, by, sevColor(sev), sevLightColor(sev));

    const progressBar = (bx: number, by: number, bw: number, pct: number, color: RGB) => {
        fc(C.slate200); doc.roundedRect(bx, by, bw, 6, 2, 2, 'F');
        fc(color); doc.roundedRect(bx, by, Math.max(3, (pct / 100) * bw), 6, 2, 2, 'F');
    };

    /* ── page footer (drawn after all pages are created) ─────────── */
    const drawFooters = () => {
        const pages = (doc.internal as any).getNumberOfPages() as number;
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            fc(C.slate100); doc.rect(0, PH - 26, PW, 26, 'F');
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); tc(C.slate400);
            t('DiagnoAI · AI-powered diagnostic tool for educational/research use only. Not a substitute for professional medical advice.', MX, PH - 10);
            t(`Page ${i} of ${pages}`, PW - MX, PH - 10, { align: 'right' });
        }
    };

    /* ── header bar ─────────────────────────────────────────────── */
    fc(C.dark); doc.rect(0, 0, PW, 52, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); tc(C.white);
    t('DiagnoAI', MX, 26);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.slate400);
    t('AI-Powered Medical Diagnostic Report', MX, 42);

    const typeLabel = input.reportType === 'xray' ? 'X-RAY ANALYSIS'
        : input.reportType === 'lab' ? 'LAB REPORT ANALYSIS'
        : String(input.reportType).toUpperCase();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); tc(C.slate400);
    t(typeLabel, PW - MX, 26, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const analyzedAt = input.analyzedAt ? new Date(input.analyzedAt).toLocaleString() : new Date().toLocaleString();
    t(analyzedAt, PW - MX, 42, { align: 'right' });

    y = 62;

    /* ── patient + analysis cards ────────────────────────────────── */
    const halfW = (CW - 10) / 2;
    newPageIfNeeded(80);

    // patient card
    fc(C.slate100); dc(C.slate200);
    doc.roundedRect(MX, y, halfW, 70, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); tc(C.slate400);
    t('PATIENT DETAILS', MX + 10, y + 13);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(C.dark);
    t(patientName(input.patient), MX + 10, y + 28);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); tc(C.slate600);
    const dobStr   = input.patient?.patient_date_of_birth ? `DOB: ${input.patient.patient_date_of_birth}` : '';
    const genderStr = input.patient?.patient_gender ? `Gender: ${input.patient.patient_gender}` : '';
    t([dobStr, genderStr].filter(Boolean).join('   '), MX + 10, y + 43);
    if (input.patient?.patient_contact_number)
        t(`Contact: ${input.patient.patient_contact_number}`, MX + 10, y + 57);

    // analysis card
    const cx2 = MX + halfW + 10;
    fc(C.slate100); dc(C.slate200);
    doc.roundedRect(cx2, y, halfW, 70, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); tc(C.slate400);
    t('ANALYSIS DETAILS', cx2 + 10, y + 13);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(C.dark);
    t(input.reportType === 'xray' ? 'X-Ray Analysis' : 'Lab Report Analysis', cx2 + 10, y + 28);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); tc(C.slate600);
    t(`By: ${input.analyzedBy || 'N/A'}`, cx2 + 10, y + 43);
    t(`Status: ${input.status || 'completed'}`, cx2 + 10, y + 57);

    y += 82;

    /* ══════════════════════════════════════════════════════════════
       X-RAY REPORT
    ══════════════════════════════════════════════════════════════ */
    if (isXRayResult(input.result)) {
        const result = input.result;
        const primarySev = result.findings?.[0]?.severity ?? 'moderate';
        const bColor = sevColor(primarySev);
        const bLight = sevLightColor(primarySev);

        /* primary finding banner */
        newPageIfNeeded(64);
        fc(bLight); dc(bColor);
        doc.roundedRect(MX, y, CW, 56, 4, 4, 'FD');
        fc(bColor); doc.rect(MX, y, 4, 56, 'F');

        doc.setFont('helvetica', 'bold'); doc.setFontSize(16); tc(bColor);
        t(result.prediction, MX + 14, y + 20);
        sevBadge(primarySev, MX + 18 + doc.getTextWidth(result.prediction), y + 20);

        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); tc(C.slate600);
        t(`Confidence: ${(result.confidence * 100).toFixed(1)}%`, MX + 14, y + 36);
        if (result.region) t(`  ·  Region: ${result.region}`, MX + 14 + doc.getTextWidth(`Confidence: ${(result.confidence * 100).toFixed(1)}%`), y + 36);
        if (result.model_info)
            t(`${result.model_info.name}  ·  ${result.model_info.xai_method}`, MX + 14, y + 50);
        y += 64;

        /* clinical summary */
        if (result.explanation) {
            newPageIfNeeded(30);
            fc(C.primaryLight); dc(C.slate200);
            doc.roundedRect(MX, y, CW, 4, 2, 2, 'F');
            y += 8;
            writeWrapped(result.explanation, MX + 8, CW - 12, 9, C.slate700);
            y += 4;
        }

        /* ── detected findings ──────────────────────────────────── */
        if (result.findings?.length) {
            sectionHeader('All Detected Findings');
            result.findings.forEach((finding) => {
                newPageIfNeeded(26);
                const sc = sevColor(finding.severity);
                const pct = finding.score * 100;

                doc.setFont('helvetica', 'bold'); doc.setFontSize(9); tc(sc);
                const nameW = doc.getTextWidth(finding.condition);
                t(finding.condition, MX + 4, y + 10);

                const barX = MX + nameW + 16;
                const barW = CW - nameW - 72;
                progressBar(barX, y + 5, barW, pct, sc);

                doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.slate600);
                t(`${pct.toFixed(1)}%`, barX + barW + 6, y + 10);
                sevBadge(finding.severity, barX + barW + 38, y + 10);
                y += 22;
            });
            y += 4;
        }

        /* ── explainability cards ───────────────────────────────── */
        const xaiEntries = Object.entries(result.xai_details || {}) as [string, XAIDetail][];
        if (xaiEntries.length > 0) {
            sectionHeader('Explainability — Why This Result?', C.violet);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.slate400);
            writeWrapped(
                'Each section explains what visual pattern the AI detected, where it focused (Grad-CAM), and the clinical interpretation.',
                MX, CW, 8, C.slate400,
            );
            y += 4;

            xaiEntries.forEach(([condition, detail]) => {
                const sc = sevColor(detail.severity);
                const sl = sevLightColor(detail.severity);

                // estimate card height
                const recLines = (doc.splitTextToSize(detail.recommendation, CW - 30) as string[]).length;
                const rfLines  = (doc.splitTextToSize(detail.radiological_finding, CW - 130) as string[]).length;
                const veLines  = (doc.splitTextToSize(detail.visual_evidence, CW - 130) as string[]).length;
                const ccLines  = (doc.splitTextToSize(detail.clinical_context, CW - 130) as string[]).length;
                const cardH = 46 + (rfLines + veLines + ccLines) * 11 + recLines * 11 + 30;

                newPageIfNeeded(cardH);
                fc(sl); dc(sc);
                doc.roundedRect(MX, y, CW, cardH, 4, 4, 'FD');
                fc(sc); doc.rect(MX, y, 4, cardH, 'F');

                // condition header
                doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(sc);
                t(condition, MX + 14, y + 16);
                sevBadge(detail.severity, MX + 16 + doc.getTextWidth(condition), y + 16);

                doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.slate600);
                t(`${detail.confidence_pct.toFixed(1)}% confidence  ·  ${detail.region}`, MX + 14, y + 30);

                const labelX = MX + 14;
                const valX   = MX + 110;
                const valW   = CW - 120;
                let ry = y + 44;

                const detailRow = (label: string, val: string) => {
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); tc(C.slate400);
                    t(label.toUpperCase(), labelX, ry);
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.dark);
                    (doc.splitTextToSize(val, valW) as string[]).forEach((line, i) => t(line, valX, ry + i * 11));
                    ry += (doc.splitTextToSize(val, valW) as string[]).length * 11 + 5;
                };

                detailRow('Radiological Finding', detail.radiological_finding);
                detailRow('Visual Evidence (Grad-CAM)', detail.visual_evidence);
                detailRow('Clinical Context', detail.clinical_context);

                // recommendation chip
                fc(sc); doc.roundedRect(labelX, ry, CW - 28, recLines * 12 + 8, 3, 3, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8); tc(C.white);
                (doc.splitTextToSize(detail.recommendation, CW - 36) as string[]).forEach((line, i) =>
                    t(line, labelX + 6, ry + 11 + i * 12));

                y += cardH + 10;
            });
        }

        /* ── probability distribution ───────────────────────────── */
        const probs = Object.entries(result.probabilities || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 18);
        if (probs.length > 0) {
            sectionHeader('Probability Distribution (All Pathologies)');
            const colW = (CW - 16) / 2;
            let rowY = 0;
            probs.forEach(([cond, prob], idx) => {
                const col = idx % 2;
                if (col === 0) { newPageIfNeeded(20); rowY = y; y += 18; }
                const px = MX + col * (colW + 16);
                const condW = 108;
                const barW  = colW - condW - 36;
                const label = cond.length > 17 ? cond.slice(0, 16) + '…' : cond;
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.slate600);
                t(label, px, rowY + 11);
                progressBar(px + condW, rowY + 5, barW, prob * 100, C.primary);
                tc(C.slate400); t(`${(prob * 100).toFixed(1)}%`, px + condW + barW + 4, rowY + 11);
            });
            y += 8;
        }

        /* ── model info ─────────────────────────────────────────── */
        if (result.model_info) {
            newPageIfNeeded(52);
            fc(C.slate100); dc(C.slate200);
            doc.roundedRect(MX, y, CW, 44, 4, 4, 'FD');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); tc(C.slate700);
            t('Model & XAI Information', MX + 10, y + 14);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.slate600);
            t(
                `Model: ${result.model_info.name}   |   Training: ${result.model_info.trained_on}   |   ${result.model_info.pathologies_count} pathologies   |   ${result.model_info.xai_method}`,
                MX + 10, y + 28,
            );
            doc.setFontSize(7); tc(C.slate400);
            t('⚠ For educational/research use only. Not a substitute for professional radiological review.', MX + 10, y + 40);
            y += 52;
        }

    /* ══════════════════════════════════════════════════════════════
       LAB REPORT
    ══════════════════════════════════════════════════════════════ */
    } else if (isLabResult(input.result)) {
        const result = input.result;
        const assessColor = result.assessment?.toLowerCase() === 'normal' ? C.normal : C.moderate;
        const assessLight = result.assessment?.toLowerCase() === 'normal' ? C.normalLight : C.moderateLight;

        /* overall assessment banner */
        const interpLines = result.interpretation
            ? (doc.splitTextToSize(`"${result.interpretation}"`, CW - 36) as string[]).length
            : 0;
        const bannerH = 46 + (interpLines > 0 ? interpLines * 11 + 4 : 0);
        newPageIfNeeded(bannerH + 8);

        fc(assessLight); dc(assessColor);
        doc.roundedRect(MX, y, CW, bannerH, 4, 4, 'FD');
        fc(assessColor); doc.rect(MX, y, 4, bannerH, 'F');

        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); tc(assessColor);
        t(`Overall Status: ${result.assessment}`, MX + 14, y + 18);

        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); tc(C.slate600);
        t(`Confidence: ${(result.confidence * 100).toFixed(1)}%  based on ${result.parameters.length} analyzed parameters.`, MX + 14, y + 33);

        if (result.interpretation) {
            doc.setFont('helvetica', 'italic'); doc.setFontSize(8); tc(C.slate700);
            let iy = y + 43;
            (doc.splitTextToSize(`"${result.interpretation}"`, CW - 36) as string[]).forEach((line) => {
                t(line, MX + 14, iy); iy += 11;
            });
        }
        y += bannerH + 12;

        /* parameters */
        sectionHeader('Detailed Parameter Analysis');

        result.parameters.forEach((param) => {
            const sc: RGB = param.status === 'normal'   ? C.normal
                          : param.status === 'critical' ? C.critical
                          : param.status === 'abnormal' ? C.high
                          : C.slate600;

            newPageIfNeeded(34);
            fc(C.slate100); dc(C.slate200);
            doc.roundedRect(MX, y, CW, 28, 3, 3, 'FD');

            // colored left indicator
            fc(sc); doc.roundedRect(MX, y, 4, 28, 2, 2, 'F');

            // status dot
            fc(sc); doc.ellipse(MX + 14, y + 14, 3.5, 3.5, 'F');

            // name
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9); tc(C.dark);
            t(param.name.toUpperCase(), MX + 24, y + 11);

            // reference range
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); tc(C.slate400);
            t(`Ref: ${param.reference_range}`, MX + 24, y + 22);

            // progress bar (middle)
            const barX = MX + 130;
            const barW = CW - 230;
            progressBar(barX, y + 11, barW, Math.min(100, Math.max(0, param.percentage)), sc);

            // value (right)
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(sc);
            const valStr = `${param.value}${param.unit ? ` ${param.unit}` : ''}`;
            t(valStr, PW - MX - 58, y + 14, { align: 'right' });

            // status badge
            const badgeSev = param.status === 'abnormal' ? 'high' : param.status;
            sevBadge(badgeSev, PW - MX - 54, y + 14);

            y += 34;
        });

        /* recommendations */
        sectionHeader('Recommendations', C.normal);
        if (result.recommendations?.length) {
            result.recommendations.forEach((rec) => {
                const lines = (doc.splitTextToSize(rec, CW - 30) as string[]).length;
                const rh = lines * 12 + 14;
                newPageIfNeeded(rh + 6);
                fc(C.normalLight); dc(C.normal);
                doc.roundedRect(MX, y, CW, rh, 3, 3, 'FD');
                fc(C.normal); doc.ellipse(MX + 14, y + rh / 2, 3, 3, 'F');
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9); tc(C.dark);
                (doc.splitTextToSize(rec, CW - 32) as string[]).forEach((line, i) =>
                    t(line, MX + 24, y + 13 + i * 12));
                y += rh + 6;
            });
        } else {
            writeLine('No specific recommendations available.', MX, 9, C.slate400);
        }

        /* disclaimer */
        newPageIfNeeded(22);
        y += 8;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); tc(C.slate400);
        writeWrapped(
            'Disclaimer: This AI analysis is for informational purposes only and does not replace professional medical advice. Always consult a qualified healthcare provider.',
            MX, CW, 7, C.slate400,
        );

    } else {
        sectionHeader('Result');
        writeWrapped(JSON.stringify(input.result, null, 2), MX, CW, 8, C.slate600);
    }

    drawFooters();
    doc.save(`${sanitizeFileName(input.fileName)}.pdf`);
};

