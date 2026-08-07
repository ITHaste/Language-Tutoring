// Wait for the DOM (HTML layout) to fully load before running scripts
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. TUTOR FILTER LOGIC ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    const tutorCards = document.querySelectorAll('.tutor-card');

    if (filterButtons.length > 0 && tutorCards.length > 0) {
        // Attach click event listeners to each filter button
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {

                // A. Update Active Button Style
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // B. Get the selected filter value (e.g., 'all', 'dutch', 'english')
                const selectedFilter = button.getAttribute('data-filter');

                // C. Filter the Tutor Cards
                tutorCards.forEach(card => {
                    const cardLanguages = card.getAttribute('data-language'); // e.g., "dutch english"

                    // If 'All' is selected, or the card's languages include the filter, show it
                    if (selectedFilter === 'all' || cardLanguages.includes(selectedFilter)) {
                        card.classList.remove('hide');
                    } else {
                        card.classList.add('hide');
                    }
                });
            });
        });
    }

    // --- 2. RESPONSIVE NAVIGATION LOGIC ---
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-links');

    if (hamburger && navMenu) {
        // Toggle mobile menu on hamburger click
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close mobile menu when a link is clicked
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // --- 3. SMOOTH SCROLLING FOR ANCHOR LINKS ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // Prevent the default jump-to-anchor behavior
            e.preventDefault();

            const href = this.getAttribute('href');

            // Make sure it's not just a "#" link
            if (href.length > 1) {
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
});