document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const icon = mobileMenuBtn.querySelector('i');
            if (mobileMenu.classList.contains('hidden')) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            } else {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            }
        });
    }

    // Search toggle
    const searchToggle = document.getElementById('search-toggle');
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');

    if (searchToggle && searchModal) {
        searchToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            searchModal.classList.toggle('hidden');
            if (!searchModal.classList.contains('hidden')) {
                setTimeout(() => searchInput.focus(), 100);
            }
        });

        // Close search on click outside
        document.addEventListener('click', (e) => {
            if (!searchModal.contains(e.target) && e.target !== searchToggle) {
                searchModal.classList.add('hidden');
            }
        });
    }

    // Map Modal toggle
    const mapToggle = document.getElementById('map-toggle');
    const mapModal = document.getElementById('map-modal');
    const closeMap = document.getElementById('close-map');
    const mapOverlay = document.getElementById('map-modal-overlay');

    if (mapToggle && mapModal) {
        mapToggle.addEventListener('click', () => {
            mapModal.classList.remove('hidden');
            mapModal.classList.add('flex');
            document.body.style.overflow = 'hidden'; // Lock scroll
        });

        const hideMap = () => {
            mapModal.classList.add('hidden');
            mapModal.classList.remove('flex');
            document.body.style.overflow = ''; // Unlock scroll
        };

        if (closeMap) closeMap.addEventListener('click', hideMap);
        if (mapOverlay) mapOverlay.addEventListener('click', hideMap);
        
        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !mapModal.classList.contains('hidden')) {
                hideMap();
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
                // Close mobile menu if open
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    const icon = mobileMenuBtn.querySelector('i');
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });
    });
});
