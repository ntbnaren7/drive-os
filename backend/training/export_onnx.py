"""
Benthic Vision - ONNX Export Script
Exports pre-trained YOLOv8n to ONNX for browser inference.
"""
from ultralytics import YOLO
from pathlib import Path
import shutil

print("=== BENTHIC VISION: ONNX EXPORT ===")

# Load pre-trained YOLOv8n (80 COCO classes including relevant road objects)
model = YOLO("yolov8n.pt")

# Export to ONNX
print("Exporting YOLOv8n to ONNX (416x416)...")
onnx_path = model.export(format="onnx", imgsz=416, simplify=True)
print(f"Exported: {onnx_path}")

# Deploy to frontend
dest = Path(__file__).parent.parent.parent / "benthic-vision" / "public" / "models" / "pothole"
dest.mkdir(parents=True, exist_ok=True)
shutil.copy2(onnx_path, dest / "best.onnx")
print(f"Deployed to: {(dest / 'best.onnx').resolve()}")
print("=== DONE ===")
