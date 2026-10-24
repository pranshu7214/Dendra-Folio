// ======== CINEMATIC SCROLL PHYSICS SYSTEM v2.2 (MASTER) ========
// Premium parallax + planet motion, tuned for maximum smoothness & performance

let currentScrollY = window.scrollY;
let targetScrollY = window.scrollY;
let lastScrollY = currentScrollY;
let animationFrameId = null;

let lastSidebarUpdate = 0;

const CARD_SELECTOR = ".card:not(.card-simple):not(.card-static), .content-card:not(.card-simple):not(.card-static), .solid-glass:not(.card-simple):not(.card-static), .glass-panel";

// Performance Cache to prevent memory leaks
const physicsCache = {
    elements: null,
    metrics: null,
    sidebarElements: null,
    progressBar: null
};

// Smooth linear interpolation (Lerp)
function lerp(start, end, progress) {
    return start + (end - start) * Math.min(Math.max(progress, 0), 1);
}

// Helper for quadratic bezier curves (for smooth, cinematic paths)
function quadraticBezier(p0, p1, p2, t) {
    const oneMinusT = 1 - t;
    return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2;
}

let lastRibbonProgress = -1;
function updateRibbonScrollState() {
    const ribbon = document.querySelector(".ribbon");
    if (!ribbon) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    
    // Smooth, slow compression: reaches resting size right when quote section almost touches the ribbon
    const quoteSection = document.getElementById("quote-section");
    const ribbonH = ribbon.offsetHeight || 60;
    
    let targetDistance;
    if (quoteSection) {
        const quoteTop = quoteSection.getBoundingClientRect().top + scrollY;
        targetDistance = Math.max(quoteTop - ribbonH - 25, 340);
    } else {
        targetDistance = Math.max(window.innerHeight * 0.60, 360);
    }

    const progress = Math.min(Math.max(scrollY / targetDistance, 0), 1);
    if (Math.abs(progress - lastRibbonProgress) > 0.003) {
        lastRibbonProgress = progress;
        ribbon.style.setProperty("--scroll-progress", progress.toFixed(3));
        if (progress >= 1) {
            ribbon.classList.add("scrolled");
        } else {
            ribbon.classList.remove("scrolled");
        }
    }
}

// Track scroll position (Passive flag makes native scrolling much faster)
window.addEventListener("scroll", () => {
    targetScrollY = window.scrollY;
    updateRibbonScrollState();

    if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(updateCinematicPhysics);
    }
}, { passive: true });

// Debounce resize to avoid browser calculation storms
let resizeTimeout = null;
let lastWindowWidth = window.innerWidth;

window.addEventListener("resize", () => {
    if (window.innerWidth === lastWindowWidth) return; // Ignore vertical-only resize (mobile URL bar)
    lastWindowWidth = window.innerWidth;

    physicsCache.metrics = null; // Drop cached metrics immediately
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resizeTimeout = null;
        if (animationFrameId === null) {
            animationFrameId = requestAnimationFrame(updateCinematicPhysics);
        }
    }, 150);
});

// Recalculate metrics after full page load to ensure maxScroll is correct
window.addEventListener("load", () => {
    physicsCache.metrics = null;
    updateRibbonScrollState();
    if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(updateCinematicPhysics);
    }
});

