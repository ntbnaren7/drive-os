"""
Pothole ML Engine (v8) - Training Script
Tailored for ROG Eye S and robustness against mobile phone screen displays.
"""
import os
import glob
from pathlib import Path

# Fix for Windows file handle issue that prevents saving weights
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from ultralytics import YOLO

ENGINE_DIR = Path(r"d:\DriveOS\pothole-ml-engine")
DATA_YAML = ENGINE_DIR / "data" / "dataset.yaml"
MODELS_DIR = ENGINE_DIR / "models"
RUNS_DIR = ENGINE_DIR / "runs"

def train_model():
    print(f"==================================================")
    print(f"  POTHOLE ML ENGINE (v8) - TRAINING PIPELINE")
    print(f"==================================================")
    
    if not DATA_YAML.exists():
        print("ERROR: dataset.yaml not found. Run download_data.py first.")
        return
        
    print(f"[1/3] Initializing YOLOv8s for ROG Eye S...")
    model = YOLO("yolov8s.pt")  # Start from COCO weights
    
    # Advanced augmentations specifically tailored for our phone-screen problem
    # - hsv_s and hsv_v: varying light handling (phone screen brightness)
    # - degrees and perspective: simulating car-mounted wide-angle geometry
    # - mosaic & mixup: forces model to learn texturess independent of background
    # - plots=False: avoids Windows file-handle crash in ultralytics CSV logger
    
    print(f"[2/3] Fine-tuning model (50 Epochs, FP16)...")
    try:
        model.train(
            data=str(DATA_YAML),
            epochs=50,
            imgsz=640,
            batch=8,          # Increased batch size since we have GPU VRAM
            device=0,         # Run on Primary NVIDIA GPU
            project=str(RUNS_DIR),
            name="pothole_v8_run",
            exist_ok=True,
            
            # --- Augmentations for Phone/Webcam Robustness ---
            hsv_h=0.015,      # image HSV-Hue augmentation
            hsv_s=0.7,        # image HSV-Saturation (high variance for screen glare)
            hsv_v=0.4,        # image HSV-Value (high variance for screen brightness)
            degrees=10.0,     # image rotation (+/- deg)
            perspective=0.001,# image perspective (fraction), matches ROG Eye wide angle
            mosaic=1.0,       # image mosaic (probability)
            mixup=0.2,        # image mixup (probability) - great for overlapping textures
            
            # --- Stability flags ---
            plots=False,      
            save=True,
            save_period=10,
            patience=15,
            verbose=False,
        )
    except Exception as e:
        print(f"  Training interrupted by error: {e}")
        print("  Checking if weights were persisted before crash...")
        
    print("\n[3/3] Locating Best Weights...")
    weight_files = sorted(glob.glob(str(RUNS_DIR / "**" / "weights" / "*.pt"), recursive=True))
    
    best_weight = None
    if weight_files:
        best_weight = weight_files[0]
        for w in weight_files:
            if "best.pt" in w:
                best_weight = w
                break
                
        print(f"  Found weights: {best_weight}")
        export_and_save(best_weight)
    else:
        print("  ERROR: No weights found. Training failed to persist.")

def export_and_save(pt_path: str):
    print(f"\n==================================================")
    print(f"  EXPORTING TO ONNX FOR EDGE DEPLOYMENT")
    print(f"==================================================")
    
    model = YOLO(pt_path)
    
    try:
        # half=True handles FP16 precision for faster inference
        onnx_file = model.export(format="onnx", imgsz=640, simplify=True, half=False)
    except Exception as e:
        print(f"  Export error: {e}")
        onnx_file = pt_path.replace(".pt", ".onnx")
        
    # Search for the exported ONNX file
    onnx_paths = glob.glob(str(Path(pt_path).parent.parent / "*.onnx"))
    if not onnx_paths:
        onnx_paths = glob.glob(str(Path(pt_path).parent.parent.parent / "**/*.onnx"), recursive=True)
        
    if onnx_paths:
        final_onnx = onnx_paths[0]
        import shutil
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        dest = MODELS_DIR / "pothole_v8s_best.onnx"
        shutil.copy2(final_onnx, dest)
        print(f"  Final Model Saved: {dest}")
        print(f"\n[DONE] v8 pipeline complete. Copy this .onnx to your frontend.")
    else:
        print("  Failed to locate ONNX export.")

if __name__ == "__main__":
    train_model()
