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

        // Initialize debug info
        this.updateDebugInfo();
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
        // START WITH A RANDOM IMAGE instead of always using index 0
        const firstRandomIndex = Math.floor(Math.random() * this.totalImages);
        const firstImg = await this.loadSingleImage(firstRandomIndex);
        
        if (!firstImg) {
            // If first image fails, try another random one
            await this.loadRandomImage();
        }
        
        // Load fewer additional images on mobile
        const isMobile = window.innerWidth < 768;
        const initialLoadCount = isMobile ? 2 : 5;
        
        console.log(`Initial load: ${initialLoadCount + 1} random images on ${isMobile ? 'mobile' : 'desktop'}`);
        
        // Load initial set of RANDOM images (not sequential)
        for (let i = 0; i < initialLoadCount; i++) {
            await this.loadRandomImage();  // Use loadRandomImage directly instead of loadNextImage
        }
    }
    
    // Modified loadSingleImage method to use percentage-based coordinates
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

                // First and last points are already in percentage format (0-1 range)
                const firstPoint = currPoints[0];
                const lastPoint = currPoints[currPoints.length - 1];
                
                // Store natural dimensions for reference
                img.dataset.naturalWidth = img.naturalWidth.toString();
                img.dataset.naturalHeight = img.naturalHeight.toString();
                img.dataset.points = JSON.stringify(currPoints);
                
                // Calculate aspect ratio-preserving scale
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const scaleFactor = aspectRatio > 1 ? 
                    imgSize / img.naturalWidth : 
                    imgSize / img.naturalHeight;
                
                // Calculate scaled dimensions
                const scaledWidth = img.naturalWidth * scaleFactor;
                const scaledHeight = img.naturalHeight * scaleFactor;
                
                // Store scaled dimensions and factor
                imageWrapper.dataset.scaledWidth = scaledWidth.toString();
                imageWrapper.dataset.scaledHeight = scaledHeight.toString();
                imageWrapper.dataset.scaleFactor = scaleFactor.toString();
                
                // Position this image
                if (prevPoint && prevWrapper) {
                    try {
                        // SIMPLIFIED: Using percentage-based coordinates (0-1 range)
                        // Convert percentage to actual pixels using scaled dimensions
                        const firstPointPx = {
                            x: firstPoint[0] * scaledWidth,  // firstPoint[0] is now 0-1 percentage
                            y: firstPoint[1] * scaledHeight  // firstPoint[1] is now 0-1 percentage
                        };
                        
                        // Get previous wrapper position
                        const prevLeft = parseFloat(prevWrapper.style.left) || 0;
                        const prevTop = parseFloat(prevWrapper.style.top) || 0;
                        
                        // Calculate position with precise alignment
                        const newX = prevLeft + prevPoint.x - firstPointPx.x;
                        const newY = prevTop + prevPoint.y - firstPointPx.y;
                        
                        // Mobile-specific adjustments for pixel-perfect connections
                        const isMobile = window.innerWidth < 768;
                        if (isMobile) {
                            // Round to nearest integer and add a slight overlap for mobile
                            imageWrapper.style.left = `${Math.floor(newX)}px`;
                            imageWrapper.style.top = `${Math.floor(newY) - 1}px`; // -1px for overlap
                        } else {
                            // Use exact positioning for desktop
                            imageWrapper.style.left = `${newX}px`;
                            imageWrapper.style.top = `${newY}px`;
                        }
                        
                        imageWrapper.style.zIndex = (index % 2 === 0) ? '1' : '2';
                    } catch (e) {
                        console.error(`Position calculation error:`, e);
                        imageWrapper.style.left = `${(window.innerWidth - imgSize) / 2}px`;
                        imageWrapper.style.top = `${window.innerHeight + this.scrollPosition}px`;
                    }
                } else {
                    // First image - center it
                    imageWrapper.style.left = `${(window.innerWidth - imgSize) / 2}px`;
                    imageWrapper.style.top = `${(window.innerHeight - imgSize) / 2}px`;
                    imageWrapper.style.zIndex = '1';
                }
                
                // Calculate next connection point as pixel coordinates
                const nextPoint = {
                    x: lastPoint[0] * scaledWidth,   // lastPoint[0] is now 0-1 percentage
                    y: lastPoint[1] * scaledHeight   // lastPoint[1] is now 0-1 percentage
                };
                
                // Store for future connections
                imageWrapper.dataset.nextConnectionPoint = JSON.stringify(nextPoint);
                
                imageWrapper.appendChild(img);
                this.imageContainer.appendChild(imageWrapper);
                this.imageWrappers.push(imageWrapper);
                this.processedIndices.add(index);

                // Add this to your loadSingleImage method, right before appending the image
                imageWrapper.classList.add('loading');
                setTimeout(() => {
                    imageWrapper.classList.add('loaded');
                }, 50);

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
        // Create an array of all unprocessed indices
        const availableIndices = [];
        
        for (let i = 0; i < this.totalImages; i++) {
            if (!this.processedIndices.has(i)) {
                availableIndices.push(i);
            }
        }
        
        // If all images have been processed, allow reusing any random image
        if (availableIndices.length === 0) {
            const randomIndex = Math.floor(Math.random() * this.totalImages);
            console.log(`All images used, reusing random index: ${randomIndex}`);
            
            // Find last active image to connect to
            const lastImage = this.findLastActiveImage();
            
            // Reset the processed status for this index to allow reuse
            this.processedIndices.delete(randomIndex);
            
            return await this.loadSingleImage(
                randomIndex, 
                lastImage ? lastImage.point : null, 
                lastImage ? lastImage.wrapper : null
            );
        }
        
        // Otherwise, use a truly random selection from available indices
        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        console.log(`Selected random unprocessed index: ${randomIndex}`);
        
        // Find last active image to connect to
        const lastImage = this.findLastActiveImage();
        
        return await this.loadSingleImage(
            randomIndex, 
            lastImage ? lastImage.point : null, 
            lastImage ? lastImage.wrapper : null
        );
    }
    
    // IMPORTANT: Replace the entire loadNextImage method with this version
    async loadNextImage() {
        // Always use random selection instead of sequential loading
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
            
            // Fallback to calculating from scratch if needed
            const img = wrapper.querySelector('img');
            if (!img || !img.dataset.points) return null;
            
            const points = JSON.parse(img.dataset.points);
            if (!points || !points.length) return null;
            
            const lastPoint = points[points.length - 1];
            const scaledWidth = parseFloat(wrapper.dataset.scaledWidth);
            const scaledHeight = parseFloat(wrapper.dataset.scaledHeight);
            
            // Calculate the connection point using percentages
            const point = {
                x: lastPoint[0] * scaledWidth,   // lastPoint[0] is now 0-1 percentage
                y: lastPoint[1] * scaledHeight   // lastPoint[1] is now 0-1 percentage
            };
            
            // Store for future reference
            wrapper.dataset.nextConnectionPoint = JSON.stringify(point);
            
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
            this.imageSize = this.getImageSize();
            this.updateDebugInfo(); // Update debug info when size changes
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
                this.updateDebugInfo(); // Update debug info when speed changes
                console.log(`Scroll speed set to ${this.scrollSpeed}`);
            } else if (e.key === 'l' || e.key === 'L') {
                // Load more images
                this.loadNextImage();
            } else if (e.key === 'c' || e.key === 'C') {
                // Clean up images
                this.cleanupDistantImages();
            }
        });

        // Add this to your scroll event handler
        window.addEventListener('scroll', () => {
            // Add scrolling class during scroll
            document.querySelectorAll('.image-wrapper').forEach(wrapper => {
                wrapper.classList.add('scrolling');
            });
            
            // Clear scrolling class after scrolling stops
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                document.querySelectorAll('.image-wrapper').forEach(wrapper => {
                    wrapper.classList.remove('scrolling');
                });
            }, 100);
        });
    }

    // Add this method to your ImageScroller class
    updateDebugInfo() {
        if (this.debugInfo) {
            const imgSize = this.getImageSize();
            this.debugInfo.textContent = `Image Size: ${imgSize}px | Scroll Speed: ${this.scrollSpeed}`;
        }
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