function updateCinematicPhysics(now) {
    now = now || performance.now();

    // 1. Initialize Elements Cache (Runs only once)
    if (!physicsCache.elements) {
        const jupiterEl = document.querySelector(".jupiter");
        const quoteSection = document.getElementById("quote-section") || document.querySelector(".page-intro");
        const librarySection = document.getElementById("library-section") || document.querySelector(".content-grid");
        const showcaseSection = document.getElementById("showcase-gallery");
        const spaceBg = document.querySelector(".space-bg");
        const cards = document.querySelectorAll(CARD_SELECTOR);
        const progressBar = document.getElementById('reading-progress');
        const isHomePage = document.body.classList.contains("home-page") || document.getElementById("showcase-gallery") !== null;

        if (isHomePage && jupiterEl) {
            jupiterEl.style.transition = "opacity 1.2s ease-out";
            requestAnimationFrame(() => {
                jupiterEl.style.opacity = "0.35";
                setTimeout(() => {
                    if (jupiterEl) jupiterEl.style.transition = "none";
                }, 1300);
            });
        }
        physicsCache.elements = { jupiterEl, quoteSection, librarySection, showcaseSection, spaceBg, cards, progressBar, isHomePage };
    }
    const { jupiterEl, quoteSection, librarySection, showcaseSection, spaceBg, cards, progressBar, isHomePage } = physicsCache.elements;

    // 2. Initialize Metrics Cache (Runs on load & resize)
    if (!physicsCache.metrics) {
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        // Normalize screen height on tall viewports
        const effectiveHeight = Math.min(windowHeight, Math.max(windowWidth * 0.72, 720));
        const maxScroll = Math.max(document.documentElement.scrollHeight - windowHeight, 1);
        
        // JUPITER: THE FULL HOMEPAGE ORBITAL GLIDE
        // Covers the WHOLE length of scrolling and parks with exactly 30% visible on right edge at maxScroll
        const sizeFactor = Math.min(Math.max(windowWidth / 1400, 0.72), 1.15);
        const endScale = 0.75 * sizeFactor;
        const endDiameter = 450 * endScale;

        // Exactly 30% visible on right edge:
        // Visible width in screen = 0.30 * endDiameter (from windowWidth - 0.30*endDiameter to windowWidth).
        // Since transform-origin is center (225px), top-left translate3d X is:
        // windowWidth - 225 + (0.20 * endDiameter).
        const endX = windowWidth - 225 + (0.20 * endDiameter);
        const endY = effectiveHeight * 0.32;

        const jupiterPath = {
            p0: { x: -180 * sizeFactor, y: effectiveHeight * 0.12 }, // Upper-left entrance at hero masthead
            p1: { x: windowWidth * 0.48, y: effectiveHeight * 0.70 }, // Deep gravitational curve across central cosmos
            p2: { x: endX, y: endY } // Settles at the right edge with exactly 30% visible at the end of scroll
        };

        physicsCache.metrics = { windowHeight, windowWidth, effectiveHeight, maxScroll, sizeFactor, jupiterPath };
    }
    const { windowHeight, windowWidth, effectiveHeight, maxScroll, sizeFactor, jupiterPath } = physicsCache.metrics;
    
    // Direct, instant 1:1 scroll tracking (Eliminates all scroll lag across the website)
    currentScrollY = targetScrollY;

    // ========== READING PROGRESS (Efficient Loop Update) ==========
    if (progressBar && maxScroll > 0) {
        const scrollPercent = (currentScrollY / maxScroll) * 100;
        progressBar.style.width = `${scrollPercent}%`;
    }

    // MOBILE OPTIMIZATION: Stop ALL heavy physics calculations on mobile to prevent lag
    if (windowWidth < 900) {
        animationFrameId = null;
        return;
    }

    // Optimization: Only update scroll-dependent elements if scroll changed
    const isScrolling = Math.abs(currentScrollY - lastScrollY) > 0.1;

    // ========== BACKGROUND PARALLAX ==========
    if (spaceBg && isScrolling) {
        if (spaceBg.classList.contains('long-read-bg')) {
            const parallaxY = currentScrollY * 0.01;
            spaceBg.style.transform = `translate3d(0, -${parallaxY.toFixed(2)}px, 0)`;
        } else {
            const maxParallax = windowHeight * 0.10;
            const parallaxY = Math.min(currentScrollY * 0.02, maxParallax);
            spaceBg.style.transform = `translate3d(0, -${parallaxY.toFixed(2)}px, 0)`;
        }
    }

    // Update sidebar state (Throttled to 150ms to save CPU/Reflows)
    if (isScrolling && (now - lastSidebarUpdate > 150)) {
        updateSidebarActiveState();
        lastSidebarUpdate = now;
    }

    lastScrollY = currentScrollY;

    // ACCESSIBILITY: Disable for users who prefer reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
        if (jupiterEl && isHomePage) jupiterEl.style.display = 'none';
        animationFrameId = null;
        return;
    }

    // ========== JUPITER: HOMEPAGE FULL-SCROLL GLIDE ==========
    // Only runs on Homepage desktop. Non-home pages are docked in corner via CSS.
    if (isHomePage && jupiterEl && windowWidth >= 900) {
        const jupiterProgress = Math.min(Math.max(currentScrollY / maxScroll, 0), 1);
        
        const jupiterX = quadraticBezier(jupiterPath.p0.x, jupiterPath.p1.x, jupiterPath.p2.x, jupiterProgress);
        const jupiterY = quadraticBezier(jupiterPath.p0.y, jupiterPath.p1.y, jupiterPath.p2.y, jupiterProgress);

        // Dynamic scale: starts small (0.75), looms large at center (1.25), shrinks small again at end (0.75)
        const jupiterScale = (0.75 + 0.50 * Math.sin(jupiterProgress * Math.PI)) * sizeFactor;

        // Opacity: gentle cosmic transparency (starts at 0.35, rises to 0.48 at closest flyby, docks at 0.30)
        const jupiterFade = 0.35 - (0.05 * jupiterProgress) + (0.155 * Math.sin(jupiterProgress * Math.PI));

        // Continuous gentle axial rotation
        const jupiterRotation = (now * 0.008) % 360;

        jupiterEl.style.opacity = jupiterFade.toFixed(3);
        jupiterEl.style.transform = `translate3d(${jupiterX.toFixed(2)}px, ${jupiterY.toFixed(2)}px, 0) rotate(${jupiterRotation.toFixed(2)}deg) scale(${jupiterScale.toFixed(2)})`;
    }

    // Engine Loop Control: Keep animating if on homepage with desktop Jupiter (for continuous steady rotation), or while scrolling
    const isIdle = Math.abs(targetScrollY - currentScrollY) < 0.1;

    if (isIdle) {
        currentScrollY = targetScrollY;
    }

    if ((isHomePage && jupiterEl && windowWidth >= 900) || !isIdle) {
        animationFrameId = requestAnimationFrame(updateCinematicPhysics);
    } else {
        animationFrameId = null;
    }
}

