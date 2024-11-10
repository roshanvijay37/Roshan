const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            initializeParallax(entry.target);
        }
    });
}, {
    threshold: 0.1
});

function initializeParallax(element) {
    // Only enable parallax effect on non-touch devices
    if (window.matchMedia("(hover: hover)").matches) {
        window.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const xAxis = (window.innerWidth / 2 - clientX) / 25;
            const yAxis = (window.innerHeight / 2 - clientY) / 25;
            element.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // Parallax initialization
    const parallaxElements = document.querySelectorAll('.parallax-section');
    parallaxElements.forEach(element => observer.observe(element));

    // Menu toggle functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const menuOverlay = document.querySelector('.menu-overlay');
    
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        menuOverlay.classList.toggle('active');
    });
});
