import os
import cv2
import json
from PyQt5.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout, QMessageBox, QFileDialog, QLabel
from PIL import Image
import exifread
from datetime import datetime
from geopy.geocoders import LocationIQ
import argparse
import time
from geopy.exc import GeocoderTimedOut

# Initialize variables
current_image_index = 0
points = []
image_list = []
output_data = {}
rotation_data = {}
current_image = None
rotation_angle = 0
metadata_cache = {}  # Cache for location lookups
geolocator = LocationIQ(api_key="pk.e9bb865b22a60c092b271b79a74692c6")

# Use absolute paths to eliminate confusion
base_dir = "/Users/admin/Documents/GitHub/hal-xing.github.io"
image_folder = os.path.join(base_dir, "assets/img/projects/ground-breaking/originals")
processed_folder = os.path.join(base_dir, "assets/img/projects/ground-breaking")
metadata_file = os.path.join(base_dir, "assets/img/projects/ground-breaking/metadata_test.json")

# Add these lines
output_file = os.path.join(processed_folder, "points.json")
rotation_file = os.path.join(processed_folder, "rotation.json")

finished_folder = os.path.join(image_folder, "finished")

# Add near the start of your script
reset_signal_file = os.path.join(base_dir, "img/ground_breaking/.reset_complete")
if os.path.exists(reset_signal_file):
    print("Detected reset signal - clearing all cached data")
    output_data = {}
    points = []
    # Remove the signal file
    os.remove(reset_signal_file)

reset_signal_file = os.path.join(base_dir, "assets/img/projects/ground-breaking/.reset_complete")

# Create necessary directories
for folder in [base_dir, image_folder, processed_folder]:
    if not os.path.exists(folder):
        os.makedirs(folder)

# Create the finished folder if it doesn't exist
if not os.path.exists(finished_folder):
    os.makedirs(finished_folder)

# Add these variables beneath your initialization variables:
source_folder = None  # Will store the selected source folder
folder_label = None   # Will reference the folder label in the UI

# Don't load images at startup - wait for folder selection
image_list = []

# Load existing points if the file exists
if os.path.exists(output_file):
    with open(output_file, "r") as f:
        output_data = json.load(f)

# Load existing rotation data if the file exists
if os.path.exists(rotation_file):
    with open(rotation_file, "r") as f:
        rotation_data = json.load(f)

# IMPORTANT: Add this right after your initial variable declarations
# (around line 25-30, after defining output_data = {})

# Clear any previously cached data
output_data = {}

# If there's an existing metadata file, check if we need to preserve it
if os.path.exists(metadata_file):
    # Check if the file is empty or just contains {}
    try:
        with open(metadata_file, "r") as f:
            content = f.read().strip()
            if content and content != "{}":
                # If we're starting a new session, ask the user what to do
                if current_image_index == 0:
                    print("Found existing metadata. Starting with empty data.")
                    # We're intentionally NOT loading the old data
            else:
                print("Starting with fresh metadata")
    except:
        print("Error reading metadata file, starting fresh")

# Add these new global variables with your other initializations
existing_metadata = {}
is_editing_existing = False

# Add this function to load existing metadata at startup
def load_existing_metadata():
    """Load existing metadata file if it exists."""
    global existing_metadata
    if os.path.exists(metadata_file):
        try:
            with open(metadata_file, "r") as f:
                existing_metadata = json.load(f)
                print(f"Loaded existing metadata with {len(existing_metadata)} entries")
        except Exception as e:
            print(f"Error loading metadata: {e}")
            existing_metadata = {}

# Call this function early in your script
load_existing_metadata()

def save_metadata():
    """Save the comprehensive metadata to a JSON file."""
    # Load existing metadata
    existing_data = {}
    if os.path.exists(metadata_file):
        try:
            with open(metadata_file, "r") as f:
                existing_data = json.load(f)
        except json.JSONDecodeError:
            print("Warning: Could not parse existing metadata file, starting fresh.")
    
    # Update with the new data (preserving existing entries)
    merged_data = {**existing_data, **output_data}
    
    # Write the complete data back to file
    with open(metadata_file, "w") as f:
        json.dump(merged_data, f, indent=2)
    print(f"Updated metadata file with new image (total: {len(merged_data)} images)")

def draw_points(image, points):
    """Draw points on the image."""
    for point in points:
        cv2.circle(image, point, 5, (0, 0, 255), -1)