// ======== CARD GLOW & LIFT EFFECT (GPU-Accelerated Smooth Hover) ========
function initCardGlow() {
    if (window.matchMedia("(hover: none)").matches) return; // Ignore on touch

    const cards = document.querySelectorAll(CARD_SELECTOR);
    cards.forEach(card => {
        let rect = null;
        let ticking = false;

        card.addEventListener("mouseenter", () => {
            rect = card.getBoundingClientRect();
        });

        card.addEventListener("mousemove", (e) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (!rect) rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    card.style.setProperty("--mouse-x", `${x}px`);
                    card.style.setProperty("--mouse-y", `${y}px`);
                    ticking = false;
                });
                ticking = true;
            }
        });

        card.addEventListener("mouseleave", () => {
            rect = null;
        });
    });
}

// ======== SIDEBAR SCROLL SPY ========
function updateSidebarActiveState() {
    if (!physicsCache.sidebarElements) {
        const sections = document.querySelectorAll('.reading-text h3[id], .reading-text h2[id]');
        const links = document.querySelectorAll('.sidebar-list a');
        physicsCache.sidebarElements = { sections, links };
    }
    
    const { sections, links } = physicsCache.sidebarElements;
    
    if (sections.length === 0) return;

    let currentSectionId = '';

    sections.forEach(section => {
        if (section.getBoundingClientRect().top < 200) { 
            currentSectionId = section.getAttribute('id');
        }
    });

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            link.classList.remove('active-link');
            if (currentSectionId && href === '#' + currentSectionId) {
                link.classList.add('active-link');
            }
        }
    });
}

