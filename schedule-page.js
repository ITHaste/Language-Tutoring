document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const verificationGate = document.getElementById('verificationGate');
    const verificationLoading = document.getElementById('verificationLoading');
    const verificationInput = document.getElementById('verificationInput');
    const verificationForm = document.getElementById('verificationForm');
    const transactionIdInput = document.getElementById('transactionId');
    const verificationStatus = document.getElementById('verificationStatus');
    const schedulingContent = document.getElementById('schedulingContent');

    // --- VERIFICATION LOGIC ---
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get('transactionId');
    const tutor = urlParams.get('tutor'); // Expects 'kevin' or 'calvina'

    if (transactionId && tutor) {
        // If ID and tutor are in URL, verify automatically
        verifyPurchase(transactionId, tutor);
    } else {
        // Otherwise, show the manual input form
        verificationInput.style.display = 'block';
        verificationForm.style.display = 'flex';
        verificationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            verificationStatus.textContent = 'Please use the link from your Ko-fi purchase. Manual entry requires a tutor to be specified in the URL.';
            verificationStatus.className = 'form-status error';
            verificationStatus.style.display = 'block';
        });
    }

    async function verifyPurchase(id, tutorName) {
        verificationInput.style.display = 'none';
        verificationForm.style.display = 'none';
        verificationLoading.style.display = 'block';
        verificationStatus.style.display = 'none';

        try {
            const response = await fetch('/api/verify-purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId: id }),
            });

            if (response.ok) {
                verificationGate.style.display = 'none';
                schedulingContent.style.display = 'block';
                initScheduler(tutorName); // Initialize the calendar for the correct tutor
            } else {
                const result = await response.json();
                throw new Error(result.error || 'Verification failed.');
            }
        } catch (error) {
            verificationLoading.innerHTML = `<h1>Verification Failed</h1><p>${error.message}</p><p>Please check your Transaction ID or contact support.</p>`;
        }
    }

    // --- SCHEDULER LOGIC ---
    function initScheduler(tutorName) {
        const calendarGrid = document.getElementById('calendar-grid');
        const currentWeekDisplay = document.getElementById('current-week-display');
        const prevWeekBtn = document.getElementById('prev-week');
        const nextWeekBtn = document.getElementById('next-week');
        const confirmationSection = document.getElementById('confirmation-section');
        const selectedTimeDisplay = document.getElementById('selected-time-display');
        const bookingForm = document.getElementById('booking-form');
        const studentEmailInput = document.getElementById('student-email');
        const bookingStatus = document.getElementById('booking-status');

        let currentDate = new Date();
        let selectedTimeSlot = null;

        const tutorSchedules = {
            'kevin': [7, 8, 9, 10, 11, 12, 13, 14, 15], // 7 AM - 3 PM UTC
            'calvina': [2, 3, 4, 5, 6, 7, 8, 9, 10]    // 9 AM - 5 PM in UTC+7 (Jakarta)
        };

        const availableUTCHours = tutorSchedules[tutorName] || tutorSchedules['kevin'];

        const renderCalendar = () => {
            calendarGrid.innerHTML = '';
            const now = new Date();
            const today = new Date(currentDate);
            const dayOfWeek = today.getDay();
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(today.setDate(today.getDate() + diffToMonday));

            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            const options = { month: 'long', day: 'numeric' };
            currentWeekDisplay.textContent = `${monday.toLocaleDateString('en-US', options)} - ${friday.toLocaleDateString('en-US', options)}, ${friday.getFullYear()}`;

            for (let i = 0; i < 5; i++) {
                const day = new Date(monday);
                day.setDate(monday.getDate() + i);
                const dayForCompare = new Date(day);
                dayForCompare.setHours(0, 0, 0, 0);
                const nowForCompare = new Date();
                nowForCompare.setHours(0, 0, 0, 0);

                const dayColumn = document.createElement('div');
                dayColumn.className = 'custom-calendar-day';
                if (dayForCompare.getTime() === nowForCompare.getTime()) {
                    dayColumn.classList.add('is-today');
                }

                const dayHeader = document.createElement('div');
                dayHeader.className = 'custom-calendar-day-header';
                dayHeader.innerHTML = `<h4>${day.toLocaleDateString('en-US', { weekday: 'long' })}</h4><p>${day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>`;
                dayColumn.appendChild(dayHeader);

                const timeSlotsContainer = document.createElement('div');
                timeSlotsContainer.className = 'time-slots';

                for (const hourUTC of availableUTCHours) {
                    const timeSlot = document.createElement('button');
                    timeSlot.className = 'time-slot';
                    const time = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hourUTC, 0, 0));
                    timeSlot.textContent = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    timeSlot.dataset.datetime = time.toISOString();
                    if (time < now) {
                        timeSlot.disabled = true;
                        timeSlot.classList.add('is-past');
                    }
                    timeSlotsContainer.appendChild(timeSlot);
                }
                dayColumn.appendChild(timeSlotsContainer);
                calendarGrid.appendChild(dayColumn);
            }
        };

        const changeWeek = (offset) => {
            currentDate.setDate(currentDate.getDate() + offset * 7);
            renderCalendar();
        };

        prevWeekBtn.addEventListener('click', () => changeWeek(-1));
        nextWeekBtn.addEventListener('click', () => changeWeek(1));

        calendarGrid.addEventListener('click', (e) => {
            const clickedSlot = e.target;
            if (clickedSlot.classList.contains('time-slot') && !clickedSlot.disabled) {
                if (selectedTimeSlot) selectedTimeSlot.classList.remove('is-selected');
                clickedSlot.classList.add('is-selected');
                selectedTimeSlot = clickedSlot;
                const selectedTime = new Date(selectedTimeSlot.dataset.datetime);
                selectedTimeDisplay.textContent = selectedTime.toLocaleString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                confirmationSection.style.display = 'block';
                confirmationSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!selectedTimeSlot || !studentEmailInput.value) return;
            const button = bookingForm.querySelector('button');
            button.disabled = true;
            button.textContent = 'Booking...';
            bookingStatus.style.display = 'none';

            try {
                const response = await fetch('/api/book-lesson', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: studentEmailInput.value,
                        selectedTime: selectedTimeSlot.dataset.datetime,
                        tutor: tutorName, // Send the tutor's name to the backend
                    }),
                });
                const result = await response.json();
                if (response.ok) {
                    bookingStatus.textContent = result.message;
                    bookingStatus.className = 'form-status success';
                    bookingForm.style.display = 'none';
                } else {
                    throw new Error(result.error || 'An unknown error occurred.');
                }
            } catch (error) {
                bookingStatus.textContent = 'An unexpected server error occurred. Please check the API logs on Vercel for more details.';
                bookingStatus.className = 'form-status error';
                button.disabled = false;
                button.textContent = 'Confirm & Book Lesson';
            } finally {
                bookingStatus.style.display = 'block';
            }
        });

        renderCalendar();
    }
});