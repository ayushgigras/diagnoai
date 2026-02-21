import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from PIL import Image
import os
import pandas as pd

# CONFIG
DATA_DIR = "data/images"
LABELS_FILE = "data/labels.csv"
BATCH_SIZE = 16
NUM_EPOCHS = 10
LEARNING_RATE = 1e-4
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
SAVE_PATH = "../models_weights/xray/model.pth"

class ChestXrayDataset(Dataset):
    def __init__(self, csv_file, root_dir, transform=None):
        """
        Args:
            csv_file (string): Path to the csv file with annotations.
            root_dir (string): Directory with all the images.
            transform (callable, optional): Optional transform to be applied on a sample.
        """
        self.labels_frame = pd.read_csv(csv_file)
        self.root_dir = root_dir
        self.transform = transform
        
        # Assume columns are: Image Index, Finding Labels
        # We need to process "Finding Labels" which might be pipe separated "Infiltration|Mass"
        # For simplicity in this starter script, we assume Single Label or formatted columns

    def __len__(self):
        return len(self.labels_frame)

    def __getitem__(self, idx):
        img_name = os.path.join(self.root_dir, self.labels_frame.iloc[idx, 0])
        image = Image.open(img_name).convert('RGB')
        
        # Dummy label parsing - User needs to adapt this to their specific CSV format
        # This assumes the 2nd column is the target class index
        label = int(self.labels_frame.iloc[idx, 1]) 
        
        if self.transform:
            image = self.transform(image)
            
        return image, label

def train_model():
    print(f"Starting training on {DEVICE}...")
    
    # 1. Prepare Data
    if not os.path.exists(DATA_DIR) or not os.path.exists(LABELS_FILE):
        print("Data directory or labels file not found.")
        print(f"Please place images in {DATA_DIR} and labels in {LABELS_FILE}")
        return

    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    dataset = ChestXrayDataset(csv_file=LABELS_FILE, root_dir=DATA_DIR, transform=transform)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    # 2. Setup Model
    model = models.densenet121(weights=models.DenseNet121_Weights.IMAGENET1K_V1)
    num_ftrs = model.classifier.in_features
    # Assume 14 classes for standard ChestX-ray14
    model.classifier = nn.Linear(num_ftrs, 14) 
    model = model.to(DEVICE)
    
    criterion = nn.BCEWithLogitsLoss() # Good for multi-label
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    # 3. Training Loop
    for epoch in range(NUM_EPOCHS):
        model.train()
        running_loss = 0.0
        
        for inputs, labels in dataloader:
            inputs = inputs.to(DEVICE)
            # Labels need to be one-hot or proper shape for BCE
            labels = labels.to(DEVICE).float() 
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            
        epoch_loss = running_loss / len(dataset)
        print(f"Epoch {epoch}/{NUM_EPOCHS - 1} | Loss: {epoch_loss:.4f}")
        
    # 4. Save
    os.makedirs(os.path.dirname(SAVE_PATH), exist_ok=True)
    torch.save(model.state_dict(), SAVE_PATH)
    print(f"Model saved to {SAVE_PATH}")

if __name__ == "__main__":
    train_model()
