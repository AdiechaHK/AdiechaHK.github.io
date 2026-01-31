document.addEventListener('DOMContentLoaded', () => {
    // Update Copyright Year
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Contribution Graph (if exists)
    const graphContainer = document.getElementById('contribution-graph');

    if (graphContainer) {
        const daysToGenerate = 371; // 53 * 7

        for (let i = 0; i < daysToGenerate; i++) {
            const day = document.createElement('div');
            day.classList.add('calendar-day');

            // Randomize contribution level
            const rand = Math.random();
            let level = '0';

            if (rand > 0.8) level = '1';
            if (rand > 0.9) level = '2';
            if (rand > 0.96) level = '3';
            if (rand > 0.99) level = '4';

            day.setAttribute('data-level', level);
            graphContainer.appendChild(day);
        }
    }
});
