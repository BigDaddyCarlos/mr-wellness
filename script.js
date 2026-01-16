// Contact Form Handler for Mr. Wellness
document.addEventListener('DOMContentLoaded', function() {
    // Get all forms on the page
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
            const name = formData.get('name') || form.querySelector('input[aria-label="Name"], input[aria-label="Nombre"]')?.value;
            const email = formData.get('email') || form.querySelector('input[aria-label="Email"], input[aria-label="Correo"]')?.value;
            const message = formData.get('message') || form.querySelector('textarea')?.value;
            
            // Basic validation
            if (!name || !email || !message) {
                alert('Please fill in all fields / Por favor completa todos los campos');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email / Por favor ingresa un correo válido');
                return;
            }
            
            // Create mailto link as fallback
            const subject = encodeURIComponent('New Contact Form Submission - Mr. Wellness');
            const body = encodeURIComponent(
                `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
            );
            
            // You can replace this email with your actual email
            const mailtoLink = `mailto:contact@mr-wellness.com?subject=${subject}&body=${body}`;
            
            // Show success message
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = '✓ Sent! / ¡Enviado!';
            submitButton.disabled = true;
            
            // Open mailto link
            window.location.href = mailtoLink;
            
            // Reset form after 2 seconds
            setTimeout(() => {
                form.reset();
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }, 2000);
        });
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
