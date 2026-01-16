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
            
            // Determine language for success message
            const isSpanish = document.documentElement.lang === 'es' || document.querySelector('h1')?.textContent.includes('SALUD');
            const successMessage = isSpanish 
                ? '¡Gracias por confiar en mí, te respondo a la brevedad!' 
                : 'Thank You, I\'ll be getting back to you soon!';
            
            // Create mailto links for both email addresses
            const subject = encodeURIComponent('New Contact Form Submission - Mr. Wellness');
            const body = encodeURIComponent(
                `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
            );
            
            // Create success popup
            const popup = document.createElement('div');
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #4CAF50;
                color: white;
                padding: 30px 50px;
                border-radius: 10px;
                font-size: 18px;
                font-weight: bold;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                text-align: center;
            `;
            popup.textContent = successMessage;
            document.body.appendChild(popup);
            
            // Open mailto links for both email addresses
            const mailtoLink1 = `mailto:carlos__zamora@hotmail.com?subject=${subject}&body=${body}`;
            const mailtoLink2 = `mailto:carlos00zamora@gmail.com?subject=${subject}&body=${body}`;
            
            // Open first email
            window.open(mailtoLink1, '_blank');
            // Small delay before opening second email
            setTimeout(() => {
                window.open(mailtoLink2, '_blank');
            }, 500);
            
            // Reset form
            form.reset();
            
            // Remove popup after 3 seconds
            setTimeout(() => {
                popup.style.opacity = '0';
                popup.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    document.body.removeChild(popup);
                }, 500);
            }, 3000);
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