# Replace your existing click_event function with this enhanced version:
def click_event(event, x, y, flags, param):
    """Handle mouse click events to mark points."""
    global points, current_image
    
    if current_image is None:
        print("Error: No image loaded")
        return
        
    height, width = current_image.shape[:2]
    edge_threshold = height * 0.05

    if event == cv2.EVENT_LBUTTONDOWN:
        # Check if the mouse is close to the top or bottom edge
        if y <= edge_threshold:
            y = 0  # Snap to top edge
        elif y >= height - edge_threshold:
            y = height  # Snap to bottom edge
        
        # If we're adding a top or bottom point, enforce max 2 points
        if y == 0 or y == height:
            # For top/bottom points, only keep one per edge
            existing_top = None
            existing_bottom = None
            other_points = []
            
            for p in points:
                if p[1] == 0:
                    existing_top = p
                elif p[1] == height:
                    existing_bottom = p
                else:
                    other_points.append(p)
            
            # Replace existing point at same edge
            if y == 0 and existing_top:
                points.remove(existing_top)
            elif y == height and existing_bottom:
                points.remove(existing_bottom)
            
            # Limit to 2 points total if adding edge point
            if len(points) >= 2:
                # Keep only edge points or one non-edge point
                points = [p for p in points if p[1] == 0 or p[1] == height]
                if not points:
                    points = [other_points[0]]
        
        # Add point only if it's not already in the list
        if (x, y) not in points:
            print(f"Adding point at ({x}, {y})")  # Debug output
            points.append((x, y))
            
            # Create a copy of the image to draw on (prevent accumulation)
            display_image = current_image.copy()
            
            # Draw all points on the copy
            for point in points:
                # Draw a smaller, less intrusive point
                cv2.circle(display_image, point, 5, (0, 0, 255), -1)  # Red circle (5px radius)
                # Add a thinner black outline
                cv2.circle(display_image, point, 5, (0, 0, 0), 1)    # 1px border
            
            # Show the updated image
            cv2.imshow("Image", display_image)
            print(f"Total points: {len(points)}")  # Debug output

def resize_and_compress_image(image, output_path):
    """Resize the image to 500px and compress it for the web."""
    height, width = image.shape[:2]
    if width > height:
        new_width = 500
        new_height = int((height / width) * 500)
    else:
        new_height = 500
        new_width = int((width / height) * 500)

    resized_image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    cv2.imwrite(output_path, resized_image, [cv2.IMWRITE_JPEG_QUALITY, 85])  # Compress with 85% quality

