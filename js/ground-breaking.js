class ImageScroller {
    constructor(imageFolder, jsonFile, containerId) {
        this.imageFolder = imageFolder;
        this.jsonFile = jsonFile;
        this.container = document.getElementById(containerId);
        this.imageContainer = this.container.querySelector('.image-container');
        this.debugInfo = document.getElementById('debug-info');
        this.scrollPosition = 0;
        this.scrollSpeed = 200; // Moderate speed
        this.imagesPerPage = 10; // Smaller batch size
        this.processedIndices = new Set();
        this.imageWrappers = [];
        this.isLoading = false;
        this.totalImages = 0;
        this.offsetX = 0;
        this.visibleAreaThreshold = 3; // Screen heights to preload
        this.maxLoadedImages = 30; // Maximum images to keep in memory
        
        // Get the image size from CSS variable
        this.imageSize = this.getImageSize();
        
        // Update image size on resize
        window.addEventListener('resize', () => {
            this.imageSize = this.getImageSize();
        });
    }
    
    // Get the current image size from CSS variable
    getImageSize() {
        try {
            // Attempt to get size from CSS variable
            const sizeStr = getComputedStyle(document.documentElement)
                .getPropertyValue('--image-size')
                .trim()
                .replace('px', '');
            
            const size = parseInt(sizeStr);
            
            // If we get a valid number, return it
            if (!isNaN(size) && size > 0) {
                return size;
            }
            
            // Fallback based on device width
            return window.innerWidth < 768 ? 
                Math.min(Math.floor(window.innerWidth * 0.5), 300) : 
                500;
        } catch (e) {
            console.warn("Error getting image size from CSS, using fallback", e);
            return window.innerWidth < 768 ? 
                Math.min(Math.floor(window.innerWidth * 0.5), 300) : 
                500;
        }
    }

    async init() {
        this.debugInfo.textContent = "Initializing image scroller...";
        try {
            const data = await this.loadJSON(this.jsonFile);
            this.imagePaths = Object.keys(data).map(fileName => `${this.imageFolder}/${fileName}`);
            this.data = data;
            this.totalImages = this.imagePaths.length;
            this.debugInfo.textContent = `Loaded ${this.totalImages} image paths`;

            // Load initial images
            await this.loadInitialImages();
            
            // Start scrolling and monitoring
            this.startScrolling();
            this.setupEventListeners();
        } catch (error) {
            console.error("Initialization error:", error);
            this.debugInfo.textContent = `Error: ${error.message}`;
        }
    }

    async loadJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch JSON: ${response.statusText}`);
        }
        return response.json();
    }
    
    async loadInitialImages() {
        // Load first image centered
        const firstImg = await this.loadSingleImage(0);
        if (!firstImg) {
            // If first image fails, try a random one
            await this.loadRandomImage();
        }
        
        // Load fewer additional images on mobile
        const isMobile = window.innerWidth < 768;
        const initialLoadCount = isMobile ? 2 : 5;
        
        console.log(`Initial load: ${initialLoadCount + 1} images on ${isMobile ? 'mobile' : 'desktop'}`);
        
        // Load initial set of images
        for (let i = 0; i < initialLoadCount; i++) {
            await this.loadNextImage();
        }
    }
    
    // Replace your loadSingleImage method with this version that handles scaling properly
    async loadSingleImage(index, prevPoint = null, prevWrapper = null) {
        if (this.processedIndices.has(index)) return null;
        
        return new Promise((resolve) => {
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';
            imageWrapper.dataset.index = index.toString();
            
            const imgSize = this.getImageSize();
            imageWrapper.dataset.imgSize = imgSize.toString();

            const img = document.createElement('img');
            img.src = this.imagePaths[index];
            
            const timeout = setTimeout(() => {
                console.warn(`Image load timeout: ${img.src}`);
                resolve(null);
            }, 5000);
            
            img.onload = () => {
                clearTimeout(timeout);
                
                const filename = this.imagePaths[index].split('/').pop();
                const currPoints = this.data[filename];
                
                if (!currPoints || !currPoints.length) {
                    console.warn(`No points found for image: ${filename}`);
                    resolve(null);
                    return;
                }

                const firstPoint = currPoints[0];
                const lastPoint = currPoints[currPoints.length - 1];
                
                // Store natural dimensions for reference
                img.dataset.naturalWidth = img.naturalWidth.toString();
                img.dataset.naturalHeight = img.naturalHeight.toString();
                img.dataset.points = JSON.stringify(currPoints);
                
                // FIXED CALCULATION: Maintain aspect ratio when scaling points
                // This is critical for accurate connections
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                
                // If image is wider than tall, constrain by width; otherwise by height
                const scaleFactor = aspectRatio > 1 ? 
                    imgSize / img.naturalWidth : 
                    imgSize / img.naturalHeight;
                
                // Calculate scaled dimensions that preserve aspect ratio
                const scaledWidth = img.naturalWidth * scaleFactor;
                const scaledHeight = img.naturalHeight * scaleFactor;
                
                // Store the actual display dimensions for reference
                imageWrapper.dataset.scaledWidth = scaledWidth.toString();
                imageWrapper.dataset.scaledHeight = scaledHeight.toString();
                imageWrapper.dataset.scaleFactor = scaleFactor.toString();
                
                // Position this image
                if (prevPoint && prevWrapper) {
                    try {
                        // Get the scaling information from the previous image
                        const prevScaleFactor = parseFloat(prevWrapper.dataset.scaleFactor);
                        
                        // Calculate first point in current scaled dimensions
                        const firstPointPx = {
                            x: firstPoint[0] * scaleFactor,
                            y: firstPoint[1] * scaleFactor
                        };
                        
                        // Get previous wrapper position
                        const prevLeft = parseFloat(prevWrapper.style.left) || 0;
                        const prevTop = parseFloat(prevWrapper.style.top) || 0;
                        
                        // IMPORTANT: Ensure new position aligns the connection points precisely
                        const newX = prevLeft + prevPoint.x - firstPointPx.x;
                        const newY = prevTop + prevPoint.y - firstPointPx.y;
                        
                        // Apply exact positioning
                        imageWrapper.style.left = `${newX}px`;
                        imageWrapper.style.top = `${newY}px`;
                        
                        // Log connection details
                        const isMobile = window.innerWidth < 768;
                        if (isMobile) {
                            console.log(`Connected image ${index} to ${prevWrapper.dataset.index}; ` +
                                       `scale=${scaleFactor.toFixed(3)}, prev scale=${prevScaleFactor.toFixed(3)}`);
                        }
                    } catch (e) {
                        console.error(`Position calculation error:`, e);
                        imageWrapper.style.left = `${(window.innerWidth - imgSize) / 2}px`;
                        imageWrapper.style.top = `${window.innerHeight + this.scrollPosition}px`;
                    }
                    
                    imageWrapper.style.zIndex = (index % 2 === 0) ? '1' : '2';
                } else {
                    // First image - center it
                    imageWrapper.style.left = `${(window.innerWidth - imgSize) / 2}px`;
                    imageWrapper.style.top = `${(window.innerHeight - imgSize) / 2}px`;
                    imageWrapper.style.zIndex = '1';
                }
                
                // Calculate next connection point using the same scaling approach
                const nextPoint = {
                    x: lastPoint[0] * scaleFactor,
                    y: lastPoint[1] * scaleFactor
                };
                
                // Store the exact point values for future connections
                imageWrapper.dataset.nextConnectionPoint = JSON.stringify(nextPoint);
                
                imageWrapper.appendChild(img);
                this.imageContainer.appendChild(imageWrapper);
                this.imageWrappers.push(imageWrapper);
                this.processedIndices.add(index);

                resolve({
                    wrapper: imageWrapper,
                    point: nextPoint
                });
            };

            img.onerror = () => {
                clearTimeout(timeout);
                console.error(`Failed to load image: ${img.src}`);
                resolve(null);
            };
        });
    }
    
    async loadRandomImage() {
        // Find a random unprocessed image
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const randomIndex = Math.floor(Math.random() * this.totalImages);
            if (!this.processedIndices.has(randomIndex)) {
                // Find last active image to connect to
                const lastImage = this.findLastActiveImage();
                const result = await this.loadSingleImage(
                    randomIndex, 
                    lastImage ? lastImage.point : null, 
                    lastImage ? lastImage.wrapper : null
                );
                if (result) return result;
            }
            attempts++;
        }
        return null;
    }
    
    async loadNextImage() {
        // Find last active image
        const lastImage = this.findLastActiveImage();
        if (!lastImage) return await this.loadRandomImage();
        
        // Try to load the next logical image
        const currentIndex = parseInt(lastImage.wrapper.dataset.index, 10);
        const nextIndex = (currentIndex + 1) % this.totalImages;
        
        // Skip if already loaded
        if (this.processedIndices.has(nextIndex)) {
            // Find another unprocessed image instead
            return await this.loadRandomImage();
        }
        
        // Try to load the next sequential image
        const result = await this.loadSingleImage(nextIndex, lastImage.point, lastImage.wrapper);
        if (result) return result;
        
        // If that fails, load a random image
        return await this.loadRandomImage();
    }
    
    findLastActiveImage() {
        if (this.imageWrappers.length === 0) return null;
        
        // Sort by vertical position
        const sortedWrappers = [...this.imageWrappers]
            .filter(w => w && w.isConnected)
            .sort((a, b) => {
                const aTop = parseFloat(a.style.top) || 0;
                const bTop = parseFloat(b.style.top) || 0;
                return bTop - aTop; // Descending order (bottom-most first)
            });
        
        if (sortedWrappers.length === 0) return null;
        
        // Take the bottom-most image
        const wrapper = sortedWrappers[0];
        
        // Use the pre-calculated next connection point directly from dataset
        try {
            if (wrapper.dataset.nextConnectionPoint) {
                return {
                    wrapper: wrapper,
                    point: JSON.parse(wrapper.dataset.nextConnectionPoint)
                };
            }
            
            // Calculate from scratch if needed
            const img = wrapper.querySelector('img');
            if (!img || !img.dataset.points) return null;
            
            const points = JSON.parse(img.dataset.points);
            if (!points || !points.length) return null;
            
            const lastPoint = points[points.length - 1];
            const naturalWidth = parseFloat(img.dataset.naturalWidth);
            const naturalHeight = parseFloat(img.dataset.naturalHeight);
            
            // Get the scaling factor using the same logic as in loadSingleImage
            const aspectRatio = naturalWidth / naturalHeight;
            const imgSize = this.getImageSize();
            const scaleFactor = aspectRatio > 1 ? 
                imgSize / naturalWidth : 
                imgSize / naturalHeight;
            
            // Calculate the connection point using the true scale factor
            const point = {
                x: lastPoint[0] * scaleFactor,
                y: lastPoint[1] * scaleFactor
            };
            
            // Store for future reference
            wrapper.dataset.nextConnectionPoint = JSON.stringify(point);
            wrapper.dataset.scaleFactor = scaleFactor.toString();
            
            return {
                wrapper: wrapper,
                point: point
            };
        } catch (e) {
            console.error("Error finding last active image:", e);
            return null;
        }
    }

    updateImagePositions() {
        if (this.imageWrappers.length === 0) return;

        const middleY = window.innerHeight / 2;
        
        // Find image closest to center
        let closestWrapper = null;
        let closestDistance = Infinity;
        let currentIndex = -1;

        for (const wrapper of this.imageWrappers) {
            if (!wrapper || !wrapper.isConnected) continue;
            
            const rect = wrapper.getBoundingClientRect();
            const wrapperCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(wrapperCenterY - middleY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestWrapper = wrapper;
                currentIndex = parseInt(wrapper.dataset.index || '0', 10);
            }
        }

        if (closestWrapper) {
            // Update debug info
            this.debugInfo.textContent = 
                `Current: ${currentIndex}, Total: ${this.totalImages}, ` +
                `Loaded: ${this.imageWrappers.length}, Size: ${this.getImageSize()}px`;
            
            // Center horizontally using direct style values
            const left = parseFloat(closestWrapper.style.left) || 0;
            const imgSize = this.getImageSize();
            const imageCenterX = left + (imgSize / 2);
            const viewportCenterX = window.innerWidth / 2;
            
            this.offsetX = viewportCenterX - imageCenterX;
            this.container.style.transform = `translateX(${this.offsetX}px)`;
            
            // Check if we need to load more images
            this.manageImages();
        }
    }
    
    manageImages() {
        // Remove distant images first to free up memory
        this.cleanupDistantImages();
        
        // Load more images if we're not already loading and need more
        if (!this.isLoading && this.needMoreImages()) {
            this.isLoading = true;
            console.log("Loading more images...");
            
            // On mobile, load one image at a time to conserve bandwidth
            const isMobile = window.innerWidth < 768;
            const loadPromise = isMobile ? 
                this.loadNextImage() : 
                Promise.all([
                    this.loadNextImage(),
                    this.loadNextImage()
                ]);
                
            loadPromise.then(() => {
                console.log(`Loaded more images. Total now: ${this.imageWrappers.length}`);
                this.isLoading = false;
            }).catch(err => {
                console.error("Error loading next image:", err);
                this.isLoading = false;
            });
        }
    }
    
    needMoreImages() {
        if (this.imageWrappers.length === 0) return true;
        
        // How close are we to the end of loaded images?
        const bottomMostWrapper = [...this.imageWrappers]
            .filter(w => w && w.isConnected)
            .sort((a, b) => {
                const aRect = a.getBoundingClientRect();
                const bRect = b.getBoundingClientRect();
                return bRect.bottom - aRect.bottom; // Highest bottom value first
            })[0];
            
        if (!bottomMostWrapper) return true;
        
        const bottomRect = bottomMostWrapper.getBoundingClientRect();
        const viewportBottom = window.innerHeight;
        const distanceToBottom = bottomRect.bottom - viewportBottom;
        
        // On mobile devices, use smaller threshold to reduce data usage
        const isMobile = window.innerWidth < 768;
        const threshold = isMobile ? 
            this.visibleAreaThreshold * window.innerHeight * 0.7 : // Less aggressive on mobile
            this.visibleAreaThreshold * window.innerHeight;
        
        return distanceToBottom < threshold;
    }

    cleanupDistantImages() {
        // Keep fewer images on mobile
        const isMobile = window.innerWidth < 768;
        const maxImages = isMobile ? Math.floor(this.maxLoadedImages * 0.7) : this.maxLoadedImages;
        
        if (this.imageWrappers.length <= maxImages) return;
        
        // Get the current scroll position
        const viewportTop = 0;
        const viewportBottom = window.innerHeight;
        
        // Sort wrappers by distance from viewport
        const sortedWrappers = [...this.imageWrappers]
            .filter(w => w && w.isConnected)
            .map(wrapper => {
                const rect = wrapper.getBoundingClientRect();
                const distanceFromViewport = Math.min(
                    Math.abs(rect.bottom - viewportTop),
                    Math.abs(rect.top - viewportBottom)
                );
                return { wrapper, distanceFromViewport };
            })
            .sort((a, b) => b.distanceFromViewport - a.distanceFromViewport); // Farthest first
        
        // Keep removing the farthest images until we're back to maxImages
        let removed = 0;
        while (sortedWrappers.length > 0 && this.imageWrappers.length - removed > maxImages) {
            const { wrapper } = sortedWrappers.shift();
            wrapper.remove();
            removed++;
        }
        
        // Update the imageWrappers array
        this.imageWrappers = this.imageWrappers.filter(w => w && w.isConnected);
        
        if (removed > 0) {
            console.log(`Removed ${removed} distant images, now at ${this.imageWrappers.length}`);
        }
    }

    startScrolling() {
        let lastTimestamp = 0;
        
        const scroll = (timestamp) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const elapsed = timestamp - lastTimestamp;
            
            // Calculate scroll amount
            const scrollAmount = (this.scrollSpeed * elapsed) / 1000;
            this.scrollPosition += scrollAmount;
            
            // Apply vertical scroll
            this.imageContainer.style.transform = `translateY(-${this.scrollPosition}px)`;
            
            // Update image positions
            this.updateImagePositions();
            
            lastTimestamp = timestamp;
            requestAnimationFrame(scroll);
        };
        
        requestAnimationFrame(scroll);
    }

    setupEventListeners() {
        // Re-center images on resize
        window.addEventListener('resize', () => {
            this.updateImagePositions();
        });
        
        // Add keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 's' || e.key === 'S') {
                // Toggle scroll speed
                if (this.scrollSpeed === 600) {
                    this.scrollSpeed = 1200;
                } else if (this.scrollSpeed === 1200) {
                    this.scrollSpeed = 300;
                } else {
                    this.scrollSpeed = 600;
                }
                console.log(`Scroll speed set to ${this.scrollSpeed}`);
            } else if (e.key === 'l' || e.key === 'L') {
                // Load more images
                this.loadNextImage();
            } else if (e.key === 'c' || e.key === 'C') {
                // Clean up images
                this.cleanupDistantImages();
            }
        });
    }
}

// Initialize the scroller when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const imageScroller = new ImageScroller(
        'img/ground_breaking/v1/finished',
        'img/ground_breaking/v1/marked_points.json',
        'scroll-container'
    );
    imageScroller.init();
});