import os
import cv2
import json
from PyQt5.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout, QMessageBox

# Initialize variables
current_image_index = 0
points = []
image_list = []
output_data = {}
rotation_data = {}
current_image = None
rotation_angle = 0

# Path to the folder containing images
image_folder = "img/ground_breaking/v1"
output_file = os.path.join(image_folder, "marked_points.json")
rotation_file = os.path.join(image_folder, "rotation_info.json")
finished_folder = os.path.join(image_folder, "finished")

# Create the finished folder if it doesn't exist
if not os.path.exists(finished_folder):
    os.makedirs(finished_folder)

# Load all image files in the folder
image_list = [os.path.join(image_folder, f) for f in os.listdir(image_folder) if f.lower().endswith(('png', 'jpg', 'jpeg'))]

# Load existing points if the file exists
if os.path.exists(output_file):
    with open(output_file, "r") as f:
        output_data = json.load(f)

# Load existing rotation data if the file exists
if os.path.exists(rotation_file):
    with open(rotation_file, "r") as f:
        rotation_data = json.load(f)

def save_points():
    """Save the marked points to a JSON file."""
    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=4)
    print(f"Saved points to {output_file}")

def save_rotation_data():
    """Save the rotation data to a JSON file."""
    with open(rotation_file, "w") as f:
        json.dump(rotation_data, f, indent=4)
    print(f"Saved rotation data to {rotation_file}")

def draw_points(image, points):
    """Draw points on the image."""
    for point in points:
        cv2.circle(image, point, 5, (0, 0, 255), -1)

def click_event(event, x, y, flags, param):
    """Handle mouse click events to mark points."""
    global points, current_image

    height, width = current_image.shape[:2]
    edge_threshold = height * 0.05

    if event == cv2.EVENT_LBUTTONDOWN:
        # Check if the mouse is close to the edge
        if y <= edge_threshold:
            y = 0  # Top edge
        elif y >= height - edge_threshold:
            y = height  # Bottom edge

        # Add point only if it's not already in the list
        if (x, y) not in points:
            points.append((x, y))
            draw_points(current_image, points)
            cv2.imshow("Image", current_image)

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

def process_next_image():
    """Process the next image in the list."""
    global current_image_index, points, current_image, rotation_angle

    # Clear points and reset rotation angle for the new image
    points = []
    rotation_angle = 0

    # Check if there are more images to process
    if current_image_index >= len(image_list):
        print("All images processed. Press 'q' to quit.")
        QMessageBox.information(None, "Info", "All images processed. Press 'Quit' to exit.")
        return False

    # Skip already processed images
    if os.path.basename(image_list[current_image_index]) in output_data:
        current_image_index += 1
        return process_next_image()

    # Load the next image
    current_image = cv2.imread(image_list[current_image_index])
    if current_image is None:
        print(f"Failed to load image: {image_list[current_image_index]}")
        return False

    # Resize the image to fit within 500px width
    current_image = resize_image(current_image, 500)

    # Display the image
    cv2.imshow("Image", current_image)
    cv2.setMouseCallback("Image", click_event)

    # Move to the next image index
    current_image_index += 1
    return True

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
    if current_image_index < len(image_list):
        os.remove(image_list[current_image_index - 1])  # Delete the original image
    if current_image_index >= len(image_list):
        print("All images processed. Press 'q' to quit.")
        QMessageBox.information(None, "Info", "All images processed. Press 'Quit' to exit.")
        return False
    return process_next_image()

def confirm_points():
    """Confirm points and move to the next image."""
    global current_image_index, points, current_image, rotation_angle

    # Save points for the current image
    if points:
        output_data[os.path.basename(image_list[current_image_index - 1])] = points
        save_points()

        # Save rotation data for the current image
        rotation_data[os.path.basename(image_list[current_image_index - 1])] = rotation_angle
        save_rotation_data()

        # Load the original image again to save it without red dots
        original_image = cv2.imread(image_list[current_image_index - 1])
        if original_image is None:
            print(f"Failed to load image: {image_list[current_image_index - 1]}")
            return False

        # Rotate the original image to the current rotation angle
        for _ in range(rotation_angle // 90):
            original_image = cv2.rotate(original_image, cv2.ROTATE_90_CLOCKWISE)

        # Resize and compress the image, then save it to the finished folder
        output_path = os.path.join(finished_folder, os.path.basename(image_list[current_image_index - 1]))
        resize_and_compress_image(original_image, output_path)
        print(f"Processed and saved image to {output_path}")

    if not process_next_image():
        app.quit()

def skip_current_image():
    """Skip the current image."""
    if not skip_image():
        app.quit()

def quit_program():
    """Quit the program."""
    save_points()
    save_rotation_data()
    app.quit()
    cv2.destroyAllWindows()

# Create the PyQt5 application
app = QApplication([])

# Create the main window
window = QWidget()
window.setWindowTitle("Image Marker")

# Create buttons
confirm_button = QPushButton("Confirm Points")
confirm_button.clicked.connect(confirm_points)

skip_button = QPushButton("Skip Image")
skip_button.clicked.connect(skip_current_image)

rotate_button = QPushButton("Rotate 90°")
rotate_button.clicked.connect(rotate_image)

quit_button = QPushButton("Quit")
quit_button.clicked.connect(quit_program)

# Arrange buttons in the window
layout = QVBoxLayout()
layout.addWidget(confirm_button)
layout.addWidget(skip_button)
layout.addWidget(rotate_button)
layout.addWidget(quit_button)
window.setLayout(layout)

# Show the window
window.show()

# Start processing the first image
if not process_next_image():
    print("No images to process.")
    exit()

# Start the PyQt5 main loop
app.exec_()