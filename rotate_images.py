import os
from PIL import Image

# Define the directory containing the images
image_dir = 'img/receipts/ueno_geisai'
output_dir = 'img/receipts/ueno_geisai_rotated'

# Create the output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Iterate over all files in the image directory
for filename in os.listdir(image_dir):
    if filename.endswith('.png') or filename.endswith('.jpg') or filename.endswith('.jpeg'):
        image_path = os.path.join(image_dir, filename)
        with Image.open(image_path) as img:
            # Check the aspect ratio
            aspect_ratio = img.width / img.height
            if aspect_ratio > 6:
                print(f'Skipping image due to aspect ratio: {filename}')
                continue

            # Rotate the image by 180 degrees
            rotated_img = img.rotate(180)

            # Save the rotated image to the output directory
            output_path = os.path.join(output_dir, filename)
            rotated_img.save(output_path)
            print(f'Processed and saved: {filename}')