document.addEventListener('DOMContentLoaded', () => {
    const graphContainer = document.getElementById('contribution-graph');

    // GitHub contribution graph is usually 53 weeks (columns) x 7 days (rows)
    // But CSS grid handles flow-column automatically if we just dump ~365 divs

    const daysToGenerate = 371; // 53 * 7

    for (let i = 0; i < daysToGenerate; i++) {
        const day = document.createElement('div');
        day.classList.add('calendar-day');

        // Randomize contribution level
        // 0: No contribution (mostly this)
        // 1-4: Levels of activity

        const rand = Math.random();
        let level = '0';

        if (rand > 0.8) level = '1';
        if (rand > 0.9) level = '2';
        if (rand > 0.96) level = '3';
        if (rand > 0.99) level = '4';

        day.setAttribute('data-level', level);
        graphContainer.appendChild(day);
    }
});
