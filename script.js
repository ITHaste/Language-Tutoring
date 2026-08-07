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

    // --- 4. FAQ ACCORDION LOGIC ---
    const faqItems = document.querySelectorAll('.faq-item');

    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {
                // Check if the item is already active
                const isActive = item.classList.contains('active');

                // Close all other items
                faqItems.forEach(otherItem => otherItem.classList.remove('active'));

                // If the item was not active, open it
                if (!isActive) item.classList.add('active');
            });
        });
    }

    // --- 5. CONTACT FORM SUBMISSION LOGIC ---
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');

    if (contactForm && formStatus) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default form submission

            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            // Clear previous status
            formStatus.style.display = 'none';
            formStatus.textContent = '';
            formStatus.className = 'form-status';

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (response.ok) {
                    formStatus.textContent = result.message;
                    formStatus.classList.add('success');
                    contactForm.reset(); // Clear the form
                } else {
                    formStatus.textContent = result.error || 'An unknown error occurred.';
                    formStatus.classList.add('error');
                }
            } catch (error) {
                console.error('Network error or API call failed:', error);
                formStatus.textContent = 'An unexpected error occurred. Please try again later.';
                formStatus.classList.add('error');
            } finally {
                formStatus.style.display = 'block';
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
});