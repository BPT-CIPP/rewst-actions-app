
document.addEventListener('DOMContentLoaded', function() {
    const modeToggle = document.getElementById('modeToggle');
    const logo = document.getElementById('logo');
    let isLightMode = true;  // Initial state

    modeToggle.addEventListener('click', () => {
        if (isLightMode) {
            document.body.classList.add('light-mode');
            logo.src = 'light-mode-toggle-icon.png';  // Light mode logo
            modeToggle.textContent = 'Switch to Dark Mode';
        } else {
            document.body.classList.remove('light-mode');
            logo.src = 'dark-mode-toggle-icon.png';  // Dark mode logo
            modeToggle.textContent = 'Switch to Light Mode';
        }
        isLightMode = !isLightMode;  // Toggle the state
    });
});