// ======== MUSEUM DISPLAY INTERACTIVITY ========
function initMuseumDisplay() {
    const museumItems = document.querySelectorAll('.museum-item');
    const stageLabel = document.getElementById('stage-label');
    const stageQuote = document.getElementById('stage-quote');
    const stageContent = document.querySelector('.stage-content');
    const stageLink = document.getElementById('stage-link');

    // Exit if we're not on the homepage with the museum display
    if (!museumItems.length || !stageQuote || !stageContent || !stageLabel || !stageLink) {
        return;
    }

    const contentData = {
        essays: {
            label: "The Prose",
            quote: "\"To truly change the world, we must first change<br>the way we view education. The real test is not<br>in marksheets, but in the human beings it produces.\"",
            link: "essays/",
            color: "#81C784" // Earth Green
        },
        poems: {
            label: "The Verses",
            quote: "\"Our eyes connected; oh, it couldn't be more divine,<br>A smile was returned—can I consider that a sign?<br>But how would I talk to her? Shy am I, and that's just fine,<br>It's easy for a letter to ask someone out to dine.\"",
            link: "poems/",
            color: "#E57373" // Fire Red
        },
        fiction: {
            label: "The Tales",
            quote: "\"You signed off on the body count.<br>Math won’t wash off blood.<br>Don't hide behind patriotism now.\"",
            link: "fiction/",
            color: "#64B5F6" // Water Blue
        }
    };

    let hoverTimeout;

    museumItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            if (window.innerWidth < 900) return; // Don't run on mobile

            // Clear any pending switch to prevent rapid snapping
            clearTimeout(hoverTimeout);

            hoverTimeout = setTimeout(() => {
                const currentCategory = stageContent.dataset.activeCategory;
                const newCategory = item.dataset.category;

                if (currentCategory === newCategory) return; // Don't re-animate for the same item

                museumItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const data = contentData[newCategory];

                if (data) {
                    stageContent.classList.add('stage-fade-out');

                    setTimeout(() => {
                        stageLabel.textContent = data.label;
                        stageLabel.style.color = data.color;
                        stageQuote.innerHTML = data.quote;
                        stageLink.href = data.link;
                        stageContent.dataset.activeCategory = newCategory;
                        stageContent.style.borderColor = `${data.color}55`;
                        stageContent.style.boxShadow = `0 14px 40px rgba(0, 0, 0, 0.75), 0 0 25px ${data.color}25`;
                        stageContent.classList.remove('stage-fade-out');
                    }, 300); // Match CSS transition duration
                }
            }, 50); // 50ms delay to debounce accidental hovers
        });
    });

    // Set initial state
    const initialCategory = 'essays';
    stageContent.dataset.activeCategory = initialCategory;
    const initialItem = document.querySelector(`.museum-item[data-category="${initialCategory}"]`);
    if (initialItem) initialItem.classList.add('active');
    stageLabel.style.color = contentData[initialCategory].color;
    stageContent.style.borderColor = `${contentData[initialCategory].color}55`;
    stageContent.style.boxShadow = `0 14px 40px rgba(0, 0, 0, 0.75), 0 0 25px ${contentData[initialCategory].color}25`;
}

