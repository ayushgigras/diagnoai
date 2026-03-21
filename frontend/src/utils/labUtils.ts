import type { LabParameter } from '../types';

export const calculateParameterStatus = (param: LabParameter): 'normal' | 'low' | 'high' | 'critical' | 'unknown' => {
    if (!param.reference_range || param.reference_range.trim() === '') {
        return param.status === 'abnormal' ? 'high' : (param.status as any);
    }

    const valStr = String(param.value || '').replace(/[^0-9.]/g, '');
    const val = parseFloat(valStr);
    
    // For qualitative things like "Negative", value might be NaN
    if (isNaN(val)) {
        if (param.status === 'abnormal') return 'high';
        return param.status as any; 
    }

    const rangeStr = param.reference_range.trim();
    
    // Parse range like "0.70 - 1.30"
    if (rangeStr.includes('-')) {
        const parts = rangeStr.split('-');
        if (parts.length === 2) {
            const minStr = parts[0].replace(/[^0-9.]/g, '');
            const maxStr = parts[1].replace(/[^0-9.]/g, '');
            const min = parseFloat(minStr);
            const max = parseFloat(maxStr);
            
            if (!isNaN(min) && !isNaN(max)) {
                if (val < min) return 'low';
                if (val > max) return 'high';
                return 'normal';
            }
        }
    } 
    // Parse range like "< 1.0"
    else if (rangeStr.startsWith('<')) {
        const maxStr = rangeStr.replace('<', '').replace(/[^0-9.]/g, '');
        const max = parseFloat(maxStr);
        if (!isNaN(max)) {
            if (val >= max) return 'high';
            return 'normal';
        }
    } 
    // Parse range like "> 5.0"
    else if (rangeStr.startsWith('>')) {
        const minStr = rangeStr.replace('>', '').replace(/[^0-9.]/g, '');
        const min = parseFloat(minStr);
        if (!isNaN(min)) {
            if (val <= min) return 'low';
            return 'normal';
        }
    }

    // Fallback if parsing fails
    if (param.status === 'abnormal') return 'high';
    return param.status as any;
};

// Strips Unicode emojis from text for jsPDF which only supports Latin-1 characters
export const stripEmojis = (text: string): string => {
    if (!text) return '';
    
    // Explicit replacements for common AI generated lists
    let cleaned = text
        .replace(/⚠️/g, 'Warning: ')
        .replace(/🚨/g, 'Alert: ')
        .replace(/📋/g, 'Note: ')
        .replace(/✅/g, 'Yes ')
        .replace(/✓/g, 'Yes ')
        .replace(/ℹ️/g, 'Info: ')
        .replace(/★/g, '*');
        
    // Replace common typographic characters that are > 255 but common in text
    cleaned = cleaned
        .replace(/[\u2018\u2019]/g, "'") // smart single quotes
        .replace(/[\u201C\u201D]/g, '"') // smart double quotes
        .replace(/[\u2013\u2014]/g, '-') // en and em dashes
        .replace(/\u2026/g, '...')       // ellipsis
        .replace(/\u200B/g, '');         // zero width space
    
    // Default jsPDF fonts (Helvetica, Times, Courier) only support ISO-8859-1 (Latin-1).
    // Characters > 255 will cause jsPDF to fail rendering the string properly, producing garbage or skipping.
    // So we strip any remaining character that is outside \x00-\xFF. 
    // This safely keeps letters, numbers, basic punctuation, and Latin-1 symbols like µ and °.
    cleaned = cleaned.replace(/[^\x00-\xFF]/g, '');
    
    // Trim extra spaces left from stripping emojis
    return cleaned.replace(/\s{2,}/g, ' ').trim();
};
