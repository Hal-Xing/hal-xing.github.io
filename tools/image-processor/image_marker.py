import os
import cv2
import json
from PyQt5.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout, QMessageBox

# Initialize variables
current_image_index = 0
points = []
image_list = []
output_data = {}

# Path to the folder containing images
image_folder = "img/ground_breaking/v1"
output_file = os.path.join(image_folder, "marked_points.json")
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

def save_points():
    """Save the marked points to a JSON file."""
    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=4)
    print(f"Saved points to {output_file}")

def draw_points(image, points):
    """Draw points on the image."""
    for point in points:
        cv2.circle(image, point, 5, (0, 0, 255), -1)

def click_event(event, x, y, flags, param):
    """Handle mouse click events to mark points."""
    global points

    height, width = param.shape[:2]
    edge_threshold = height * 0.05

    if event == cv2.EVENT_LBUTTONDOWN:
        # Check if the mouse is close to the edge
        if y <= edge_threshold:
            y = 0  # Top edge
        elif y >= height - edge_threshold:
            y = height  # Bottom edge

        points.append((x, y))
        draw_points(param, points)
        cv2.imshow("Image", param)

def resize_and_compress_image(image, output_path):
    """Resize the image to 300px and compress it for the web."""
    height, width = image.shape[:2]
    if width > height:
        new_width = 300
        new_height = int((height / width) * 300)
    else:
        new_height = 300
        new_width = int((width / height) * 300)

    resized_image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    cv2.imwrite(output_path, resized_image, [cv2.IMWRITE_JPEG_QUALITY, 85])  # Compress with 85% quality

def process_next_image():
    """Process the next image in the list."""
    global current_image_index, points

    # Save points for the current image
    if current_image_index > 0:
        output_data[image_list[current_image_index - 1]] = points
        save_points()

    # Check if there are more images to process
    if current_image_index >= len(image_list):
        print("All images processed. Press 'q' to quit.")
        QMessageBox.information(None, "Info", "All images processed. Press 'Quit' to exit.")
        return False

    # Load the next image
    image = cv2.imread(image_list[current_image_index])
    if image is None:
        print(f"Failed to load image: {image_list[current_image_index]}")
        return False

    # Draw existing points on the image
    if image_list[current_image_index] in output_data:
        points = output_data[image_list[current_image_index]]
        draw_points(image, points)
    else:
        points = []

    # Display the image
    cv2.imshow("Image", image)
    cv2.setMouseCallback("Image", click_event, image)

    # Resize and compress the image, then save it to the finished folder
    output_path = os.path.join(finished_folder, os.path.basename(image_list[current_image_index]))
    resize_and_compress_image(image, output_path)
    print(f"Processed and saved image to {output_path}")

    # Move to the next image index
    current_image_index += 1
    return True

def skip_image():
    """Skip the current image without processing."""
    global current_image_index
    current_image_index += 1
    if current_image_index >= len(image_list):
        print("All images processed. Press 'q' to quit.")
        QMessageBox.information(None, "Info", "All images processed. Press 'Quit' to exit.")
        return False
    return True

def confirm_points():
    """Confirm points and move to the next image."""
    if not process_next_image():
        app.quit()

def skip_current_image():
    """Skip the current image."""
    if not skip_image():
        app.quit()

def quit_program():
    """Quit the program."""
    save_points()
    app.quit()
    cv2.destroyAllWindows()

# Start processing the first image
if not process_next_image():
    print("No images to process.")
    exit()

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

quit_button = QPushButton("Quit")
quit_button.clicked.connect(quit_program)

# Arrange buttons in the window
layout = QVBoxLayout()
layout.addWidget(confirm_button)
layout.addWidget(skip_button)
layout.addWidget(quit_button)
window.setLayout(layout)

# Show the window
window.show()

# Start the PyQt5 main loop
app.exec_()