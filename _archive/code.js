// Get the gallery contents element
const galleryContents = document.getElementById("gallery-contents");

// Function to handle keyboard scrolling
function handleKeyboardScroll(event) {
    const key = event.key;

    if (key === "ArrowLeft") {
        // Scroll to the left
        galleryContents.scrollLeft -= 50; // Adjust the scroll distance as needed
    } else if (key === "ArrowRight") {
        // Scroll to the right
        galleryContents.scrollLeft += 50; // Adjust the scroll distance as needed
    } else if (key === "ArrowUp") {
        // Scroll up
        galleryContents.scrollTop -= 50; // Adjust the scroll distance as needed
    } else if (key === "ArrowDown") {
        // Scroll down
        galleryContents.scrollTop += 50; // Adjust the scroll distance as needed
    }
}

// Add event listener for keydown events
document.addEventListener("keydown", handleKeyboardScroll);