// ======== SUBSCRIBE SCROLL & FOCUS ========
function initSubscribeScroll() {
    const subscribeBtns = document.querySelectorAll('.subscribe-btn, .mobile-subscribe-btn, .sign-in-btn, .mobile-sign-in-btn');
    
    subscribeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 1. Check for Homepage Subscribe Section
            const homeSubscribeSection = document.getElementById('subscribe-engine');
            const homeInput = document.querySelector('#silent-subscribe-form input[name="field_1"]') || document.querySelector('#silent-subscribe-form input[type="email"]');
            
            // 2. Check for Footer (Fallback for other pages)
            const footer = document.getElementById('footer');
            const footerInput = document.querySelector('.footer-subscribe-form input[type="email"]');

            if (homeSubscribeSection && homeInput) {
                // Homepage: Scroll to the dedicated center card
                homeSubscribeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => homeInput.focus({ preventScroll: true }), 500);
            } else if (footer && footerInput) {
                // Other Pages: Scroll to footer
                footer.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => footerInput.focus({ preventScroll: true }), 500);
            }
            
            // Close mobile menu if it's open after clicking subscribe
            const mobileMenu = document.getElementById("mobileMenu");
            if (mobileMenu && mobileMenu.style.display === "flex") {
                mobileMenu.style.display = "none";
            }
        });
    });
}

// ========== GLOBAL INITIALIZATION & MOBILE MENU ==========
document.addEventListener("DOMContentLoaded", () => {
    updateCinematicPhysics(performance.now());
    initCardGlow(); 
    updateSidebarActiveState();
    initReadingFeatures(); // Initialize Reading Time & Share
    initBackToTop(); // Initialize Back to Top button
    initMobileQuickIndex(); // Initialize Mobile Quick Index/Top Companion
    initMuseumDisplay(); // Initialize Museum Display
    initMobileJumpStrip(); // Initialize Mobile Category Jump Strip
    initSubscribeForm(); // Initialize Homepage Subscribe
    initSubscribeScroll(); // Initialize Subscribe Scroll & Focus
    setupArchiveComingSoon(); // Initialize Selective Archive Toggle

    // Global intercept for '#' links to prevent jumping to top
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (anchor && anchor.getAttribute('href') === '#') {
            e.preventDefault();
        }
    });

    const toggle = document.querySelector(".menu-toggle");
    const mobileMenu = document.getElementById("mobileMenu");

    if (toggle && mobileMenu) {
        toggle.addEventListener("click", (e) => {
            e.stopPropagation(); 
            const isFlex = mobileMenu.style.display === "flex";
            mobileMenu.style.display = isFlex ? "none" : "flex";
        });

        document.addEventListener("click", (e) => {
            if (mobileMenu.style.display === "flex" && !mobileMenu.contains(e.target)) {
                mobileMenu.style.display = "none";
            }
        });

        mobileMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mobileMenu.style.display = "none";
            });
        });
    }
});

// ========== CONTENT PROTECTION ==========
// Deters casual highlight-and-copy behavior
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// ======== ARCHIVE COMING SOON TOGGLE ========
function setupArchiveComingSoon() {
    // Only target archives that explicitly need to be hidden
    const archiveSection = document.querySelector('.content-archive.requires-toggle');
    if (!archiveSection) return;

    // 1. Enable Coming Soon Mode (Hides cards via CSS class)
    archiveSection.classList.add('coming-soon-mode');

    // 2. Create UI Elements (Arrow & Message)
    const container = document.createElement('div');
    container.className = 'archive-toggle-container';

    const btn = document.createElement('button');
    btn.className = 'archive-toggle-btn';
    btn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
    btn.setAttribute('aria-label', 'Show Status');

    const msg = document.createElement('div');
    msg.className = 'archive-message';
    msg.innerHTML = '<p>Coming Soon</p>';

    // 3. Assemble and Inject
    container.appendChild(btn);
    container.appendChild(msg);
    archiveSection.appendChild(container);

    // 4. Interaction Logic
    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        msg.classList.toggle('visible');
    });
}

