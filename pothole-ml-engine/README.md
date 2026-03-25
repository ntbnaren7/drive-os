# 🧠 DriveOS: Pothole ML Engine

[![Python](https://img.shields.io/badge/python-3.11-blue.svg?logo=python&logoColor=white)](https://python.org)
[![PyTorch](https://img.shields.io/badge/pytorch-2.4.1%20|%20CUDA%2012.1-ee4c2c.svg?logo=pytorch)](https://pytorch.org)
[![YOLOv8](https://img.shields.io/badge/YOLO-v8s-red.svg)](https://ultralytics.com)

The `pothole-ml-engine` is the neural training ground for DriveOS. It manages the dataset, training configurations, and ONNX export pipeline for the YOLOv8s models used by the Benthic Vision nodes.

---

## 📈 ML Training Workflow

```mermaid
graph LR
    A[Raw User Uploads] --> B(Auto-Labelling Script)
    B --> C[YOLOv8 Dataset YAML]
    C --> D(Train: YOLOv8s)
    D -->|Weights .pt| E(Export: ONNX fp16/int8)
    E -->|Optimized .onnx| F[Benthic Deployment]
    
    subgraph Data-Ops
        A1[11.92, 79.62 GPS Tags] --> C
    end
```

---

## 🔬 Core Components

### 1. Training Pipeline (`train_pothole.py`)
Custom training script utilizing **Ultralytics YOLOv8s**. It is configured for:
- **Image Size**: 640px (Standard)
- **Epochs**: 50 (Fine-tuning)
- **Data Augmentation**: Specifically tuned for road glare, motion blur, and varied lighting (day/night).

### 2. Export Utility (`export_onnx.py`)
Converts PyTorch `.pt` weights into high-performance `.onnx` files compatible with `onnxruntime-web`.
- **Optimization**: Opset 17, Sim-mode enabled.

### 3. Dataset Management
The engine is trained on a proprietary set of localized road images, including 100+ manual snapshots of urban potholes.

---

## 🛠️ Tech Stack & Requirements

| Component | Tech | Logo | Version |
|-----------|------|------|---------|
| **Language** | Python | ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) | 3.11 |
| **Framework** | PyTorch | ![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white) | 2.4.1 |
| **Model** | Ultralytics | ![YOLO](https://img.shields.io/badge/YOLOv8s-red?style=for-the-badge) | Latest |
| **Hardware** | NVIDIA CUDA | ![CUDA](https://img.shields.io/badge/CUDA-76B900?style=for-the-badge&logo=nvidia&logoColor=white) | 12.1 |

---

## 🚦 Getting Started

1. Navigate to directory: `cd pothole-ml-engine`
2. Create Venv: `python -m venv venv`
3. Activate: `.\venv\Scripts\activate` (Windows)
4. Install: `pip install ultralytics onnx onnxruntime-gpu`
5. Run Training: `python scripts/train_pothole.py`

---

## 🔐 Security (`.gitignore`)
This directory contains large binary weights and sensitive metadata.
- `venv/`
- `runs/` (Training results and weights)
- `data/images/` (Original dataset)
- `*.pt` (PyTorch Weights)
- `*.onnx` (Exported Models)
