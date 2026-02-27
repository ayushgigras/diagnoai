def analyze_lab_values(values: list):
    """Analyzes a dynamic list of lab parameters using Gemini."""
    
    import os
    import json
    import google.generativeai as genai
    import traceback
    
    # Base structure
    parameters = []
    
    # Validate input is a list
    if not isinstance(values, list):
        if isinstance(values, dict):
            # Fallback if old format is passed somehow
             values = [{"parameter_name": k, "result_value": v, "unit": "", "reference_range": ""} for k, v in values.items()]
        else:
             values = []
             
    for item in values:
        parameters.append({
            "name": item.get("parameter_name", "Unknown Parameter").upper(),
            "value": item.get("result_value", 0),
            "unit": item.get("unit", ""),
            "reference_range": item.get("reference_range", "N/A"),
            "status": "unknown",
            "percentage": 50
        })

    prompt_data = {
        "parameters": parameters
    }

    assessment = "Abnormal"
    interpretation = "Unable to generate detailed clinical interpretation."
    recommendations = ["Consult your healthcare provider."]

    # Try to generate AI explanation using Gemini
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
             print("ERROR: GEMINI_API_KEY is completely missing from environment variables.")
        else:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            
            prompt = f"""
            Act as an expert medical AI assistant. Analyze the following laboratory test parameters.
            For each parameter, look at the extracted `value` and its printed `reference_range`.
            
            Determine if each parameter is "normal", "abnormal", or "critical" based STRICTLY on its accompanied reference range.
            Also provide a short, easy-to-understand clinical interpretation of the OVERALL results in 2-3 sentences. 
            CRITICAL: The interpretation MUST be written in plain, patient-friendly English. Avoid dense medical jargon, but maintain a professional and reassuring tone. Do not use overly childish analogies (e.g. avoid saying 'tiny little buses'). Explain abnormal findings clearly and simply.
            Finally, provide an array of 1-3 short, actionable recommendations (also in simple, non-technical English).
            
            Format your response STRICTLY as JSON with these exact keys:
            {{
              "overall_assessment": "Normal" | "Borderline" | "Abnormal" | "Critical",
              "interpretation": "your text here",
              "recommendations": ["rec1", "rec2"],
              "assessed_parameters": [
                  {{
                      "name": "THE EXACT NAME FROM INPUT",
                      "status": "normal" | "abnormal" | "critical",
                      "percentage": 50 // Rough gauge of where it sits in the range (0 = min, 100 = max, or 0/100 if out of bounds)
                  }}
              ]
            }}

            Data:
            {json.dumps(prompt_data, indent=2)}
            """
            
            response = model.generate_content(prompt)
            # Find JSON block in response
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
                
            ai_data = json.loads(response_text)
            
            if "overall_assessment" in ai_data:
                assessment = ai_data["overall_assessment"]
            if "interpretation" in ai_data:
                interpretation = ai_data["interpretation"]
            if "recommendations" in ai_data and isinstance(ai_data["recommendations"], list):
                recommendations = ai_data["recommendations"]
                
            # Merge statuses back
            if "assessed_parameters" in ai_data:
                for ai_param in ai_data["assessed_parameters"]:
                    for p in parameters:
                        if p["name"] == ai_param.get("name"):
                            p["status"] = ai_param.get("status", "unknown")
                            p["percentage"] = ai_param.get("percentage", 50)
                            break
                            
    except Exception as e:
        print(f"Gemini API Error for Lab Explanation: {e}")
        traceback.print_exc()
    
    return {
        "assessment": assessment,
        "confidence": 0.95 if assessment == "Normal" else 0.87,
        "parameters": parameters,
        "interpretation": interpretation,
        "recommendations": recommendations 
    }