// ======== READING FEATURES (Time & Share) ========
function initReadingFeatures() {
    // 1. Calculate Reading Time
    const articleText = document.querySelector('.reading-text');
    const timeDisplays = document.querySelectorAll('.sidebar-reading-time, .mobile-reading-time');
    
    if (articleText && timeDisplays.length > 0) {
        const text = articleText.innerText;
        const wpm = 200; // Average reading speed
        const words = text.trim().split(/\s+/).length;
        const time = Math.ceil(words / wpm);
        timeDisplays.forEach(display => {
            display.innerHTML = `<i class="fa-regular fa-clock"></i> ${time} min read`;
        });
    }

    // 2. Share Button Logic
    const shareBtn = document.getElementById('sidebar-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const url = window.location.href;
            let success = false;

            // 1. Try Modern API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(url);
                    success = true;
                } catch (err) {
                    // console.log('Clipboard API failed, trying fallback...');
                }
            }

            // 2. Fallback for Mobile/Non-Secure Contexts
            if (!success) {
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = url;
                    textArea.style.position = "fixed"; // Avoid scrolling to bottom
                    textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    success = document.execCommand('copy');
                    document.body.removeChild(textArea);
                } catch (err) {
                    // console.error('Fallback failed', err);
                }
            }

            // 3. Show Feedback
            if (success) {
                const originalHTML = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i class="fa-solid fa-check"></i> Link Copied';
                shareBtn.classList.add('copied');
                setTimeout(() => {
                    shareBtn.innerHTML = originalHTML;
                    shareBtn.classList.remove('copied');
                }, 2000);
            }
        });
    }
}

// ======== BACK TO TOP BUTTON ========
function initBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    const footer = document.querySelector('footer');

    if (!backToTopBtn || !footer) return; // Only run on pages where both elements exist

    const buttonBottomMargin = 32; // 2rem margin

    window.addEventListener('scroll', () => {
        const footerTop = footer.offsetTop;
        const scrollBottom = window.scrollY + window.innerHeight;

        // Show/hide button
        if (window.scrollY > window.innerHeight / 2) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }

        // Adjust position to avoid footer overlap
        if (scrollBottom > footerTop) {
            backToTopBtn.style.bottom = `${scrollBottom - footerTop + buttonBottomMargin}px`;
        } else {
            backToTopBtn.style.bottom = `${buttonBottomMargin}px`;
        }
    }, { passive: true });
    
    backToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ======== MOBILE QUICK INDEX COMPANION ========
function initMobileQuickIndex() {
    const sidebar = document.querySelector('.reading-sidebar');
    const readingMain = document.querySelector('.reading-main');
    if (!sidebar || !readingMain) return;

    let quickBtn = document.getElementById('mobileQuickIndexBtn');
    if (!quickBtn) {
        quickBtn = document.createElement('button');
        quickBtn.id = 'mobileQuickIndexBtn';
        quickBtn.className = 'mobile-quick-index-btn';
        quickBtn.setAttribute('aria-label', 'Jump to Index');
        quickBtn.innerHTML = '<i class="fa-solid fa-list-ul"></i> <span class="btn-text">Index</span>';
        quickBtn.style.opacity = '0';
        quickBtn.style.pointerEvents = 'none';
        quickBtn.style.transform = 'translateY(15px)';
        document.body.appendChild(quickBtn);
    }

    const updateVisibility = () => {
        if (window.innerWidth >= 900) {
            quickBtn.style.opacity = '0';
            quickBtn.style.pointerEvents = 'none';
            return;
        }

        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const sidebarRect = sidebar.getBoundingClientRect();
        
        // Show only while actively reading the body text (after passing the hero, and before reaching the sidebar)
        const isPastHero = scrollY > 220;
        const isBeforeSidebar = sidebarRect.top > window.innerHeight * 0.85;

        if (isPastHero && isBeforeSidebar) {
            quickBtn.style.opacity = '1';
            quickBtn.style.pointerEvents = 'auto';
            quickBtn.style.transform = 'translateY(0)';
        } else {
            // Fade out cleanly at the bottom so there is NEVER a duplicate "Top" button next to back-to-top
            quickBtn.style.opacity = '0';
            quickBtn.style.pointerEvents = 'none';
            quickBtn.style.transform = 'translateY(15px)';
        }
    };

    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility, { passive: true });
    updateVisibility();

    quickBtn.addEventListener('click', () => {
        sidebar.scrollIntoView({ behavior: 'smooth' });
    });
}

