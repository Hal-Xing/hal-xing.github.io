document.addEventListener('DOMContentLoaded', function() {
    const content = document.getElementById('preview-content');
    const loader = document.getElementById('preview-loader');

    // Navigate to a path - now uses hash navigation for all pages
    function navigateTo(path) {
        const hashPath = path.startsWith('/') ? path : '/' + path;
        location.hash = hashPath;
    }

    // Handle menu clicks
    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const path = this.getAttribute('href');
            navigateTo(path);
        });
    });

    // Helper to determine if a path is a project page
    function isProjectPage(path) {
        return path.includes('/projects/');
    }

    // Modified loadContent function
    async function loadContent() {
        const path = location.hash.slice(1);
        if (!path) return;

        try {
            loader.style.display = 'block';
            
            // Use iframe for ALL pages
            const iframe = document.createElement('iframe');
            iframe.src = path;
            iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
            iframe.title = 'Page Content';
            
            // Clear previous content and add iframe
            content.innerHTML = '';
            content.appendChild(iframe);
            
            // Update the path display for mobile navigation
            updatePagePathDisplay(path);
            
            // Update the page title when iframe loads
            iframe.onload = () => {
                try {
                    document.title = iframe.contentDocument.title;
                } catch (e) {
                    console.log('Could not access iframe title');
                }
            };
        } catch (err) {
            console.error('Error loading content:', err);
            content.innerHTML = `<p>Error loading content: ${err.message}</p>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    // Helper function to load scripts properly
    function loadScript(oldScript) {
        return new Promise((resolve, reject) => {
            const newScript = document.createElement('script');
            
            // Copy all attributes
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });

            // Handle external scripts
            if (oldScript.src) {
                newScript.onload = resolve;
                newScript.onerror = reject;
                newScript.src = oldScript.src;
            } else {
                // For inline scripts
                newScript.textContent = oldScript.textContent;
            }

            // Replace old script with new one - FIXED LINE HERE
            oldScript.parentNode.replaceChild(newScript, oldScript);
            
            // For inline scripts, resolve immediately
            if (!oldScript.src) {
                resolve();
            }
        });
    }

    // Update page path in mobile menu
    function updatePagePathDisplay(path) {
        const pathElement = document.getElementById('page-path');
        if (!pathElement) return;

        const parts = path.split('/').filter(p => p);
        if (parts.length > 0) {
            pathElement.textContent = parts[parts.length - 1]
                .replace(/-/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
        }
    }

    // Add this new function to initialize gallery navigation
    function initializeGallery() {
        const counter = document.getElementById('counter');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const items = document.querySelectorAll('.gallery-item');
        
        if (!counter || !prevBtn || !nextBtn || !items.length) return;
    
        let currentIndex = 0;
    
        // Update counter display
        function updateCounter() {
            counter.textContent = `${currentIndex + 1} / ${items.length}`;
        }
    
        // Navigation handlers
        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            updateCounter();
            items[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        });
    
        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % items.length;
            updateCounter();
            items[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        });
    
        // Initialize counter
        updateCounter();
    
        // Set up intersection observer to update counter when scrolling
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = Array.from(items).indexOf(entry.target);
                    if (index !== -1) {
                        currentIndex = index;
                        updateCounter();
                    }
                }
            });
        }, {
            root: document.querySelector('.gallery-container'),
            threshold: 0.5
        });
    
        // Observe all gallery items
        items.forEach(item => observer.observe(item));
    }

    // Listen for hash changes
    window.addEventListener('hashchange', loadContent);

    // Initial load
    if (location.hash) {
        loadContent();
    } else {
        const first = document.querySelector('.menu a');
        if (first) navigateTo(first.getAttribute('href'));
    }
});