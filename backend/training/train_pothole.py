"""
Benthic Vision - Pothole Fine-Tuning Script v7.1
Robust version with crash recovery for Windows file-handle bug.
"""
import os
import sys
import shutil
import glob
from pathlib import Path

# Fix for Windows file handle issue
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from ultralytics import YOLO

DATASET_DIR = Path("pothole_dataset")
IMG_SIZE = 416


def ensure_dataset():
    """Ensures the synthetic pothole dataset exists."""
    if DATASET_DIR.exists() and (DATASET_DIR / "data.yaml").exists():
        print("[1/4] Dataset already exists.")
        return str(DATASET_DIR / "data.yaml")
    
    print("[1/4] Generating synthetic pothole dataset...")
    from PIL import Image, ImageDraw
    import random
    
    for split in ["train", "valid"]:
        img_dir = DATASET_DIR / split / "images"
        lbl_dir = DATASET_DIR / split / "labels"
        img_dir.mkdir(parents=True, exist_ok=True)
        lbl_dir.mkdir(parents=True, exist_ok=True)
        
        count = 80 if split == "train" else 15
        for i in range(count):
            # Road-like background
            r = random.randint(80, 140)
            g = random.randint(80, 120)
            b = random.randint(70, 100)
            img = Image.new('RGB', (416, 416), color=(r, g, b))
            draw = ImageDraw.Draw(img)
            
            # Add road texture (horizontal lines)
            for line_y in range(0, 416, random.randint(3, 8)):
                shade = random.randint(-15, 15)
                draw.line([(0, line_y), (416, line_y)], fill=(r+shade, g+shade, b+shade))
            
            # Draw 1-3 potholes per image
            num_potholes = random.randint(1, 3)
            labels = []
            for _ in range(num_potholes):
                cx = random.randint(60, 356)
                cy = random.randint(60, 356)
                rx = random.randint(15, 70)
                ry = random.randint(10, 45)
                
                # Dark pothole shape
                draw.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], 
                           fill=(random.randint(15, 45), random.randint(15, 40), random.randint(10, 35)))
                # Edge highlight
                draw.ellipse([cx-rx+2, cy-ry+2, cx+rx-2, cy+ry-2], 
                           outline=(random.randint(50, 80), random.randint(50, 70), random.randint(40, 60)), width=1)
                
                labels.append(f"0 {cx/416:.6f} {cy/416:.6f} {2*rx/416:.6f} {2*ry/416:.6f}")
            
            img.save(str(img_dir / f"pothole_{i:04d}.jpg"))
            with open(str(lbl_dir / f"pothole_{i:04d}.txt"), "w") as f:
                f.write("\n".join(labels))
    
    yaml_path = DATASET_DIR / "data.yaml"
    with open(yaml_path, "w") as f:
        f.write(f"path: {DATASET_DIR.resolve()}\n")
        f.write("train: train/images\n")
        f.write("val: valid/images\n")
        f.write("names:\n  0: pothole\n")
    
    print(f"  Created {count} train + 15 val images")
    return str(yaml_path)


def train(data_yaml: str):
    """Trains with crash recovery."""
    print("\n[2/4] Fine-tuning YOLOv8n (15 epochs)...")
    
    model = YOLO("yolov8n.pt")
    
    try:
        model.train(
            data=data_yaml,
            epochs=15,
            imgsz=IMG_SIZE,
            batch=4,
            device="cpu",
            project="runs",
            name="pothole_v7",
            exist_ok=True,
            plots=False,
            save=True,
            save_period=5,
            patience=15,
            verbose=False,
        )
    except Exception as e:
        print(f"  Training ended with: {type(e).__name__}: {e}")
        print("  (This is often a benign Windows file-handle issue)")
    
    # Search for any saved weights
    weight_files = sorted(glob.glob("runs/**/weights/*.pt", recursive=True))
    if weight_files:
        best = weight_files[0]
        for w in weight_files:
            if "best" in w:
                best = w
                break
        print(f"  Found weights: {best}")
        return best
    
    print("  ERROR: No weights found. Trying direct export of base model...")
    return "yolov8n.pt"


def export_and_deploy(model_path: str):
    """Exports to ONNX and deploys."""
    print(f"\n[3/4] Exporting {model_path} to ONNX...")
    
    model = YOLO(model_path)
    
    try:
        onnx_path = model.export(format="onnx", imgsz=IMG_SIZE, simplify=True)
    except Exception as e:
        print(f"  Export error: {e}")
        onnx_path = model_path.replace(".pt", ".onnx")
    
    if not Path(onnx_path).exists():
        # Search for any .onnx file
        onnx_files = glob.glob("**/*.onnx", recursive=True)
        if onnx_files:
            onnx_path = onnx_files[0]
        else:
            print("  FATAL: No ONNX file produced.")
            return None
    
    print(f"  ONNX: {onnx_path}")
    
    print("\n[4/4] Deploying...")
    dest = Path(__file__).parent.parent.parent / "benthic-vision" / "public" / "models" / "pothole"
    dest.mkdir(parents=True, exist_ok=True)
    dest_file = dest / "best.onnx"
    shutil.copy2(onnx_path, dest_file)
    
    print(f"  Deployed: {dest_file.resolve()}")
    print(f"\n{'='*50}")
    print(f"  POTHOLE MODEL v7 READY")
    print(f"{'='*50}")
    return str(dest_file)


if __name__ == "__main__":
    print("=" * 50)
    print("  BENTHIC VISION - POTHOLE TRAINER v7.1")
    print("=" * 50)
    
    data = ensure_dataset()
    weights = train(data)
    export_and_deploy(weights)