// ======== MOBILE EDITORIAL JUMP STRIP ========
function initMobileJumpStrip() {
    const jumpPills = document.querySelectorAll('.mobile-jump-pill');
    if (!jumpPills.length) return;

    jumpPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            const targetId = pill.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (!targetEl) return;
            e.preventDefault();
            const ribbon = document.querySelector('.ribbon');
            const ribbonH = ribbon ? ribbon.offsetHeight : 56;
            const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - ribbonH - 12;
            window.scrollTo({
                top: targetTop,
                behavior: 'smooth'
            });
        });
    });
}

// ======== HOMEPAGE SUBSCRIBE ENGINE ========
function initSubscribeForm() {
    const forms = document.querySelectorAll('form[target="hidden_iframe"]');
    
    forms.forEach(form => {
        let interactionTime = 0;
        
        const markInteraction = (e) => {
            // Hardware Check: If the interaction was generated by a script, ignore it
            if (e && e.isTrusted === false) return;

            if (interactionTime === 0) {
                interactionTime = Date.now();
                // Inject the action attribute so the form knows where to submit
                if (!form.getAttribute('action') && form.dataset.action) {
                    form.setAttribute('action', form.dataset.action);
                }
            }
        };

        // Detect real human interactions (mouse movement, tapping, typing)
        form.addEventListener('focusin', markInteraction);
        form.addEventListener('input', markInteraction);
        form.addEventListener('mouseenter', markInteraction);
        form.addEventListener('touchstart', markInteraction, {passive: true});

        form.addEventListener('submit', (e) => {
            const botTrap = form.querySelector('input[name="b_name"]');
            
            // 1. Honeypot check (field is filled)
            // 2. Interaction check (never interacted)
            // 3. Hardware check (ensures the submission was triggered by physical human hardware)
            const isBot = (botTrap && botTrap.value !== "") || (interactionTime === 0) || (e.isTrusted === false);

            if (isBot) {
                e.preventDefault(); // Stop submission to EmailOctopus
                // We DO NOT return here. We let the UI pretend it succeeded to fool the bot!
            } else {
                // Safety check for human
                if (!form.getAttribute('action') && form.dataset.action) {
                    form.setAttribute('action', form.dataset.action);
                }
            }
            
            // 1. Button Text Swap (Premium Feel)
            const btn = form.querySelector('button[type="submit"]');
            if (btn) btn.innerHTML = "Signing In...";

            // 2. Cinematic Fade Out (Delayed)
            setTimeout(() => {
                form.style.transition = 'opacity 0.4s ease';
                form.style.opacity = '0';

                // 3. Wait for fade out, then swap
                setTimeout(() => {
                    form.style.display = 'none';
                    form.reset(); // Clear the email input field for UX
                    
                    const successMessage = form.nextElementSibling;
                    if (successMessage) {
                        const isFooter = form.classList.contains('footer-subscribe-form');
                        successMessage.style.display = isFooter ? 'block' : 'flex';
                        
                        // Prepare for Fade In
                        successMessage.style.opacity = '0';
                        successMessage.style.transition = 'opacity 0.8s ease';
                        successMessage.style.position = 'relative';
                        successMessage.style.transform = 'scale(1)';
                        
                        // Force Reflow
                        void successMessage.offsetWidth;
                        
                        // Execute Fade In
                        successMessage.style.opacity = '1';
                    }
                }, 400);
            }, 1000);
        });
    });
}

// =========================================
// ACCESSIBILITY & VIEWPORT ZOOM CONTROL
// Prevents accidental trackpad/mouse-wheel zoom distortion while keeping Ctrl + '+' / '-' keyboard zoom
// =========================================
window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});
