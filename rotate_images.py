import os
from PIL import Image

# Define the directory containing the images
image_dir = 'img/receipts/ueno_geisai'
output_dir = 'img/receipts/ueno_geisai_rotated'

# Create the output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Get and sort the list of files in the image directory
filenames = sorted(os.listdir(image_dir))

# Iterate over all sorted files in the image directory
for index, filename in enumerate(filenames):
    if filename.endswith('.png') or filename.endswith('.jpg') or filename.endswith('.jpeg'):
        image_path = os.path.join(image_dir, filename)
        with Image.open(image_path) as img:
            # Check the aspect ratio
            aspect_ratio = img.width / img.height
            if aspect_ratio < 1/6:
                print(f'Skipping image due to aspect ratio: {filename}')
                continue

            # Resize the image proportionally so that the width is 150px
            new_width = 150
            new_height = int((new_width / img.width) * img.height)
            resized_img = img.resize((new_width, new_height), Image.LANCZOS)

            # Check the new aspect ratio and skip if height is over 6 times the width
            if new_height > 6 * new_width:
                print(f'Skipping image due to new aspect ratio: {filename}')
                continue

            # Generate a new shorter name for the image with 4 digits
            new_filename = f'{index + 1:04}.jpg'
            output_path = os.path.join(output_dir, new_filename)

            # Save the resized image to the output directory
            resized_img.save(output_path)
            print(f'Processed and saved: {new_filename}')