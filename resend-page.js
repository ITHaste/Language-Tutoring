document.addEventListener('DOMContentLoaded', () => {
    const resendForm = document.getElementById('resendForm');
    const resendStatus = document.getElementById('resendStatus');

    if (resendForm) {
        resendForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const transactionId = document.getElementById('transactionId').value;
            const submitButton = resendForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;

            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';
            resendStatus.style.display = 'none';
            resendStatus.className = 'form-status';

            try {
                const response = await fetch('/api/resend-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transactionId }),
                });

                const result = await response.json();

                if (response.ok) {
                    resendStatus.textContent = result.message;
                    resendStatus.classList.add('success');
                } else {
                    throw new Error(result.error || 'An unknown error occurred.');
                }
            } catch (error) {
                resendStatus.textContent = error.message;
                resendStatus.classList.add('error');
            } finally {
                resendStatus.style.display = 'block';
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
});