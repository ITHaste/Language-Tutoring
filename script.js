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

    // --- 2. TUTOR FILTERING VIA LANGUAGE CARDS ---
    const langCards = document.querySelectorAll('.lang-card[data-filter]');
    const tutorCards = document.querySelectorAll('.tutor-card');
    const tutorsSection = document.getElementById('tutors');

    if (langCards.length > 0 && tutorCards.length > 0) {
        langCards.forEach(card => {
            card.addEventListener('click', () => {
                const filter = card.getAttribute('data-filter');

                // Scroll to the tutors section
                if (tutorsSection) {
                    tutorsSection.scrollIntoView({ behavior: 'smooth' });
                }

                // Update active card style
                langCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                // Filter the tutor cards
                tutorCards.forEach(tutorCard => {
                    const cardLanguages = tutorCard.getAttribute('data-language');
                    if (filter === 'all' || cardLanguages.includes(filter)) {
                        tutorCard.classList.remove('hide');
                    } else {
                        tutorCard.classList.add('hide');
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

    // --- 7. STRIPE PAYMENT INTEGRATION ---
    document.querySelectorAll('button.purchase-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();

            const originalButtonText = button.textContent;
            button.disabled = true;
            button.textContent = 'Redirecting...';

            const productName = button.dataset.productName;
            const unitAmount = parseFloat(button.dataset.unitAmount);
            const quantity = parseInt(button.dataset.quantity || '1');
            const tutorNameElement = document.querySelector('.profile-details h1');
            const tutorName = tutorNameElement ? tutorNameElement.textContent.trim().split(' ')[0] : 'Unknown Tutor';

            if (!productName || isNaN(unitAmount)) {
                console.error('Missing product details for Stripe checkout.');
                alert('Could not initiate payment. Missing product details.');
                button.disabled = false;
                button.textContent = originalButtonText;
                return;
            }

            try {
                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productName, unitAmount, quantity, tutorName, cancelPath: window.location.pathname }),
                });

                const session = await response.json();

                if (session.url) {
                    window.location.href = session.url; // Redirect to Stripe Checkout
                } else {
                    button.disabled = false;
                    button.textContent = originalButtonText;
                    alert(session.error || 'Failed to create checkout session.');
                }
            } catch (error) {
                console.error('Error initiating Stripe checkout:', error);
                button.disabled = false;
                button.textContent = originalButtonText;
                alert('An error occurred while initiating payment. Please try again.');
            }
        });
    });
});
