import os
import json
from dotenv import load_dotenv
from PIL import Image
from google import genai
from google.genai import types

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("ERROR: GEMINI_API_KEY not found in .env file.")
    exit(1)

client = genai.Client(api_key=API_KEY)

def analyze_combination(marble_path, eye_path, hat_path, arms_path):
    print(f"Uploading images for analysis...")
    
    # We will just pass the local file paths directly to the Gemini API
    # using the recommended approach for local files
    
    prompt = """
    You are an expert character artist and rigger.
    I am providing you with 4 transparent PNG layers for a character:
    1. A Base Marble
    2. Eyes
    3. A Hat
    4. Arms & Legs
    
    They were drawn at different, mismatched scales and positions. 
    Your job is to visually analyze their shapes and output the mathematically perfect CSS-style transforms (x, y, scale) to align them into a cohesive character.
    
    Assume all images are rendered inside a shared 1000x1000 bounding box, and the transforms shift them from the center.
    
    Respond ONLY with valid JSON containing the optimal transform values.
    Example:
    {
      "transforms": {
        "marble": { "x": 0, "y": 0, "scale": 1.5 },
        "eyes": { "x": 0, "y": -50, "scale": 0.8 },
        "hat": { "x": 0, "y": -350, "scale": 1.2 },
        "armsLegs": { "x": 0, "y": 200, "scale": 1.0 }
      }
    }
    """
    
    # We need to upload the files to the GenAI File API for vision analysis
    try:
        marble_file = client.files.upload(file=marble_path, config={'display_name': 'Marble'})
        eye_file = client.files.upload(file=eye_path, config={'display_name': 'Eyes'})
        hat_file = client.files.upload(file=hat_path, config={'display_name': 'Hat'})
        arms_file = client.files.upload(file=arms_path, config={'display_name': 'ArmsLegs'})
        
        print("Asking Vision AI to calculate coordinates...")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                prompt,
                marble_file,
                eye_file,
                hat_file,
                arms_file
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        print("\n--- VISION AI RESULT ---")
        print(response.text)
        
    except Exception as e:
        print(f"Error during API call: {e}")

if __name__ == '__main__':
    in_dir = os.path.join('frontend', 'public', 'assets_raw')
    
    m = os.path.join(in_dir, 'Marble1.png')
    e = os.path.join(in_dir, 'Eye1.png')
    h = os.path.join(in_dir, 'Hat1.png')
    a = os.path.join(in_dir, 'ArmsLegs1.png')
    
    analyze_combination(m, e, h, a)
