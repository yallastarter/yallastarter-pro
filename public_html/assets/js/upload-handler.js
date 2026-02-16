// Photo Upload Handler for YallaStarter
class UploadHandler {
    constructor() {
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    }

    // Validate file
    validateFile(file) {
        if (!file) {
            return { valid: false, message: 'No file selected' };
        }

        if (!this.allowedTypes.includes(file.type)) {
            return { valid: false, message: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP)' };
        }

        if (file.size > this.maxFileSize) {
            return { valid: false, message: 'File too large. Maximum size is 5MB' };
        }

        return { valid: true };
    }

    // Create preview
    createPreview(file, previewElement) {
        const reader = new FileReader();

        reader.onload = (e) => {
            if (previewElement.tagName === 'IMG') {
                previewElement.src = e.target.result;
            } else {
                previewElement.style.backgroundImage = `url(${e.target.result})`;
            }
        };

        reader.readAsDataURL(file);
    }

    // Upload photo
    async uploadPhoto(file) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }

        if (!window.auth || !window.auth.isAuthenticated()) {
            return { success: false, message: 'You must be logged in to upload photos' };
        }

        return await window.auth.uploadPhoto(file);
    }

    // Setup file input handler
    setupFileInput(inputId, previewId, options = {}) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);

        if (!input || !preview) {
            console.error('Upload elements not found');
            return;
        }

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate
            const validation = this.validateFile(file);
            if (!validation.valid) {
                this.showError(validation.message, options.errorElementId);
                return;
            }

            // Show preview
            this.createPreview(file, preview);

            // Auto-upload if specified
            if (options.autoUpload) {
                const result = await this.uploadPhoto(file);
                if (result.success) {
                    this.showSuccess('Photo uploaded successfully!', options.successElementId);
                    if (options.onSuccess) {
                        options.onSuccess(result);
                    }
                } else {
                    this.showError(result.message, options.errorElementId);
                }
            }
        });
    }

    // Show error message
    showError(message, elementId) {
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = message;
                element.style.display = 'block';
                element.className = 'alert alert-error';
            }
        } else {
            alert(message);
        }
    }

    // Show success message
    showSuccess(message, elementId) {
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = message;
                element.style.display = 'block';
                element.className = 'alert alert-success';
            }
        } else {
            alert(message);
        }
    }

    // Trigger file input click
    triggerUpload(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.click();
        }
    }
}

// Create global upload instance
window.uploadHandler = new UploadHandler();
