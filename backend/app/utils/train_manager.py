import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from PIL import Image
import os
import pandas as pd
import argparse

# --- CONFIGURATION (Default) ---
# Can be overridden by command line args
BATCH_SIZE = 16
NUM_EPOCHS = 10
LEARNING_RATE = 1e-4
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- DATASET CLASSES ---

class MedicalImageDataset(Dataset):
    def __init__(self, csv_file, root_dir, transform=None):
        """
        Generic Dataset Loader.
        Expects CSV format: filename, label_index (or multi-hot vector string)
        """
        self.labels_frame = pd.read_csv(csv_file)
        self.root_dir = root_dir
        self.transform = transform

    def __len__(self):
        return len(self.labels_frame)

    def __getitem__(self, idx):
        img_name = os.path.join(self.root_dir, self.labels_frame.iloc[idx, 0])
        try:
            image = Image.open(img_name).convert('RGB')
        except Exception as e:
            print(f"Error loading image {img_name}: {e}")
            # Return a blank replacement or handle error appropriately in real training
            image = Image.new('RGB', (224, 224))
        
        # Assume 2nd column is the target class index (Simple Classification)
        # For MURA (Bone): 0=Normal, 1=Abnormal
        # For Dental: 0=Caries, 1=No Caries, etc.
        try:
            label = int(self.labels_frame.iloc[idx, 1])
        except ValueError:
            # Handle multi-label usage if needed (e.g. "0 1 0 0")
            label = torch.tensor([float(x) for x in str(self.labels_frame.iloc[idx, 1]).split()])

        if self.transform:
            image = self.transform(image)
            
        return image, label

# --- TRAINING FUNCTION ---

def train_model(domain, data_dir, labels_file, num_classes):
    print(f"Starting training for domain: {domain.upper()} on {DEVICE}...")
    
    save_path = f"../../models_weights/{domain}/model.pth"
    
    # 1. Validation
    if not os.path.exists(data_dir) or not os.path.exists(labels_file):
        print(f"ERROR: Data not found for {domain}.")
        print(f" Expected Structure:")
        print(f"  - Images: {data_dir}")
        print(f"  - CSV:    {labels_file}")
        return

    # 2. Pipeline
    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    dataset = MedicalImageDataset(csv_file=labels_file, root_dir=data_dir, transform=transform)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    # 3. Model Architecture (DenseNet121 is standard for most medical imaging)
    model = models.densenet121(weights=models.DenseNet121_Weights.IMAGENET1K_V1)
    num_ftrs = model.classifier.in_features
    model.classifier = nn.Linear(num_ftrs, num_classes) 
    model = model.to(DEVICE)
    
    # Logic for Loss Function selection
    # Use CrossEntropy for single-label (Normal vs Abnormal)
    # Use BCEWithLogits for multi-label (Pneumonia + Effusion)
    sample_label = dataset[0][1]
    if isinstance(sample_label, torch.Tensor) and sample_label.numel() > 1:
        print("Detected Multi-Label task. Using BCEWithLogitsLoss.")
        criterion = nn.BCEWithLogitsLoss()
    else:
        print("Detected Single-Label task. Using CrossEntropyLoss.")
        criterion = nn.CrossEntropyLoss()
        
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    # 4. Training Loop
    for epoch in range(NUM_EPOCHS):
        model.train()
        running_loss = 0.0
        
        for i, (inputs, labels) in enumerate(dataloader):
            inputs = inputs.to(DEVICE)
            if isinstance(criterion, nn.BCEWithLogitsLoss):
                labels = labels.to(DEVICE).float()
            else:
                labels = labels.to(DEVICE).long()
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            
            if i % 10 == 0:
                print(f" Batch {i}/{len(dataloader)} Loss: {loss.item():.4f}")
            
        epoch_loss = running_loss / len(dataset)
        print(f"Epoch {epoch+1}/{NUM_EPOCHS} | Loss: {epoch_loss:.4f}")
        
    # 5. Save
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    torch.save(model.state_dict(), save_path)
    print(f"SUCCESS: Model saved to {save_path}")

def main():
    parser = argparse.ArgumentParser(description='Train Medical AI Models')
    parser.add_argument('--domain', type=str, required=True, 
                        choices=['chest', 'bone', 'dental', 'abdomen', 'spine'],
                        help='The anatomy domain to train')
    parser.add_argument('--data_dir', type=str, required=True, help='Path to image folder')
    parser.add_argument('--labels_file', type=str, required=True, help='Path to labels CSV')
    parser.add_argument('--classes', type=int, default=2, help='Number of output classes')
    
    args = parser.parse_args()
    
    train_model(args.domain, args.data_dir, args.labels_file, args.classes)

if __name__ == "__main__":
    main()
