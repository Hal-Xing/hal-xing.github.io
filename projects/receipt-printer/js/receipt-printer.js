class ReceiptPrinter {
    constructor(containerId, imagesJsonPath) {
        this.container = document.getElementById(containerId);
        this.imageWrapper = this.container.querySelector('.image-wrapper');
        this.debugInfo = document.getElementById('debug-info');
        this.imagesJsonPath = imagesJsonPath;
        this.currentIndex = 0;
        this.speed = 300; // pixels per second
        this.imagesList = [];
    }

    init() {
        this.loadImages()
            .then(() => {
                this.showNextImage();
            })
            .catch(error => {
                console.error('Error initializing receipt printer:', error);
                if (this.debugInfo) {
                    this.debugInfo.textContent = `Error: ${error.message}`;
                }
            });
    }

    async loadImages() {
        const response = await fetch(this.imagesJsonPath);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        this.imagePaths = await response.json();
        console.log('Image paths loaded:', this.imagePaths);
        return this.imagePaths;
    }

    moveImages(duration, distance) {
        this.imagesList.forEach(imageData => {
            const img = imageData.img;
            const newTop = imageData.top + distance; // Move down by the distance
            img.style.transition = `top ${duration}s linear`;
            img.style.top = `${newTop}px`;
            imageData.top = newTop;
        });
    }

    showNextImage() {
        if (this.currentIndex < this.imagePaths.length) {
            // Add the new image
            const img = document.createElement('img');
            img.src = `img/${this.imagePaths[this.currentIndex]}`;
            img.alt = this.imagePaths[this.currentIndex].split('/').pop();
            
            img.onload = () => {
                console.log('Image loaded:', img.src);

                // Position the image outside the viewport
                img.style.position = 'absolute';
                img.style.top = `-${img.height * (150 / img.width)}px`;
                
                // Append the new image to the container
                this.imageWrapper.appendChild(img);
                
                // Add the image to the list with initial position
                this.imagesList.push({ img, top: -img.height });
                
                // Log current appended image information
                const rect = img.getBoundingClientRect();
                if (this.debugInfo) {
                    this.debugInfo.textContent = '';
                }

                // Calculate the transition duration based on the image height
                const duration = img.height / this.speed;

                // Use requestAnimationFrame to ensure all images start moving at the same time
                requestAnimationFrame(() => {
                    this.moveImages(duration, img.height);
                });

                // Schedule the next image with an additional pause
                this.currentIndex++;
                setTimeout(() => {
                    setTimeout(() => this.showNextImage(), 1000); // Add a 1-second pause after scrolling
                }, duration * 1000);
            };
        }
    }
}