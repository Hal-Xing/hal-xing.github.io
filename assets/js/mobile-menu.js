document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileContent = document.querySelector('.mobile-content');
    const previewContent = document.getElementById('preview-content');
    
    // Toggle mobile menu
    if (menuToggle && mobileMenu && mobileContent) {
        menuToggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle the expanded class
            mobileMenu.classList.toggle('expanded');
            
            // Toggle content visibility
            mobileContent.style.display = mobileMenu.classList.contains('expanded') ? 'block' : 'none';
        });
    }

    // Simple helper function to close the menu
    function closeMenu() {
        if (mobileMenu && mobileMenu.classList.contains('expanded')) {
            mobileMenu.classList.remove('expanded');
            mobileContent.style.display = 'none';
        }
    }

    // Use event delegation on the body element
    document.body.addEventListener('click', function(e) {
        // If menu is open and click is outside menu and toggle
        if (mobileMenu && 
            mobileMenu.classList.contains('expanded') && 
            !e.target.closest('.mobile-menu') && 
            !e.target.closest('.menu-toggle')) {
            closeMenu();
        }
    });
    
    // Handle touch events for mobile - using touchend is more reliable
    document.body.addEventListener('touchend', function(e) {
        // Small delay to ensure it doesn't interfere with other interactions
        setTimeout(function() {
            if (mobileMenu && 
                mobileMenu.classList.contains('expanded') && 
                !e.target.closest('.mobile-menu') && 
                !e.target.closest('.menu-toggle')) {
                closeMenu();
            }
        }, 100);
    }, { passive: true });
    
    // Auto-close on scroll
    window.addEventListener('scroll', function() {
        if (mobileMenu && mobileMenu.classList.contains('expanded')) {
            closeMenu();
        }
    }, { passive: true });
    
    // ===== CRITICAL ADDITION: IFRAME COMMUNICATION =====
    
    // Setup communication with iframes
    function setupIframeListeners() {
        // Find all iframes
        const iframes = document.querySelectorAll('iframe');
        
        iframes.forEach(iframe => {
            // When iframe loads, inject our event listeners
            iframe.addEventListener('load', function() {
                try {
                    // Get iframe document
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    
                    // Create a script element
                    const script = document.createElement('script');
                    script.textContent = `
                        // Send events to parent
                        document.addEventListener('scroll', function() {
                            window.parent.postMessage('iframe-scroll', '*');
                        }, {passive: true});
                        
                        document.addEventListener('touchstart', function() {
                            window.parent.postMessage('iframe-touch', '*');
                        }, {passive: true});
                        
                        document.addEventListener('click', function() {
                            window.parent.postMessage('iframe-click', '*');
                        }, {passive: true});
                    `;
                    
                    // Add script to iframe
                    iframeDoc.head.appendChild(script);
                } catch(e) {
                    // Access might be denied due to cross-origin policy
                    console.log('Could not access iframe for events', e);
                }
            });
        });
    }
    
    // Listen for messages from iframes
    window.addEventListener('message', function(event) {
        // Check if it's our custom event
        if (['iframe-scroll', 'iframe-touch', 'iframe-click'].includes(event.data)) {
            closeMenu();
        }
    });
    
    // Initial setup
    setupIframeListeners();
    
    // Watch for new iframes that might be added later
    if (previewContent) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    setupIframeListeners();
                }
            });
        });
        
        observer.observe(previewContent, { childList: true, subtree: true });
    }
});