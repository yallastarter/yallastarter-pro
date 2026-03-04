/**
 * project-render.js
 * Fetches project data from /api/projects/:pid and populates project.html
 */

(async function () {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('pid');
    const overlay = document.getElementById('loading-overlay');
    const content = document.getElementById('page-content');
    const errorState = document.getElementById('error-state');

    function show(el) { if (el) el.style.display = ''; }
    function hide(el) { if (el) el.style.display = 'none'; }
    function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
    function setAttr(id, attr, val) { const el = document.getElementById(id); if (el) el[attr] = val; }

    function showError(msg) {
        hide(overlay);
        hide(content);
        setText('error-message', msg);
        show(errorState);
    }

    // ── Format a number nicely
    function fmtNum(n) {
        if (n == null) return '0';
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
        return n.toLocaleString();
    }

    // ── Convert YouTube / Vimeo URL to embed URL
    function toEmbedUrl(url) {
        if (!url) return null;
        try {
            // YouTube
            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
            if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
            // Vimeo
            const vmMatch = url.match(/vimeo\.com\/(\d+)/);
            if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
        } catch (e) { }
        return null;
    }

    // ── Status badge styling
    function statusClass(status) {
        const map = { active: 'status-active', pending: 'status-pending', funded: 'status-funded', closed: 'status-closed', draft: 'status-pending' };
        return map[status] || 'status-pending';
    }

    if (!pid) {
        showError('No project ID provided. Please browse the projects list to find a project.');
        return;
    }

    try {
        const res = await fetch(`/api/projects/${encodeURIComponent(pid)}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const result = await res.json();
        if (!result.success || !result.data) throw new Error(result.message || 'Project not found');

        const p = result.data;

        // ── Page meta
        const pageTitle = `${p.title} — YallaStarter`;
        document.title = pageTitle;
        document.getElementById('page-title')?.setAttribute('content', pageTitle);
        setText('og-title', pageTitle);
        setText('og-description', p.tagline || p.description || '');
        if (p.heroImageUrl) {
            const ogImg = document.getElementById('og-image');
            if (ogImg) ogImg.setAttribute('content', p.heroImageUrl);
        }

        // ── Hero
        setText('proj-title', p.title);
        setText('proj-tagline', p.tagline || (p.description ? p.description.substring(0, 160) : ''));
        setText('proj-category', (p.category || 'Project').toUpperCase());
        setText('proj-funded-pct', `${p.fundedPercent}%`);
        setText('proj-backers', fmtNum(p.backersCount));
        setText('proj-days-left', p.daysLeft > 0 ? p.daysLeft : 'Ended');
        setText('proj-raised-hero', fmtNum(p.raisedAmount));

        // Hero background
        const heroBg = document.getElementById('hero-bg');
        const imgSrc = p.heroImageUrl || p.coverImage || p.cardImageUrl || null;
        const fallbackSrc = 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&q=80';
        if (heroBg && imgSrc) {
            heroBg.style.backgroundImage = `url('${imgSrc}')`;
        }

        // Hero image card
        const heroImg = document.getElementById('proj-hero-img');
        if (heroImg) {
            heroImg.src = imgSrc || fallbackSrc;
            heroImg.alt = p.title;
            heroImg.onerror = function () {
                this.onerror = null;
                this.src = fallbackSrc;
                if (heroBg) heroBg.style.backgroundImage = `url('${fallbackSrc}')`;
            };
        }

        // ── Creator card
        const creatorCard = document.getElementById('creator-card');
        if (p.creator && creatorCard) {
            const name = p.creator.username || p.creator.name || 'YallaStarter Creator';
            setText('creator-name', name);
            const avatarEl = document.getElementById('creator-avatar');
            if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

            const statusBadge = document.getElementById('proj-status-badge');
            if (statusBadge) {
                statusBadge.textContent = p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : '';
                statusBadge.className = `ms-auto status-badge ${statusClass(p.status)}`;
            }
            creatorCard.style.display = 'flex';
        }

        // ── About sections
        const aboutEl = document.getElementById('proj-about-content');
        if (aboutEl) {
            aboutEl.innerHTML = '';
            const sections = p.aboutSections && p.aboutSections.length > 0
                ? p.aboutSections
                : [p.story || p.description || 'No description provided.'];

            sections.forEach(text => {
                if (!text || !text.trim()) return;
                const para = document.createElement('p');
                para.className = 'about-paragraph';
                para.textContent = text;
                aboutEl.appendChild(para);
            });
        }

        // ── Video embed
        if (p.videoUrl) {
            const embedUrl = toEmbedUrl(p.videoUrl);
            if (embedUrl) {
                const videoSection = document.getElementById('proj-video-section');
                const videoEmbed = document.getElementById('proj-video-embed');
                if (videoSection && videoEmbed) {
                    const iframe = document.createElement('iframe');
                    iframe.src = embedUrl;
                    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                    iframe.allowFullscreen = true;
                    videoEmbed.appendChild(iframe);
                    videoSection.style.display = '';
                }
            }
        }

        // ── Gallery
        const gallery = p.gallery || [];
        if (gallery.length > 0) {
            const gallerySection = document.getElementById('proj-gallery-section');
            const galleryGrid = document.getElementById('proj-gallery-grid');
            if (gallerySection && galleryGrid) {
                gallery.forEach(url => {
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = p.title + ' gallery';
                    img.loading = 'lazy';
                    img.onerror = () => item.style.display = 'none';
                    item.appendChild(img);
                    galleryGrid.appendChild(item);
                });
                gallerySection.style.display = '';
            }
        }

        // ── Rewards
        const rewardsList = document.getElementById('proj-rewards-list');
        if (rewardsList) {
            const tiers = p.rewardTiers || [];
            if (tiers.length === 0) {
                rewardsList.innerHTML = `
                    <div style="text-align:center; padding: 2.5rem; background:#f8f9fa; border-radius:16px; color:#888;">
                        <i class="fas fa-gift fa-2x mb-3" style="color:#ddd;"></i>
                        <p>This project does not offer specific reward tiers. All backers help bring it to life!</p>
                    </div>`;
            } else {
                tiers.forEach(tier => {
                    const card = document.createElement('div');
                    card.className = 'reward-card';

                    const badge = document.createElement('div');
                    badge.className = 'reward-amount-badge';
                    badge.innerHTML = `<i class="fas fa-star"></i> Pledge SAR ${(tier.amount || 0).toLocaleString()} or more`;

                    const title = document.createElement('div');
                    title.className = 'reward-title';
                    title.textContent = tier.title || 'Support the project';

                    const desc = document.createElement('div');
                    desc.className = 'reward-desc';
                    desc.textContent = tier.description || '';

                    card.appendChild(badge);
                    card.appendChild(title);
                    card.appendChild(desc);

                    if (tier.deliveryDate) {
                        const delivery = document.createElement('div');
                        delivery.className = 'reward-delivery';
                        delivery.innerHTML = `<i class="far fa-calendar-alt"></i> Estimated delivery: ${tier.deliveryDate}`;
                        card.appendChild(delivery);
                    }

                    if (tier.includes && tier.includes.length > 0) {
                        const incl = document.createElement('ul');
                        incl.style.cssText = 'margin-top:0.85rem; padding-left:1.25rem; color:#555; font-size:0.88rem;';
                        tier.includes.forEach(item => {
                            const li = document.createElement('li');
                            li.textContent = item;
                            incl.appendChild(li);
                        });
                        card.appendChild(incl);
                    }

                    rewardsList.appendChild(card);
                });
            }
        }

        // ── Support Card
        setText('proj-raised-card', `SAR ${(p.raisedAmount || 0).toLocaleString()}`);
        setText('proj-goal', (p.goalAmount || 0).toLocaleString());
        setText('proj-backers-card', fmtNum(p.backersCount));
        setText('proj-days-left-card', p.daysLeft > 0 ? p.daysLeft : 'Ended');
        setText('proj-pct-label', `${p.fundedPercent}% funded`);

        const bar = document.getElementById('proj-progress-bar');
        if (bar) bar.style.width = `${Math.min(100, p.fundedPercent)}%`;

        if (p.deadline) {
            const dl = new Date(p.deadline);
            const dlStr = dl.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            setText('proj-deadline-text', `All or nothing — fully funded by ${dlStr} or backers are not charged.`);
        }

        // Disable back button if ended
        if (p.daysLeft <= 0 || p.status === 'closed') {
            const btn = document.getElementById('btn-back');
            if (btn) {
                btn.textContent = 'Funding Period Ended';
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'default';
            }
        }

        // ── Auth nav
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (token) {
                const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                const meData = await meRes.json();
                if (meData.success) {
                    const btn = document.getElementById('nav-auth-btn');
                    if (btn) { btn.textContent = 'Dashboard'; btn.href = 'dashboard.html'; }
                }
            }
        } catch (_) { }

        // ── Show page
        hide(overlay);
        show(content);

        // Animate the progress bar after render
        requestAnimationFrame(() => {
            const b = document.getElementById('proj-progress-bar');
            if (b) b.style.width = `${Math.min(100, p.fundedPercent)}%`;
        });

    } catch (err) {
        console.error('Error loading project:', err);
        showError(err.message || 'Failed to load project. Please try again.');
    }
})();
