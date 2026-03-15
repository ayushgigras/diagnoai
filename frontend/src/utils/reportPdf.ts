import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    slate50:       [248, 250, 252] as RGB,
    white:         [255, 255, 255] as RGB,
};

const sevColor = (s: string): RGB => {
    s = s.toLowerCase();
    if (s === 'critical') return C.critical;
    if (s === 'high' || s === 'abnormal') return C.high;
    if (s === 'moderate') return C.moderate;
    if (s === 'normal')   return C.normal;
    return C.primary;
};

const sevLightColor = (s: string): RGB => {
    s = s.toLowerCase();
    if (s === 'critical') return C.criticalLight;
    if (s === 'high' || s === 'abnormal') return C.highLight;
    if (s === 'moderate') return C.moderateLight;
    if (s === 'normal')   return C.normalLight;
    return C.primaryLight;
};

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9-_]/g, '_');

/** Strip characters not renderable by jsPDF's built-in helvetica font */
const sanitizeText = (text: string): string => {
    if (!text) return '';
    return text
        // Replace common unicode arrows/bullets with ASCII equivalents
        .replace(/→/g, '->')
        .replace(/←/g, '<-')
        .replace(/·/g, '-')
        .replace(/⚠/g, '[!]')
        // Replace emoji with text labels
        .replace(/🧠/g, '')
        .replace(/📂/g, '')
        .replace(/🔬/g, '')
        .replace(/🎯/g, '')
        // Remove any remaining characters outside the latin-1 range that helvetica can't render
        .replace(/[^\x00-\xFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

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
    const LH = 16; // slightly larger line height
    let y = 0;

    /* ── helpers ─────────────────────────────────────────────────── */
    const newPageIfNeeded = (needed: number) => {
        if (y + needed > PH - 44) { doc.addPage(); y = 44; }
    };
    const tc  = (rgb: RGB) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    const fc  = (rgb: RGB) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const dc  = (rgb: RGB) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    const t   = (s: string, x: number, ty: number, opts?: { align?: string }) =>
        doc.text(sanitizeText(s), x, ty, opts as any);

    const writeLine = (str: string, x: number, size: number, color: RGB, bold = false) => {
        newPageIfNeeded(LH);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        tc(color);
        t(str, x, y);
        y += LH;
    };

    const writeWrapped = (str: string, x: number, maxW: number, size: number, color: RGB, bold = false) => {
        const clean = sanitizeText(str);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        tc(color);
        (doc.splitTextToSize(clean, maxW) as string[]).forEach((line) => {
            newPageIfNeeded(LH);
            doc.text(line, x, y);
            y += LH;
        });
    };

    const sectionHeader = (title: string, color: RGB = C.primary) => {
        newPageIfNeeded(40);
        y += 10;
        fc(color); dc(color);
        doc.roundedRect(MX, y, CW, 24, 3, 3, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(C.white);
        t(title, MX + 10, y + 16);
        y += 34; // Add a bit more spacing after section headers
    };

    const badge = (label: string, bx: number, by: number, color: RGB, light: RGB) => {
        doc.setFontSize(8); // slightly larger badge text
        const tw = doc.getTextWidth(label) + 10;
        fc(light); dc(color);
        doc.roundedRect(bx, by - 10, tw, 14, 2, 2, 'FD');
        tc(color); doc.setFont('helvetica', 'bold');
        t(label, bx + 5, by);
        return tw + 5;
    };

    const sevBadge = (sev: string, bx: number, by: number) =>
        badge(sev.charAt(0).toUpperCase() + sev.slice(1), bx, by, sevColor(sev), sevLightColor(sev));

    /* ── page footer (drawn after all pages are created) ─────────── */
    const drawFooters = () => {
        const pages = (doc.internal as any).getNumberOfPages() as number;
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            fc(C.slate100); doc.rect(0, PH - 30, PW, 30, 'F');
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.slate400);
            doc.text('DiagnoAI - AI-powered diagnostic tool for educational/research use only. Not a substitute for professional medical advice.', MX, PH - 12);
            t(`Page ${i} of ${pages}`, PW - MX, PH - 12, { align: 'right' });
        }
    };

    /* ── header bar ─────────────────────────────────────────────── */
    fc(C.dark); doc.rect(0, 0, PW, 60, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); tc(C.white);
    t('DiagnoAI', MX, 30);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); tc(C.slate400);
    t('AI-Powered Medical Diagnostic Report', MX, 48);

    const typeLabel = input.reportType === 'xray' ? 'X-RAY ANALYSIS'
        : input.reportType === 'lab' ? 'LAB REPORT ANALYSIS'
        : String(input.reportType).toUpperCase();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(C.slate400);
    t(typeLabel, PW - MX, 30, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const analyzedAt = input.analyzedAt ? new Date(input.analyzedAt).toLocaleString() : new Date().toLocaleString();
    t(analyzedAt, PW - MX, 48, { align: 'right' });

    y = 75; // Increased starting Y

    /* ── patient + analysis cards ────────────────────────────────── */
    const halfW = (CW - 14) / 2;
    newPageIfNeeded(90);

    // patient card
    fc(C.slate50); dc(C.slate200);
    doc.roundedRect(MX, y, halfW, 80, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); tc(C.slate400);
    t('PATIENT DETAILS', MX + 12, y + 16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); tc(C.dark);
    t(patientName(input.patient), MX + 12, y + 33);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); tc(C.slate600);
    const dobStr   = input.patient?.patient_date_of_birth ? `DOB: ${input.patient.patient_date_of_birth}` : '';
    const genderStr = input.patient?.patient_gender ? `Gender: ${input.patient.patient_gender}` : '';
    t([dobStr, genderStr].filter(Boolean).join('   '), MX + 12, y + 50);
    if (input.patient?.patient_contact_number)
        t(`Contact: ${input.patient.patient_contact_number}`, MX + 12, y + 66);

    // analysis card
    const cx2 = MX + halfW + 14;
    fc(C.slate50); dc(C.slate200);
    doc.roundedRect(cx2, y, halfW, 80, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); tc(C.slate400);
    t('ANALYSIS DETAILS', cx2 + 12, y + 16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); tc(C.dark);
    t(input.reportType === 'xray' ? 'X-Ray Analysis' : 'Lab Report Analysis', cx2 + 12, y + 33);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); tc(C.slate600);
    t(`By: ${input.analyzedBy || 'N/A'}`, cx2 + 12, y + 50);
    t(`Status: ${input.status || 'completed'}`, cx2 + 12, y + 66);

    y += 100;

    /* ══════════════════════════════════════════════════════════════
       X-RAY REPORT
    ══════════════════════════════════════════════════════════════ */
    if (isXRayResult(input.result)) {
        const result = input.result;
        const primarySev = result.findings?.[0]?.severity ?? 'moderate';
        const bColor = sevColor(primarySev);
        const bLight = sevLightColor(primarySev);

        /* primary finding banner */
        newPageIfNeeded(70);
        fc(bLight); dc(bColor);
        doc.roundedRect(MX, y, CW, 65, 4, 4, 'FD');
        fc(bColor); doc.rect(MX, y, 6, 65, 'F');

        doc.setFont('helvetica', 'bold'); doc.setFontSize(18); tc(bColor);
        t(result.prediction, MX + 16, y + 24);
        sevBadge(primarySev, MX + 20 + doc.getTextWidth(result.prediction), y + 24);

        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); tc(C.slate600);
        t(`Confidence: ${(result.confidence * 100).toFixed(1)}%`, MX + 16, y + 42);
        if (result.region) t(`  ·  Region: ${result.region}`, MX + 16 + doc.getTextWidth(`Confidence: ${(result.confidence * 100).toFixed(1)}%`), y + 42);
        if (result.model_info)
            t(`${result.model_info.name}  ·  ${result.model_info.xai_method}`, MX + 16, y + 56);
        y += 75;

        /* clinical summary */
        if (result.explanation) {
            const cleanExplanation = sanitizeText(result.explanation);
            newPageIfNeeded(36);
            fc(C.primaryLight); dc(C.slate200);
            doc.roundedRect(MX, y, CW, 4, 2, 2, 'F');
            y += 12;
            writeWrapped(cleanExplanation, MX + 8, CW - 16, 10, C.slate700);
            y += 8;
        }

        /* ── detected findings (Table) ───────────────────────────── */
        if (result.findings?.length) {
            sectionHeader('All Detected Findings');
            
            const tableData = result.findings.map(f => [
                f.condition,
                `${(f.score * 100).toFixed(1)}%`,
                f.severity.toUpperCase()
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Condition', 'Confidence', 'Severity']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: C.slate100, textColor: C.slate700, fontStyle: 'bold' },
                bodyStyles: { textColor: C.dark },
                margin: { left: MX, right: MX },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    2: { fontStyle: 'bold' } // We will custom paint the severity
                },
                didParseCell: function(data: any) {
                    if (data.section === 'body' && data.column.index === 2) {
                        const sev = data.cell.raw.toLowerCase();
                        const color = sevColor(sev);
                        data.cell.styles.textColor = color;
                    }
                }
            });
            y = (doc as any).lastAutoTable.finalY + 20;
        }

        /* ── explainability cards ───────────────────────────────── */
        const xaiEntries = Object.entries(result.xai_details || {}) as [string, XAIDetail][];
        if (xaiEntries.length > 0) {
            sectionHeader('Explainability — Why This Result?', C.violet);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10); tc(C.slate600);
            writeWrapped(
                'Each section explains what visual pattern the AI detected, where it focused (Grad-CAM), and the clinical interpretation.',
                MX, CW, 10, C.slate600,
            );
            y += 8;

            xaiEntries.forEach(([condition, detail]) => {
                const sc = sevColor(detail.severity);
                const sl = sevLightColor(detail.severity);

                // Draw condition header manually
                newPageIfNeeded(60);
                fc(sl); dc(sc);
                doc.roundedRect(MX, y, CW, 40, 4, 4, 'FD');
                fc(sc); doc.rect(MX, y, 6, 40, 'F');

                doc.setFont('helvetica', 'bold'); doc.setFontSize(12); tc(sc);
                t(condition, MX + 18, y + 18);
                sevBadge(detail.severity, MX + 20 + doc.getTextWidth(condition), y + 18);

                doc.setFont('helvetica', 'normal'); doc.setFontSize(9); tc(C.slate600);
                t(`${detail.confidence_pct.toFixed(1)}% confidence  ·  ${detail.region}`, MX + 18, y + 34);
                y += 44;

                // build table data — sanitize all text to prevent encoding issues
                const detailData = [
                    ['Radiological Finding', sanitizeText(detail.radiological_finding)],
                    ['Visual Evidence', sanitizeText(detail.visual_evidence)],
                    ['Clinical Context', sanitizeText(detail.clinical_context)],
                    ['Recommendation', sanitizeText(detail.recommendation)]
                ];

                autoTable(doc, {
                    startY: y,
                    body: detailData,
                    theme: 'plain',
                    styles: { cellPadding: 8, fontSize: 10, lineColor: C.slate200, lineWidth: 0.5 },
                    columnStyles: {
                        0: { fontStyle: 'bold', textColor: C.slate600, cellWidth: 130 },
                        1: { textColor: C.dark }
                    },
                    margin: { left: MX, right: MX },
                    willDrawCell: function(data: any) {
                        // Highlight recommendation row
                        if (data.row.index === 3) {
                            data.cell.styles.fillColor = sl;
                            if (data.column.index === 0) data.cell.styles.textColor = sc;
                        }
                    }
                });

                y = (doc as any).lastAutoTable.finalY + 20;
            });
        }

        /* ── probability distribution (Table) ───────────────────── */
        const probs = Object.entries(result.probabilities || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 18);
        if (probs.length > 0) {
            sectionHeader('Probability Distribution (All Pathologies)');
            
            const tableData = [];
            // Group into 2 columns for the table
            for (let i = 0; i < probs.length; i += 2) {
                const row = [
                    probs[i][0], `${(probs[i][1] * 100).toFixed(1)}%`,
                    probs[i+1] ? probs[i+1][0] : '', probs[i+1] ? `${(probs[i+1][1] * 100).toFixed(1)}%` : ''
                ];
                tableData.push(row);
            }

            autoTable(doc, {
                startY: y,
                body: tableData,
                theme: 'striped',
                styles: { fontSize: 9, textColor: C.slate700 },
                margin: { left: MX, right: MX },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: C.dark },
                    1: { textColor: C.primary },
                    2: { fontStyle: 'bold', textColor: C.dark },
                    3: { textColor: C.primary }
                }
            });
            y = (doc as any).lastAutoTable.finalY + 16;
        }

        /* ── model info ─────────────────────────────────────────── */
        if (result.model_info) {
            newPageIfNeeded(100);
            const infoY = y;

            // Calculate dynamic height based on content
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
            const modelLines: { label: string; value: string }[] = [
                { label: 'Model:', value: sanitizeText(result.model_info.name) },
                { label: 'Training Data:', value: sanitizeText(result.model_info.trained_on) },
                { label: 'Pathologies:', value: `${result.model_info.pathologies_count} conditions` },
                { label: 'XAI Method:', value: sanitizeText(result.model_info.xai_method) },
            ];
            const boxH = 28 + modelLines.length * 16 + 24; // header + lines + disclaimer

            fc(C.slate50); dc(C.slate200);
            doc.roundedRect(MX, infoY, CW, boxH, 4, 4, 'FD');

            doc.setFont('helvetica', 'bold'); doc.setFontSize(10); tc(C.slate700);
            doc.text(sanitizeText('Model & XAI Information'), MX + 12, infoY + 18);

            let lineY = infoY + 34;
            modelLines.forEach(({ label, value }) => {
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9); tc(C.slate600);
                doc.text(label, MX + 12, lineY);
                doc.setFont('helvetica', 'normal'); tc(C.dark);
                doc.text(value, MX + 12 + 90, lineY);
                lineY += 16;
            });

            lineY += 4;
            doc.setFontSize(8); tc(C.slate400);
            doc.text('[!] For educational/research use only. Not a substitute for professional radiological review.', MX + 12, lineY);

            y = infoY + boxH + 12;
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
            ? (doc.splitTextToSize(`"${result.interpretation}"`, CW - 40) as string[]).length
            : 0;
        const bannerH = 55 + (interpLines > 0 ? interpLines * 12 + 8 : 0);
        newPageIfNeeded(bannerH + 12);

        fc(assessLight); dc(assessColor);
        doc.roundedRect(MX, y, CW, bannerH, 4, 4, 'FD');
        fc(assessColor); doc.rect(MX, y, 6, bannerH, 'F');

        doc.setFont('helvetica', 'bold'); doc.setFontSize(16); tc(assessColor);
        t(`Overall Status: ${result.assessment}`, MX + 18, y + 24);

        doc.setFont('helvetica', 'normal'); doc.setFontSize(11); tc(C.slate700);
        t(`Confidence: ${(result.confidence * 100).toFixed(1)}%  based on ${result.parameters.length} analyzed parameters.`, MX + 18, y + 42);

        if (result.interpretation) {
            doc.setFont('helvetica', 'italic'); doc.setFontSize(10); tc(C.slate700);
            let iy = y + 54;
            (doc.splitTextToSize(`"${result.interpretation}"`, CW - 40) as string[]).forEach((line) => {
                t(line, MX + 18, iy); iy += 12;
            });
        }
        y += bannerH + 20;

        /* parameters (Table) */
        sectionHeader('Detailed Parameter Analysis');

        const tableData = result.parameters.map(param => {
            const valStr = `${param.value}${param.unit ? ` ${param.unit}` : ''}`;
            const statusUpper = param.status.charAt(0).toUpperCase() + param.status.slice(1);
            return [
                param.name.toUpperCase(),
                valStr,
                param.reference_range,
                statusUpper
            ];
        });

        autoTable(doc, {
            startY: y,
            head: [['Parameter', 'Result', 'Reference Range', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: C.slate100, textColor: C.slate700, fontStyle: 'bold', fontSize: 10 },
            bodyStyles: { textColor: C.dark, fontSize: 10 },
            margin: { left: MX, right: MX },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { fontStyle: 'bold' }, // Result
                2: { textColor: C.slate600 },
                3: { fontStyle: 'bold' } // Status
            },
            didParseCell: function(data: any) {
                if (data.section === 'body') {
                    const statusStr = result.parameters[data.row.index].status;
                    const sc = sevColor(statusStr);
                    if (data.column.index === 1 || data.column.index === 3) {
                        data.cell.styles.textColor = sc;
                    }
                    if (data.column.index === 3) {
                         const sl = sevLightColor(statusStr);
                         data.cell.styles.fillColor = sl;
                    }
                }
            }
        });

        y = (doc as any).lastAutoTable.finalY + 24;

        /* recommendations */
        sectionHeader('Recommendations', C.normal);
        if (result.recommendations?.length) {
            const recTableData = result.recommendations.map(r => ['•', r]);
            autoTable(doc, {
                startY: y,
                body: recTableData,
                theme: 'plain',
                styles: { cellPadding: { top: 6, bottom: 6, left: 4, right: 4 }, fontSize: 11, textColor: C.dark },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: C.normal, cellWidth: 20, halign: 'center' }
                },
                margin: { left: MX, right: MX }
            });
            y = (doc as any).lastAutoTable.finalY + 20;
        } else {
            writeLine('No specific recommendations available.', MX, 11, C.slate600);
            y += 10;
        }

        /* disclaimer */
        newPageIfNeeded(30);
        y += 12;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.slate400);
        writeWrapped(
            'Disclaimer: This AI analysis is for informational purposes only and does not replace professional medical advice. Always consult a qualified healthcare provider.',
            MX, CW, 8, C.slate400,
        );

    } else {
        sectionHeader('Result');
        writeWrapped(JSON.stringify(input.result, null, 2), MX, CW, 10, C.slate600);
    }

    drawFooters();
    doc.save(`${sanitizeFileName(input.fileName)}.pdf`);
};

