import asyncio
import os
import torch
from app.services.xray_service import predict_xray

async def run_test(image_path):
    print(f"\n======================================")
    print(f"Testing {image_path}...")
    
    try:
        if not os.path.exists(image_path):
            print(f"Error: Could not find {image_path}")
            return
            
        with open(image_path, 'rb') as f:
            img_bytes = f.read()
            
        print("Running prediction...")
        res = await predict_xray(img_bytes, 'chest')
        
        print('\n--- FINAL PREDICTION ---')
        print('Prediction:', res['prediction'])
        print('Confidence:', res['confidence'])
        print('Findings:')
        for f in res['findings']:
            print(f"  - {f['condition']}: {f['score']:.4f} ({f['severity']})")
            
    except Exception as e:
        print("Error:", e)

async def main():
    await run_test('real_xray.jpg')
    await run_test('real_xray_2.jpg')

if __name__ == '__main__':
    asyncio.run(main())
