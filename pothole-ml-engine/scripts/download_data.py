"""
Pothole Dataset Downloader & Preparer
Downloads a curated, high-quality pothole dataset and prepares it for YOLOv8 training.
"""
import os
import urllib.request
import zipfile
import shutil
from pathlib import Path

# A robust public dataset link (YOLOv8 format)
DATASET_URL = "https://universe.roboflow.com/ds/JvFCbCEnNm?key=rzMNsfGxit"
DATA_DIR = Path(r"d:\DriveOS\pothole-ml-engine\data")

def download_dataset():
    print("[1/3] Downloading primary pothole dataset...")
    zip_path = DATA_DIR / "temp_dataset.zip"
    
    try:
        urllib.request.urlretrieve(DATASET_URL, str(zip_path))
        print(f"      Downloaded {zip_path.stat().st_size / 1024 / 1024:.1f} MB.")
    except Exception as e:
        print(f"      Download failed: {e}")
        print("      Generating synthetic 'dummy road' dataset for pipeline testing...")
        return generate_synthetic()
        
    print("[2/3] Extracting dataset...")
    extract_dir = DATA_DIR / "raw_extracted"
    with zipfile.ZipFile(str(zip_path), 'r') as z:
        z.extractall(str(extract_dir))
    zip_path.unlink()
    
    print("[3/3] Reorganizing into train/valid structure...")
    # Move files from raw_extracted to our standard data/train and data/valid dirs
    
    splits = ["train", "valid", "val"]
    files_moved = 0
    
    for split in splits:
        target_split = "valid" if split == "val" else split
        for img_path in extract_dir.rglob(f"{split}/images/*.*"):
            dest = DATA_DIR / target_split / "images" / img_path.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(img_path, dest)
            files_moved += 1
            
        for lbl_path in extract_dir.rglob(f"{split}/labels/*.txt"):
            dest = DATA_DIR / target_split / "labels" / lbl_path.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(lbl_path, dest)
            
    # Cleanup
    shutil.rmtree(extract_dir)
    print(f"      Moved {files_moved} images into target directories.")
    
    yaml_path = DATA_DIR / "dataset.yaml"
    with open(yaml_path, "w") as f:
        f.write(f"path: {DATA_DIR.resolve()}\n")
        f.write("train: train/images\n")
        f.write("val: valid/images\n")
        f.write("names:\n  0: pothole\n")
    
    print(f"Dataset ready: {yaml_path}")

def generate_synthetic():
    from PIL import Image, ImageDraw
    import random
    
    for split in ["train", "valid"]:
        img_dir = DATA_DIR / split / "images"
        lbl_dir = DATA_DIR / split / "labels"
        img_dir.mkdir(parents=True, exist_ok=True)
        lbl_dir.mkdir(parents=True, exist_ok=True)
        
        count = 100 if split == "train" else 20
        for i in range(count):
            img = Image.new('RGB', (640, 640), color=(random.randint(80, 140), random.randint(80, 120), random.randint(70, 100)))
            draw = ImageDraw.Draw(img)
            
            num_potholes = random.randint(1, 3)
            labels = []
            for _ in range(num_potholes):
                cx = random.randint(100, 540)
                cy = random.randint(100, 540)
                rx = random.randint(20, 100)
                ry = random.randint(15, 60)
                draw.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=(random.randint(20, 50), random.randint(20, 40), random.randint(15, 30)))
                labels.append(f"0 {cx/640:.6f} {cy/640:.6f} {2*rx/640:.6f} {2*ry/640:.6f}")
                
            img.save(str(img_dir / f"synth_{i:04d}.jpg"))
            with open(str(lbl_dir / f"synth_{i:04d}.txt"), "w") as f:
                f.write("\n".join(labels))
                
    yaml_path = DATA_DIR / "dataset.yaml"
    with open(yaml_path, "w") as f:
        f.write(f"path: {DATA_DIR.resolve()}\n")
        f.write("train: train/images\n")
        f.write("val: valid/images\n")
        f.write("names:\n  0: pothole\n")
    print(f"Synthetic dataset ready: {yaml_path}")

if __name__ == "__main__":
    download_dataset()
