def analyze_lab_values(values: dict, test_type: str):
    """Placeholder - replace with actual model"""
    
    # Reference ranges
    reference_ranges = {
        "cbc": {
            "wbc": (4000, 11000),
            "rbc": (4.5, 5.5),
            "hemoglobin": (13.5, 17.5),
            "hematocrit": (38.8, 50),
            "platelets": (150000, 450000),
            "mcv": (80, 100)
        },
        "metabolic": {
            "glucose": (70, 99),
            "calcium": (8.5, 10.2),
            "sodium": (135, 145),
            "potassium": (3.5, 5.0)
        }
        # Add others as needed
    }
    
    current_ranges = reference_ranges.get(test_type, {})
    
    # Check if values are in range
    all_normal = True
    parameters = []
    
    for param, value in values.items():
        param_key = param.lower()
        if param_key in current_ranges:
            min_val, max_val = current_ranges[param_key]
            is_normal = min_val <= float(value) <= max_val
            all_normal = all_normal and is_normal
            
            # Calculate percentage within range
            if max_val != min_val:
                percentage = ((float(value) - min_val) / (max_val - min_val)) * 100
                percentage = max(0, min(100, percentage))
            else:
                percentage = 50
            
            parameters.append({
                "name": param.upper(),
                "value": value,
                "reference_range": f"{min_val}-{max_val}",
                "status": "normal" if is_normal else "abnormal",
                "percentage": percentage
            })
        else:
             parameters.append({
                "name": param.upper(),
                "value": value,
                "reference_range": "N/A",
                "status": "unknown",
                "percentage": 50
            })
    
    return {
        "assessment": "Normal" if all_normal else "Abnormal",
        "confidence": 0.95 if all_normal else 0.87,
        "parameters": parameters,
        "interpretation": "All parameters within normal limits." if all_normal else "Some abnormalities detected.",
        "recommendations": ["Routine checkup"] if all_normal else ["Consult a specialist"]
    }
