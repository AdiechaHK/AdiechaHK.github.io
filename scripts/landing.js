document.addEventListener('DOMContentLoaded', () => {
    // === Theme Toggle Logic ===
    const themeBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = themeBtn.querySelector('i');

    // Check for saved user preference, if any, on load of the website
    const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;

    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);

        if (currentTheme === 'light') {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    }

    themeBtn.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');

        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    });

    // === Scroll Animations ===
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Select elements to animate
    const animateElements = document.querySelectorAll('.hero-content, .stat-card, .section-title, .timeline-item, .skill-tag');

    // Add logic to stagger delay based on index for certain groups of elements
    const staggerGroups = ['.stat-card', '.skill-tag']; // classes that share a parent container

    animateElements.forEach(el => {
        // Base state
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';

        // Check if element belongs to a stagger group
        /* Note: simple stagger implementation */
        if (el.classList.contains('stat-card')) {
            // Let's assume natural order in DOM works for basic stagger
            /* We can rely on CSS transition-delay too if we add classes in a loop, but here simpler: */
        }

        observer.observe(el);
    });

    // Add staggered delay via JS for skill tags (dynamic count)
    const skills = document.querySelectorAll('.skill-tag');
    skills.forEach((skill, index) => {
        skill.style.transitionDelay = `${(index % 10) * 50}ms`; // Stagger by 50ms, cycle every 10
    });

    const stats = document.querySelectorAll('.stat-card');
    stats.forEach((stat, index) => {
        stat.style.transitionDelay = `${index * 100}ms`;
    });

    // Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        if (anchor.getAttribute('href') === '#') return;

        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

