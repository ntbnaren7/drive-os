"""
Pothole Auto-Labeler Framework
Analyzes user-provided test images, resizes to 640x640, and uses Computer Vision (OpenCV)
to detect the prominent dark "crater" inside the frame, automatically generating YOLO YOLO labels.
"""
import os
import cv2
import numpy as np
from pathlib import Path
import shutil

ENGINE_DIR = Path(r"d:\DriveOS\pothole-ml-engine")
UPLOADS_DIR = ENGINE_DIR / "data" / "user_uploads"
TRAIN_IMG_DIR = ENGINE_DIR / "data" / "train" / "images"
TRAIN_LBL_DIR = ENGINE_DIR / "data" / "train" / "labels"
VALID_IMG_DIR = ENGINE_DIR / "data" / "valid" / "images"
VALID_LBL_DIR = ENGINE_DIR / "data" / "valid" / "labels"

def auto_label_images():
    print("==================================================")
    print("  POTHOLE ML ENGINE - AUTO LABELING PIPELINE")
    print("==================================================")
    
    # Ensure dirs exist
    TRAIN_IMG_DIR.mkdir(parents=True, exist_ok=True)
    TRAIN_LBL_DIR.mkdir(parents=True, exist_ok=True)
    
    images = []
    for ext in ['*.jpg', '*.JPG', '*.jpeg', '*.png', '*.webp', '*.avif']:
        images.extend(UPLOADS_DIR.glob(ext))
        
    print(f"Found {len(images)} images in user_uploads.")
    if len(images) == 0:
        print("No images to process.")
        return
        
    success_count = 0
    total = len(images)
    
    for idx, img_path in enumerate(images):
        # We need to use PIL or cv2 to load. cv2 natively struggles with avif/webp sometimes
        # depending on build, but recent OpenCV 4.x handles webp fine.
        img = cv2.imread(str(img_path))
        
        # Fallback if cv2 fails to read avif for instance
        if img is None:
            try:
                from PIL import Image
                pil_img = Image.open(str(img_path)).convert('RGB')
                img = np.array(pil_img)
                img = img[:, :, ::-1].copy() # RGB to BGR for OpenCV
            except Exception as e:
                print(f"  [!] Skipping {img_path.name} - could not read. {e}")
                continue
                
        # 1. Standardize resolution to 640x640 for v8s
        img_640 = cv2.resize(img, (640, 640))
        gray = cv2.cvtColor(img_640, cv2.COLOR_BGR2GRAY)
        
        # 2. Process image to find the "Crater" (dark, jagged shape)
        blurred = cv2.GaussianBlur(gray, (15, 15), 0)
        
        # Use an adaptive threshold or a low global threshold to isolate "black" asphalt holes
        _, thresh = cv2.threshold(blurred, 90, 255, cv2.THRESH_BINARY_INV)
        
        # Close small holes
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        morphed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        contours, _ = cv2.findContours(morphed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best_bbox = None
        max_area = 0
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            x, y, w, h = cv2.boundingRect(cnt)
            
            # Pothole heuristics:
            # 1. Not tiny noise (area < 1000)
            # 2. Not the entire screen border (area > 300000)
            # 3. Not touching the absolute edges (x > 5, y > 5)
            if 1500 < area < 250000:
                if x > 10 and y > 10 and (x+w) < 630 and (y+h) < 630:
                    if area > max_area:
                        max_area = area
                        best_bbox = (x, y, w, h)
                        
        if best_bbox:
            x, y, w, h = best_bbox
            # Convert to YOLO format: class_id cx_norm cy_norm w_norm h_norm
            cx = (x + w / 2) / 640.0
            cy = (y + h / 2) / 640.0
            wn = w / 640.0
            hn = h / 640.0
            
            # Save final standardized image
            new_name = f"user_auto_{idx:03d}"
            
            # Save 80% to train, 20% to valid
            is_valid = (idx % 5 == 0)
            
            target_img = VALID_IMG_DIR / f"{new_name}.jpg" if is_valid else TRAIN_IMG_DIR / f"{new_name}.jpg"
            target_lbl = VALID_LBL_DIR / f"{new_name}.txt" if is_valid else TRAIN_LBL_DIR / f"{new_name}.txt"
            
            # Write standardized 640x640 JPEG
            cv2.imwrite(str(target_img), img_640)
            
            # Write label
            with open(target_lbl, "w") as f:
                f.write(f"0 {cx:.6f} {cy:.6f} {wn:.6f} {hn:.6f}\n")
                
            success_count += 1
        else:
            print(f"  [~] No clear pothole signature found in {img_path.name}")
            
    print(f"\n[DONE] Successfully labeled and preprocessed {success_count}/{total} user images.")

if __name__ == "__main__":
    auto_label_images()
