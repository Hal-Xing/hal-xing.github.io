document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileContent = document.querySelector('.mobile-content');
    
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
});