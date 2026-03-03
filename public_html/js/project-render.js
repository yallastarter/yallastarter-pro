/**
 * Project Renderer for YallaStarter
 * Fetches and populates project data dynamically
 */

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('pid');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (!pid) {
        showError('No project ID provided. Please <a href="projects.html">browse projects</a>.');
        return;
    }

    try {
        const response = await fetch(`/api/projects/${pid}`);
        const result = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.message || 'Project not found');
        }

        const project = result.data;
        renderProject(project);

    } catch (error) {
        console.error('Error rendering project:', error);
        showError(`Failed to load project: ${error.message}`);
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
});

function renderProject(project) {
    // Basic Info
    document.title = `${project.title} - YallaStarter`;
    setText('proj-title', project.title);
    setText('proj-tagline', project.tagline);

    // Stats
    setText('proj-funded-percent', `${project.fundedPercent}%`);
    setText('proj-backers', project.backersCount.toLocaleString());
    setText('proj-days-left', project.daysLeft);
    setText('prog-backers-2', project.backersCount.toLocaleString());

    // Money
    setText('proj-raised', `SAR ${project.raisedAmount.toLocaleString()}`);
    setText('proj-goal', project.goalAmount.toLocaleString());

    // Deadline
    const deadlineDate = new Date(project.deadline);
    setText('proj-deadline', deadlineDate.toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
    }));

    // Images
    const heroImg = document.getElementById('proj-hero-img');
    if (heroImg) {
        heroImg.src = project.heroImageUrl || 'images/project-placeholder.jpg';
        heroImg.alt = project.title;
    }
    const heroBg = document.getElementById('hero-bg');
    if (heroBg && project.heroImageUrl) {
        heroBg.style.backgroundImage = `url('${project.heroImageUrl}')`;
    }

    // Progress Bar
    const progressBar = document.getElementById('proj-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${project.fundedPercent}%`;
    }

    // About Sections
    const aboutContent = document.getElementById('proj-about-content');
    if (aboutContent) {
        aboutContent.innerHTML = '';
        const sections = project.aboutSections || [];
        sections.forEach(text => {
            const p = document.createElement('p');
            p.className = 'project-description';
            p.textContent = text;
            aboutContent.appendChild(p);
        });
    }

    // Reward Tiers
    const rewardsList = document.getElementById('proj-rewards-list');
    if (rewardsList) {
        rewardsList.innerHTML = '';
        const tiers = project.rewardTiers || [];

        if (tiers.length === 0) {
            rewardsList.innerHTML = '<p class="text-muted">No specific rewards defined for this project.</p>';
        }

        tiers.forEach(tier => {
            const card = document.createElement('div');
            card.className = 'reward-card';

            const amount = document.createElement('div');
            amount.className = 'reward-amount';
            amount.textContent = `Pledge SAR ${tier.amount || 0} or more`;

            const title = document.createElement('h4');
            title.className = 'mt-2';
            title.textContent = tier.title || 'Support the project';

            const desc = document.createElement('p');
            desc.textContent = tier.description || '';

            card.appendChild(amount);
            card.appendChild(title);
            card.appendChild(desc);

            if (tier.deliveryDate) {
                const delivery = document.createElement('div');
                delivery.className = 'small text-muted mt-2';
                delivery.innerHTML = `<i class="far fa-calendar-alt me-1"></i> Estimated delivery: ${tier.deliveryDate}`;
                card.appendChild(delivery);
            }

            rewardsList.appendChild(card);
        });
    }

    // Auth state check for Nav
    checkAuthState();
}

async function checkAuthState() {
    try {
        const res = await fetch('/api/auth/me');
        const user = await res.json();
        const loginBtn = document.getElementById('nav-login-btn');
        if (user.success && loginBtn) {
            loginBtn.textContent = 'Dashboard';
            loginBtn.href = '/dashboard.html';
        }
    } catch (e) {
        // Not logged in, keep default
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function showError(message) {
    const container = document.querySelector('.project-hero .container') || document.body;
    container.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-8 text-center py-5">
                <i class="fas fa-exclamation-circle fa-4x text-danger mb-4"></i>
                <h1 class="text-white">Oops!</h1>
                <p class="lead text-white">${message}</p>
                <a href="projects.html" class="btn btn-primary mt-3">Browse all projects</a>
            </div>
        </div>
    `;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}
