import json
import os
from PIL import Image

def bake():
    layout_path = 'layout.json'
    if not os.path.exists(layout_path):
        print(f"Error: Could not find {layout_path}. Make sure you saved your 'Export Data' into a file named layout.json in the MCW folder.")
        return

    with open(layout_path, 'r') as f:
        data = json.load(f)
        
    transforms = data.get('transforms', {})
    
    in_dir = os.path.join('frontend', 'public', 'assets_raw')
    out_dir = os.path.join('frontend', 'public', 'assets')
    
    if not os.path.exists(in_dir):
        print(f"Error: Could not find {in_dir}.")
        return

    os.makedirs(out_dir, exist_ok=True)
    
    # Prefix mapping
    layers_def = [
        {'key': 'armsLegs', 'prefix': 'ArmsLegs', 'count': 6},
        {'key': 'marble', 'prefix': 'Marble', 'count': 18},
        {'key': 'eyes', 'prefix': 'Eye', 'count': 12},
        {'key': 'hat', 'prefix': 'Hat', 'count': 12},
    ]
    
    for layer in layers_def:
        for i in range(1, layer['count'] + 1):
            transform_key = f"{layer['key']}-{i}"
            t = transforms.get(transform_key, {'x': 0, 'y': 0, 'scale': 1})
            
            filename = f"{layer['prefix']}{i}.png"
            in_path = os.path.join(in_dir, filename)
            out_path = os.path.join(out_dir, filename)
            
            if not os.path.exists(in_path):
                print(f"Skipping {in_path}, not found.")
                continue
                
            try:
                img = Image.open(in_path).convert("RGBA")
            except Exception as e:
                print(f"Failed to open {in_path}: {e}")
                continue
                
            w, h = img.size
            
            # 1. CSS object-fit: contain mathematical equivalent inside 1000x1000
            contain_scale = min(1000/w, 1000/h)
            cw = w * contain_scale
            ch = h * contain_scale
            
            # 2. Apply Dev Tool's Transforms (IGNORE globalScale so they fill the canvas!)
            s = t['scale']
            nw = int(cw * s)
            nh = int(ch * s)
            
            if nw <= 0 or nh <= 0:
                print(f"Invalid scale for {filename}, skipping")
                continue
                
            # Resize image
            img_resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
            
            # 3. Calculate position (relative to 1000x1000 center)
            center_x = 500 + t['x']
            center_y = 500 + t['y']
            
            paste_x = int(center_x - (nw / 2))
            paste_y = int(center_y - (nh / 2))
            
            # 4. Paste into blank 1000x1000 transparent canvas
            canvas = Image.new('RGBA', (1000, 1000), (0, 0, 0, 0))
            canvas.paste(img_resized, (paste_x, paste_y), img_resized)
            
            canvas.save(out_path, "PNG")
            print(f"Baked -> {filename}")

if __name__ == '__main__':
    print("Starting Asset Baker...")
    bake()
    print("Done! All assets have been normalized.")
