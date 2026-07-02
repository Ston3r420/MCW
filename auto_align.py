import os
from PIL import Image

def get_artwork_bbox(img):
    # Extract alpha channel to find the bounding box of non-transparent pixels
    alpha = img.split()[-1]
    return alpha.getbbox()

def process_layer(in_dir, out_dir, prefix, count, target_width, paste_center_x, paste_center_y):
    for i in range(1, count + 1):
        filename = f"{prefix}{i}.png"
        in_path = os.path.join(in_dir, filename)
        out_path = os.path.join(out_dir, filename)
        
        if not os.path.exists(in_path):
            print(f"Skipping {filename}, not found.")
            continue
            
        try:
            img = Image.open(in_path).convert("RGBA")
        except Exception as e:
            print(f"Failed to open {filename}: {e}")
            continue
            
        bbox = get_artwork_bbox(img)
        if not bbox:
            print(f"Warning: {filename} is completely transparent!")
            continue
            
        # Crop to exact artwork boundaries
        cropped = img.crop(bbox)
        cw, ch = cropped.size
        
        # Calculate resize ratio to hit the target width
        ratio = target_width / float(cw)
        new_w = int(target_width)
        new_h = int(ch * ratio)
        
        # High quality resize
        resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Calculate paste coordinates (anchoring the artwork to its center point)
        paste_x = int(paste_center_x - (new_w / 2))
        paste_y = int(paste_center_y - (new_h / 2))
        
        # Create final 1000x1000 canvas
        canvas = Image.new('RGBA', (1000, 1000), (0, 0, 0, 0))
        canvas.paste(resized, (paste_x, paste_y), resized)
        
        canvas.save(out_path, "PNG")
        print(f"Auto-Aligned -> {filename}")

def run():
    in_dir = os.path.join('frontend', 'public', 'assets_raw')
    out_dir = os.path.join('frontend', 'public', 'assets')
    
    if not os.path.exists(in_dir):
        print(f"Error: Could not find {in_dir}")
        return

    os.makedirs(out_dir, exist_ok=True)
    
    # 1. Marbles: The base. Centered lower to leave room for hats.
    # Target Width: 500px. Paste Center: (500, 550)
    process_layer(in_dir, out_dir, 'Marble', 18, target_width=500, paste_center_x=500, paste_center_y=550)
    
    # 2. Arms & Legs: Usually wider than the marble, wrapped around it.
    # User requested: arms & legs need to come down.
    # Target Width: 650px. Paste Center: (500, 620)
    process_layer(in_dir, out_dir, 'ArmsLegs', 6, target_width=650, paste_center_x=500, paste_center_y=620)
    
    # 3. Eyes: Centered on the marble face.
    # User requested: eyes smaller.
    # Target Width: 200px. Paste Center: (500, 540)
    process_layer(in_dir, out_dir, 'Eye', 12, target_width=200, paste_center_x=500, paste_center_y=540)
    
    # 4. Hats: Sit on top of the marble.
    print("\nProcessing Hats with Bottom-Center anchoring...")
    for i in range(1, 13):
        filename = f"Hat{i}.png"
        in_path = os.path.join(in_dir, filename)
        out_path = os.path.join(out_dir, filename)
        
        if not os.path.exists(in_path): continue
            
        img = Image.open(in_path).convert("RGBA")
        bbox = get_artwork_bbox(img)
        if not bbox: continue
            
        cropped = img.crop(bbox)
        cw, ch = cropped.size
        
        # User requested: hat smaller.
        target_width = 280
        ratio = target_width / float(cw)
        new_w = int(target_width)
        new_h = int(ch * ratio)
        
        resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Anchor X is Center (500)
        paste_x = int(500 - (new_w / 2))
        
        # User requested: hats are too high. 
        # Move the bottom edge anchor further down to Y=420.
        # Marble top edge is ~300.
        paste_y = int(420 - new_h)
        
        canvas = Image.new('RGBA', (1000, 1000), (0, 0, 0, 0))
        canvas.paste(resized, (paste_x, paste_y), resized)
        canvas.save(out_path, "PNG")
        print(f"Auto-Aligned -> {filename}")

if __name__ == '__main__':
    print("Starting Algorithmic Auto-Aligner...")
    run()
    print("Done! All assets perfectly normalized.")