# IMPORTANT: Modify the beginning of your process_next_image function to SKIP saving:
def process_next_image():
    """Process the next image in the list."""
    global current_image_index, points, current_rotation, rotation_angle, current_image
    global existing_metadata, is_editing_existing
    
    # If no images are loaded yet, just return
    if not image_list:
        print("No images loaded. Please select a source folder.")
        return False
    
    # Reset rotation and points for new image
    current_rotation = 0
    rotation_angle = 0
    points = []
    is_editing_existing = False
    
    # Check if there are more images to process
    if current_image_index >= len(image_list):
        print("All images processed. Press 'q' to quit.")
        QMessageBox.information(None, "Info", "All images processed. Press 'Quit' to exit.")
        return False

    # Load the next image
    try:
        print(f"Loading image: {image_list[current_image_index]}")
        current_image = cv2.imread(image_list[current_image_index])
        
        if current_image is None:
            print(f"Failed to load image: {image_list[current_image_index]}")
            current_image_index += 1
            return process_next_image()  # Skip and try next image
            
        # Resize the image for display
        current_image = resize_image(current_image, 800)  # Increased size for better visibility
        
        # Get current filename and check if it already has metadata
        filename = os.path.basename(image_list[current_image_index])
        clean_name = clean_filename(filename)
        
        # Check if this image has existing points in metadata
        if clean_name in existing_metadata:
            is_editing_existing = True
            existing_points = existing_metadata[clean_name].get("points", [])
            existing_rotation = existing_metadata[clean_name].get("rotation", 0)
            
            # Apply existing rotation first if any
            if existing_rotation > 0:
                for _ in range(existing_rotation // 90):
                    current_image = cv2.rotate(current_image, cv2.ROTATE_90_CLOCKWISE)
                rotation_angle = existing_rotation
            
            # Convert percentage points back to pixel coordinates
            height, width = current_image.shape[:2]
            if existing_points:
                for point in existing_points:
                    x = int(point[0] * width)
                    y = int(point[1] * height)
                    points.append((x, y))
                
                # Draw existing points
                display_image = current_image.copy()
                for point in points:
                    # Use a smaller green point for existing points
                    cv2.circle(display_image, point, 5, (0, 255, 0), -1)  # 5px radius
                    cv2.circle(display_image, point, 5, (0, 0, 0), 1)     # 1px border
                current_image = display_image
                
                # Update status
                status_label.setText(f"Image {current_image_index} has existing points (shown in green)")
        
        # Update the UI with filename
        if folder_label:
            folder_label.setText(f"Source: {os.path.basename(source_folder)} | Current: {filename}")
            if is_editing_existing:
                folder_label.setText(folder_label.text() + " (HAS EXISTING POINTS)")

        # Replace with:
        # Update redo button text based on whether image has existing points
        if is_editing_existing:
            redo_button.setText("Redo Image (Clear Existing Points)")
        else:
            redo_button.setText("Redo Image")
            
        # Display the image in a window
        cv2.imshow("Image", current_image)
        cv2.setMouseCallback("Image", click_event)
        print(f"Displayed image {current_image_index+1} of {len(image_list)}")
        
        status_label.setText(f"Processing image {current_image_index} of {len(image_list)}")
        
        current_image_index += 1
        return True
    except Exception as e:
        print(f"Error processing image: {e}")
        current_image_index += 1
        return process_next_image()

def resize_image(image, max_size):
    """Resize the image to a maximum size while maintaining aspect ratio."""
    height, width = image.shape[:2]
    if width > height:
        new_width = max_size
        new_height = int((height / width) * max_size)
    else:
        new_height = max_size
        new_width = int((width / height) * max_size)

    resized_image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    return resized_image

def rotate_image():
    """Rotate the current image by 90 degrees."""
    global current_image, points, rotation_angle

    if current_image is not None:
        rotation_angle = (rotation_angle + 90) % 360
        current_image = cv2.rotate(current_image, cv2.ROTATE_90_CLOCKWISE)
        points = [(y, current_image.shape[0] - x) for x, y in points]  # Adjust points for rotation
        draw_points(current_image, points)
        cv2.imshow("Image", current_image)

def skip_image():
    """Skip the current image without processing."""
    global current_image_index
    
    # Don't delete the image when skipping after redo
    # Remove this line: os.remove(image_list[current_image_index - 1])
    
    if current_image_index >= len(image_list):
        print("All images processed. Press 'q' to quit.")
        QMessageBox.information(None, "Info", "All images processed. Press 'Quit' to exit.")
        return False
    return process_next_image()

# Modify the confirm_points function to ensure points are saved exactly as marked:
def confirm_points():
    """Confirm points and move to the next image."""
    global current_image_index, points, current_image, rotation_angle, current_rotation, output_data
    
    # Reset output_data for just THIS image (not clearing everything)
    output_data = {}
    
    # Check if we actually have an image to save
    if current_image is None or current_image_index <= 0 or current_image_index > len(image_list) + 1:
        print("No current image to save")
        return
    
    try:
        # Get the filename of the current/previous image
        original_filename = os.path.basename(image_list[current_image_index - 1])
        source_path = image_list[current_image_index - 1]
        
        # Generate a clean version of the filename
        clean_name = clean_filename(original_filename)
        
        # Extract metadata
        metadata = extract_image_metadata(source_path)
        
        # Process and save the rotated image FIRST
        try:
            # Open with PIL for rotation
            pil_image = Image.open(source_path)
            
            # Apply rotation if needed (FIXED DIRECTION)
            if rotation_angle == 90:
                pil_image = pil_image.transpose(Image.ROTATE_270)  # Change to 270 to match clockwise
            elif rotation_angle == 180:
                pil_image = pil_image.transpose(Image.ROTATE_180)  # 180 stays the same
            elif rotation_angle == 270:
                pil_image = pil_image.transpose(Image.ROTATE_90)   # Change to 90 to match clockwise
                
            # Resize the image (keeping aspect ratio)
            width, height = pil_image.size
            if width > height:
                new_width = 500
                new_height = int((height / width) * 500)
            else:
                new_height = 500
                new_width = int((width / height) * 500)
                
            pil_image = pil_image.resize((new_width, new_height), Image.LANCZOS)
            
            # Save to processed folder
            output_path = os.path.join(processed_folder, clean_name)
            pil_image.save(output_path, quality=85, optimize=True)
            print(f"Processed and saved image to {output_path}")
            
            # Add after saving the image
            print(f"Applied rotation: {rotation_angle}° clockwise")
            
        except Exception as e:
            print(f"Error processing image: {e}")
            return
        
        # AFTER saving image, convert points to percentages based on CURRENT image dimensions
        percentage_points = []
        if points and current_image is not None:
            # Get dimensions of the CURRENT display image
            disp_height, disp_width = current_image.shape[:2]
            
            for point in points:
                # Simple conversion to percentage (already in rotated coordinates)
                x_percent = point[0] / disp_width
                y_percent = point[1] / disp_height
                percentage_points.append([x_percent, y_percent])
            
            # If exactly 2 points, ensure top (0.0) and bottom (1.0) y-coordinates
            if len(percentage_points) == 2:
                # Sort by y-coordinate
                percentage_points.sort(key=lambda p: p[1])
        
        # Create the metadata entry with percentage-based points
        image_entry = {
            "path": f"assets/img/projects/ground-breaking/{clean_name}",
            "points": percentage_points,  # Using percentages
            "rotation": rotation_angle,
            "timestamp": metadata.get("timestamp"),
            "location": metadata.get("location"),
            "coordinates": metadata.get("coordinates")
        }
        
        # Update output_data for this image
        output_data[clean_name] = image_entry
        
        # Before saving, check if we're overwriting an existing image
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, "r") as f:
                    existing_data = json.load(f)
                    if clean_name in existing_data:
                        print(f"Warning: Overwriting existing entry for {clean_name}")
            except:
                pass
        
        # Save metadata
        save_metadata()
        print(f"Saved {len(points)} points as percentages for {clean_name}")
        
        # Move to next image
        process_next_image()
        
    except Exception as e:
        print(f"Error in confirm_points: {e}")

