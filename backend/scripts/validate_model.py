#!/usr/bin/env python3
import argparse
import sys
import numpy as np
import torch
import torchvision
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score

try:
    import torchxrayvision as xrv
except ImportError:
    print("Error: torchxrayvision is not installed. Please install it with:")
    print("pip install torchxrayvision torchvision scikit-learn")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Validate DenseNet121 on NIH ChestX-ray14 dataset.")
    parser.add_argument("--img-dir", type=str, required=True, 
                        help="Path to the directory containing NIH images")
    parser.add_argument("--csv-path", type=str, required=True, 
                        help="Path to Data_Entry_2017.csv")
    parser.add_argument("--batch-size", type=int, default=32, 
                        help="Batch size for DataLoader")
    parser.add_argument("--workers", type=int, default=4, 
                        help="Number of background workers for DataLoader")
    parser.add_argument("--limit", type=int, default=None, 
                        help="Limit the number of samples processed (for testing the script)")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Evaluation Device: {device}")

    # 1. Load the Model
    print("[*] Loading torchxrayvision DenseNet121 model...")
    model = xrv.models.DenseNet(weights="densenet121-res224-all")
    model = model.to(device)
    model.eval()

    # 2. Prepare Data Transformations
    transform = torchvision.transforms.Compose([
        xrv.datasets.XRayCenterCrop(),
        xrv.datasets.XRayResizer(224)
    ])

    # 3. Load the NIH Dataset
    print(f"[*] Loading NIH dataset from {args.img_dir}")
    try:
        dataset = xrv.datasets.NIH_Dataset(
            imgpath=args.img_dir,
            csvpath=args.csv_path,
            transform=transform
        )
    except Exception as e:
        print(f"[-] Failed to load dataset: {e}")
        sys.exit(1)

    # Restrict to model pathologies that exist in the NIH dataset
    # torchxrayvision models output multiple pathologies. We need to match model indices to dataset indices.
    pathologies = list(set(model.pathologies).intersection(set(dataset.pathologies)))
    pathologies.sort()
    
    if args.limit:
        print(f"[*] Limiting dataset to first {args.limit} samples.")
        dataset = torch.utils.data.Subset(dataset, range(args.limit))
    else:
        print(f"[*] Found {len(dataset)} images in the dataset.")

    dataloader = DataLoader(
        dataset, 
        batch_size=args.batch_size, 
        shuffle=False, 
        num_workers=args.workers, 
        pin_memory=True if torch.cuda.is_available() else False
    )

    all_preds = []
    all_targets = []

    print("[*] Starting evaluation loop...")
    with torch.no_grad():
        for i, batch in enumerate(dataloader):
            images = batch["img"].to(device)       # [B, 1, 224, 224]
            targets_b = batch["lab"].numpy()       # [B, num_dataset_pathologies]
            
            # Forward pass
            outputs = model(images).cpu().numpy()  # [B, num_model_pathologies]
            
            all_preds.append(outputs)
            all_targets.append(targets_b)
            
            if (i + 1) % 10 == 0:
                print(f"    Processed { (i + 1) * args.batch_size } samples...")

    # Concatenate all batches
    all_preds = np.concatenate(all_preds, axis=0)       # [N, num_model_pathologies]
    all_targets = np.concatenate(all_targets, axis=0)   # [N, num_dataset_pathologies]

    print("\n" + "="*50)
    print(f"{'Pathology':<25} | {'AUC Score':<15}")
    print("-" * 50)

    # 4. Calculate AUC per pathology
    mean_auc = 0.0
    valid_pathologies = 0

    for path in pathologies:
        # Get index in the model outputs
        model_idx = model.pathologies.index(path)
        # Get index in the ground truth dataset labels
        # Note: if evaluating wrapped subset, use dataset.dataset.pathologies to find idx
        if hasattr(dataset, 'dataset'): # It's a Subset
            ds_idx = dataset.dataset.pathologies.index(path)
        else:
            ds_idx = dataset.pathologies.index(path)
        
        y_true = all_targets[:, ds_idx]
        y_score = all_preds[:, model_idx]

        # In NIH Dataset, labels are 1.0 (positive), 0.0 (negative), and sometimes NaN
        # We need to filter out NaN values for AUC calculation
        valid_mask = ~np.isnan(y_true)
        y_true_valid = y_true[valid_mask]
        y_score_valid = y_score[valid_mask]

        if len(np.unique(y_true_valid)) > 1: # Requires at least one positive and one negative sample
            auc = roc_auc_score(y_true_valid, y_score_valid)
            print(f"{path:<25} | {auc:.4f}")
            mean_auc += auc
            valid_pathologies += 1
        else:
            print(f"{path:<25} | {'N/A (No pos/neg pair)':<15}")

    print("-" * 50)
    if valid_pathologies > 0:
        print(f"{'Mean AUC':<25} | {mean_auc / valid_pathologies:.4f}")
    print("="*50 + "\n")

if __name__ == "__main__":
    main()
