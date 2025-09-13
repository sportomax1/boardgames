// New page JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('New page loaded successfully!');
    
    // Add any future functionality for the new page here
    // For now, we'll just log that the page has loaded
    
    // Example: Add click tracking for the back button
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', function() {
            console.log('Navigating back to main page');
        });
    }
});