def skip_current_image():
    """Skip the current image."""
    if not skip_image():
        app.quit()

def quit_program():
    """Quit the program."""
    app.quit()
    cv2.destroyAllWindows()

def extract_image_metadata(image_path):
    """Extract timestamp and location metadata from image EXIF data."""
    metadata = {
        "timestamp": None,
        "location": None,
        "coordinates": None
    }
    
    try:
        # Open the image file for EXIF reading
        with open(image_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)
            
            # Extract timestamp
            if 'EXIF DateTimeOriginal' in tags:
                date_str = str(tags['EXIF DateTimeOriginal'])
                try:
                    # Parse the date format typically found in EXIF
                    date_obj = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
                    metadata["timestamp"] = date_obj.strftime('%Y-%m-%d %H:%M:%S')
                except ValueError:
                    # If parsing fails, just use the string
                    metadata["timestamp"] = date_str
            
            # Extract GPS coordinates
            if all(key in tags for key in 
                  ['GPS GPSLatitude', 'GPS GPSLatitudeRef', 'GPS GPSLongitude', 'GPS GPSLongitudeRef']):
                
                # Convert the GPS coordinates to decimal degrees
                lat = tags['GPS GPSLatitude'].values
                lat_ref = tags['GPS GPSLatitudeRef'].values
                lon = tags['GPS GPSLongitude'].values
                lon_ref = tags['GPS GPSLongitudeRef'].values
                
                # Calculate decimal degrees
                lat_value = float(lat[0].num) / float(lat[0].den) + \
                           (float(lat[1].num) / float(lat[1].den)) / 60 + \
                           (float(lat[2].num) / float(lat[2].den)) / 3600
                
                lon_value = float(lon[0].num) / float(lon[0].den) + \
                           (float(lon[1].num) / float(lon[1].den)) / 60 + \
                           (float(lon[2].num) / float(lon[2].den)) / 3600
                
                # Apply reference (N/S, E/W)
                if lat_ref == 'S': lat_value = -lat_value
                if lon_ref == 'W': lon_value = -lon_value
                
                # Store the coordinates
                metadata["coordinates"] = [lat_value, lon_value]
                
                # Look up the location (city, country) from coordinates
                # Check if we've already looked up these coordinates before
                coord_key = f"{lat_value:.6f},{lon_value:.6f}"
                if coord_key in metadata_cache:
                    metadata["location"] = metadata_cache[coord_key]
                else:
                    try:
                        location = geolocator.reverse(f"{lat_value}, {lon_value}", language='en')
                        if location and location.address:
                            # Try to extract city and country
                            address = location.raw.get('address', {})
                            city = address.get('city', address.get('town', address.get('village', '')))
                            country = address.get('country', '')
                            
                            if city and country:
                                location_str = f"{city}, {country}"
                            else:
                                location_str = location.address.split(',')[0:2]
                                
                            metadata["location"] = location_str
                            # Cache the result
                            metadata_cache[coord_key] = location_str
                    except Exception as e:
                        print(f"Error getting location from coordinates: {e}")
                        
        return metadata
            
    except Exception as e:
        print(f"Error extracting metadata from {image_path}: {e}")
        return metadata

