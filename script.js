// Wait for the DOM (HTML layout) to fully load before running scripts

console.log("Script loaded successfully!");
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. THEME TOGGLE LOGIC ---
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Apply saved theme on load or default to system preference
    const savedTheme = localStorage.getItem('theme');
    applyTheme(savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light'));

    // --- 2. TUTOR FILTER LOGIC ---
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

    // --- 3. RESPONSIVE NAVIGATION LOGIC ---
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-links');

    if (hamburger && navMenu) {
        // Toggle mobile menu on hamburger click
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            const isExpanded = navMenu.classList.contains('active');
            hamburger.setAttribute('aria-expanded', isExpanded);
        });

        // Close mobile menu when a link is clicked
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // --- 4. SMOOTH SCROLLING FOR ANCHOR LINKS ---
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

    // --- 5. FAQ ACCORDION LOGIC ---
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

    // --- 6. CONTACT FORM SUBMISSION LOGIC ---
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

    // --- 7. PAYMENT LINK HANDLING (REDIRECTS & ANALYTICS) ---
    document.querySelectorAll('a.purchase-btn[href*="ko-fi.com"], a.purchase-btn[href*="trakteer.id"]').forEach(button => {
        const isKofi = button.href.includes('ko-fi.com');
        const isTrakteer = button.href.includes('trakteer.id');

        // --- DYNAMIC REDIRECT LOGIC (for Ko-fi links) ---
        if (isKofi) {
            try {
                const kofiUrl = new URL(button.href);
                const redirectParam = kofiUrl.searchParams.get('redirect');

                if (redirectParam) {
                    const redirectUrl = new URL(redirectParam);
                    redirectUrl.origin = window.location.origin;
                    kofiUrl.searchParams.set('redirect', redirectUrl.toString());
                    button.href = kofiUrl.toString();
                }
            } catch (error) {
                console.error('Failed to update Ko-fi redirect URL:', error, button.href);
            }
        }

        // --- ANALYTICS CLICK TRACKING (for both Ko-fi and Trakteer) ---
        button.addEventListener('click', (e) => {
            // Prevent the default navigation to allow time for tracking.
            e.preventDefault();

            const pricingCard = button.closest('.pricing-card');
            const h1 = document.querySelector('h1');
            let productName = 'Unknown Product';
            if (pricingCard) {
                const h3 = pricingCard.querySelector('h3');
                if (h3) productName = h3.textContent.trim();
            }

            let tutorName = 'Unknown Tutor';
            if (h1) {
                // Extracts the first name from "Kevin van Dijken"
                tutorName = h1.textContent.trim().split(' ')[0];
            }

            const platform = isKofi ? 'Ko-fi' : (isTrakteer ? 'Trakteer' : 'Unknown');
            const eventName = `${platform} Redirect`;

            if (window.va && typeof window.va === 'function') {
                window.va('track', eventName, { product: productName, tutor: tutorName });
            }

            // Navigate to the Ko-fi page after a short delay to ensure the event is sent.
            const url = button.href;
            setTimeout(() => { window.location.href = url; }, 300);
        });
    });
});