# Fix the syntax error in the clean_filename function:
def clean_filename(filename):
    # Get the file extension
    base, ext = os.path.splitext(filename)
    
    # Split the name into parts (by spaces, hyphens, etc.)
    parts = ''.join(c if c.isalnum() else ' ' for c in base).split()
    
    result = []
    for part in parts:
        if part.isdigit():
            # It's a number, keep it with underscores
            result.append(f"_{part}_")
        elif part.isalpha():
            # It's a word, take first letter capitalized
            result.append(part[0].upper())
        elif any(c.isalpha() for c in part) and any(c.isdigit() for c in part):
            # Mixed alphanumeric - extract letters and numbers separately
            letters = ''.join(c for c in part if c.isalpha())  # FIX HERE
            numbers = ''.join(c for c in part if c.isdigit())  # FIX HERE
            
            if letters:
                result.append(letters[0].upper())
            if numbers:
                result.append(f"_{numbers}_")
    
    # Join and clean up multiple underscores
    cleaned_name = ''.join(result).replace('__', '_')
    
    # Remove leading/trailing underscores
    cleaned_name = cleaned_name.strip('_')
    
    # Ensure the name isn't empty
    if not cleaned_name:
        cleaned_name = "IMG"
    
    return f"{cleaned_name}{ext}"

# Move this function definition BEFORE the UI setup code
def select_source_folder():
    """Open dialog to select source folder for images."""
    global source_folder, image_list, current_image_index
    
    # Open folder selection dialog
    folder = QFileDialog.getExistingDirectory(
        None, 
        "Select Folder with Source Images",
        os.path.expanduser("~")  # Start in home directory
    )
    
    if not folder:
        return  # User cancelled
        
    source_folder = folder
    folder_label.setText(f"Source: {os.path.basename(folder)}")
    
    # Load images from the selected folder
    image_list = [os.path.join(folder, f) for f in os.listdir(folder) 
                  if f.lower().endswith(('png', 'jpg', 'jpeg'))]
    
    if not image_list:
        QMessageBox.warning(None, "Warning", "No images found in selected folder")
        return
        
    # Start processing the first image
    current_image_index = 0
    process_next_image()
    
    print(f"Found {len(image_list)} images in {folder}")

# Add function to clear points for current image
def clear_points():
    """Clear any existing points for the current image."""
    global points, current_image, is_editing_existing
    
    if current_image is None:
        return
    
    # Reset points
    points = []
    is_editing_existing = False
    
    # Refresh the image display (no points)
    display_image = current_image.copy()  # Get clean copy
    cv2.imshow("Image", display_image)
    
    status_label.setText("Points cleared. Mark new points.")

# Add function to redo the current image
def redo_current_image():
    """Reload the current image and clear existing points."""
    global current_image_index, points, rotation_angle, is_editing_existing
    
    # Go back one image (since current_image_index is already incremented)
    if current_image_index > 0:
        current_image_index -= 1
    else:
        return
    
    # Clear points and rotation
    points = []
    rotation_angle = 0
    is_editing_existing = False
    
    # Process the image again
    process_next_image()
    
    # Make sure points are cleared after loading
    points = []
    
    # Update the display
    if current_image is not None:
        display_image = current_image.copy()
        cv2.imshow("Image", display_image)
        status_label.setText("Image reloaded with points cleared.")

def get_best_location_string(address):
    # Combine suburb, city, state, country (in that order, skipping duplicates/empties)
    parts = []
    for key in ['suburb', 'city', 'state', 'country']:
        value = address.get(key)
        if value and value not in parts:
            parts.append(value)
    return ', '.join(parts)

def refresh_locations_in_metadata():
    print("Refreshing locations in metadata.json...")
    if not os.path.exists(metadata_file):
        print("No metadata file found.")
        return
    with open(metadata_file, "r") as f:
        data = json.load(f)
    updated = False
    for key, entry in data.items():
        coords = entry.get("coordinates")
        if coords:
            try:
                loc = geolocator.reverse(f"{coords[0]}, {coords[1]}", language='en')
                if loc and loc.raw and 'address' in loc.raw:
                    address = loc.raw['address']
                    best_location = get_best_location_string(address)
                    data[key]["location"] = best_location
                    data[key]["address"] = address  # Store full address for flexibility
                    print(f"Updated {key}: {best_location}")
                    updated = True
            except Exception as e:
                print(f"Failed to update {key}: {e}")
    if updated:
        with open(metadata_file, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Metadata file updated.")
    else:
        print("No updates made.")

def mark_images_with_null_location(retries=3, delay=1.5):
    print("Marking images with null location...")
    if not os.path.exists(metadata_file):
        print("No metadata file found.")
        return
    with open(metadata_file, "r") as f:
        data = json.load(f)
    updated = False
    for key, entry in data.items():
        coords = entry.get("coordinates")
        location = entry.get("location")
        if coords and (location is None or location == "" or location == "null"):
            for attempt in range(retries):
                try:
                    loc = geolocator.reverse(f"{coords[0]}, {coords[1]}", language='en', timeout=10)
                    if loc and loc.raw and 'address' in loc.raw:
                        address = loc.raw['address']
                        best_location = get_best_location_string(address)
                        data[key]["location"] = best_location
                        print(f"Updated {key}: {best_location}")
                        updated = True
                    break
                except GeocoderTimedOut:
                    print(f"Timeout for {key}, retrying ({attempt+1}/{retries})...")
                    time.sleep(delay)
                except Exception as e:
                    print(f"Failed to update {key}: {e}")
                    break
    if updated:
        with open(metadata_file, "w") as f:
            json.dump(data, f, indent=2)
        print("Metadata file updated.")
    else:
        print("No updates made.")

# Create the PyQt5 application (only once!)
app = QApplication([])

# Create the main window
window = QWidget()
window.setWindowTitle("Image Marker")
window.setGeometry(100, 100, 400, 300)

# Define layout FIRST
layout = QVBoxLayout()

# Create folder selection button and label
folder_button = QPushButton("Select Source Folder")
folder_button.clicked.connect(select_source_folder)
folder_label = QLabel("Source: None")
layout.addWidget(folder_button)
layout.addWidget(folder_label)

# Add status label
status_label = QLabel("Ready. Select a folder with images to begin marking connection points.")
status_label.setStyleSheet("background-color: #f0f0f0; padding: 8px; border-radius: 4px;")
layout.addWidget(status_label)  # Now this can work

# Add instructions label
instructions_label = QLabel(
    "Click near top/bottom edges to create connection points.\n"
    "Press 'Confirm Points' when done with current image."
)
instructions_label.setStyleSheet("padding: 8px; color: #555;")
layout.addWidget(instructions_label)

# Add action buttons
confirm_button = QPushButton("Confirm Points")
confirm_button.clicked.connect(confirm_points)
layout.addWidget(confirm_button)

skip_button = QPushButton("Skip Image")
skip_button.clicked.connect(skip_current_image)
layout.addWidget(skip_button)

rotate_button = QPushButton("Rotate 90°")
rotate_button.clicked.connect(rotate_image)
layout.addWidget(rotate_button)

quit_button = QPushButton("Quit")
quit_button.clicked.connect(quit_program)
layout.addWidget(quit_button)

# Add the new buttons to your UI setup section
# (Add these right before window.setLayout(layout))

# Add separator line
separator = QLabel()
separator.setFrameShape(1)  # 1 = HLine
separator.setFrameShadow(1) # 1 = Plain
separator.setStyleSheet("background-color: #ccc; min-height: 1px;")
layout.addWidget(separator)

# Replace both buttons with one combined button
redo_button = QPushButton("Redo Image (Clear Points)")
redo_button.clicked.connect(redo_current_image)
layout.addWidget(redo_button)

# Set the layout
window.setLayout(layout)

# Show the window
window.show()

# Start the PyQt5 main loop
app.exec_()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh-locations", action="store_true", help="Refresh all locations in metadata.json")
    parser.add_argument("--mark-null-locations", action="store_true", help="Only mark images with null location")
    args = parser.parse_args()
    if args.refresh_locations:
        refresh_locations_in_metadata()
    elif args.mark_null_locations:
        mark_images_with_null_location()
    else:
        # Start the GUI as usual
        app.exec_()