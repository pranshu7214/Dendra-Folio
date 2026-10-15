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

// Track scroll position (Passive flag makes native scrolling much faster)
window.addEventListener("scroll", () => {
    targetScrollY = window.scrollY;

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
    if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(updateCinematicPhysics);
    }
});

function updateCinematicPhysics(now) {
    now = now || performance.now();

    // 1. Initialize Elements Cache (Runs only once)
    if (!physicsCache.elements) {
        const jupiterEl = document.querySelector(".jupiter");
        const saturnEl = document.querySelector(".saturn");
        const quoteSection = document.getElementById("quote-section") || document.querySelector(".page-intro");
        const librarySection = document.getElementById("library-section") || document.querySelector(".content-grid");
        const showcaseSection = document.getElementById("showcase-gallery");
        const spaceBg = document.querySelector(".space-bg");
        const cards = document.querySelectorAll(CARD_SELECTOR);
        const progressBar = document.getElementById('reading-progress');

        if (jupiterEl) {
            jupiterEl.style.transition = "opacity 1.5s ease-out";
            requestAnimationFrame(() => jupiterEl.style.opacity = "0.4");
        }
        physicsCache.elements = { jupiterEl, saturnEl, quoteSection, librarySection, showcaseSection, spaceBg, cards, progressBar };
    }
    const { jupiterEl, saturnEl, quoteSection, librarySection, showcaseSection, spaceBg, cards, progressBar } = physicsCache.elements;

    // 2. Initialize Metrics Cache (Runs on load & resize)
    if (!physicsCache.metrics) {
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        const quoteTop = quoteSection ? quoteSection.offsetTop : windowHeight * 1.2;
        const libraryBottom = librarySection ? (librarySection.offsetTop + librarySection.offsetHeight) : (windowHeight * 2.5);
        const showcaseTop = showcaseSection ? showcaseSection.offsetTop : windowHeight * 3;
        const maxScroll = Math.max(document.documentElement.scrollHeight - windowHeight, 1);
        
        // Pre-calculate celestial paths to avoid heavy math every single frame
        // JUPITER: THE ORBITAL GLIDE. Stays comfortably within viewport.
        const jupiterPath = {
            p0: { x: -225, y: windowHeight * 0.15 }, // Half visible start (450px / 2)
            p1: { x: windowWidth * 0.5, y: windowHeight * 0.8 }, // Deeper curve to restore gravity feel
            p2: { x: windowWidth + 50, y: windowHeight * 0.1 } // Lands top-right
        };

        const saturnPath = {
            // THE GRAND ARCH: Rises from bottom-right, arcs high over content, sets bottom-left
            p0: { x: windowWidth + 200, y: windowHeight * 0.8 }, 
            p1: { x: windowWidth * 0.5, y: -windowHeight * 0.3 }, // Peak high above screen
            p2: { x: -200, y: windowHeight * 0.36 } 
        };

        // Pre-calculate card positions for visibility check (Optimization)
        const cardMetrics = [];
        if (cards) {
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                cardMetrics.push({
                    el: card,
                    top: rect.top + scrollTop,
                    height: rect.height
                });
            });
        }

        physicsCache.metrics = { windowHeight, windowWidth, quoteTop, libraryBottom, showcaseTop, maxScroll, jupiterPath, saturnPath, cardMetrics };
    }
    const { windowHeight, windowWidth, quoteTop, libraryBottom, showcaseTop, maxScroll, jupiterPath, saturnPath, cardMetrics } = physicsCache.metrics;
    
    // Interpolate scroll value (Smooth feel for desktop, instant for mobile)
    if (windowWidth < 900) {
        currentScrollY = targetScrollY;
    } else {
        // Increased lerp from 0.1 to 0.45 to remove touchpad input delay
        currentScrollY = lerp(currentScrollY, targetScrollY, 0.45); 
    }

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
    const isScrolling = Math.abs(currentScrollY - lastScrollY) > 0.01;

    // ========== BACKGROUND PARALLAX ==========
    if (spaceBg && isScrolling) {
        if (spaceBg.classList.contains('long-read-bg')) {
            // Slower speed for long reads, no clamp needed due to larger CSS buffer
            const parallaxY = currentScrollY * 0.01;
            spaceBg.style.transform = `translate3d(0, -${parallaxY.toFixed(2)}px, 0)`;
        } else {
            // Original logic with clamp for shorter pages
            const maxParallax = windowHeight * 0.10;
            const parallaxY = Math.min(currentScrollY * 0.02, maxParallax);
            spaceBg.style.transform = `translate3d(0, -${parallaxY.toFixed(2)}px, 0)`;
        }
    }

    // ========== CARDS: VERTICAL PARALLAX ==========
    if (cardMetrics && isScrolling) {
        const viewTop = currentScrollY;
        const viewBottom = currentScrollY + windowHeight;
        const buffer = 200; // Render slightly outside viewport

        cardMetrics.forEach((metric, index) => {
            // Only animate if visible in viewport
            if (metric.top < viewBottom + buffer && metric.top + metric.height > viewTop - buffer) {
                const card = metric.el;
                if (!card.isHovered) {
                    // Staggered movement based on index creates incredible 3D depth
                    const cardParallax = (currentScrollY * 0.02);
                    card.style.transform = `translate3d(0, -${cardParallax.toFixed(2)}px, 0)`;
                    card.dataset.currentParallax = -cardParallax; // Store for tilt handoff
                }
            }
        });
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
        if (jupiterEl) jupiterEl.style.display = 'none';
        if (saturnEl) saturnEl.style.display = 'none';
        animationFrameId = null;
        return;
    }

    // Only run planet math if the elements exist
    if (jupiterEl && saturnEl) {
        // ========== JUPITER: SLINGSHOT EXIT ==========
        const jupiterZoneEnd = showcaseTop || quoteTop * 3.5; // Extended to reach showcase gallery
        const jupiterProgress = Math.min(Math.max(currentScrollY / jupiterZoneEnd, 0), 1);
        
        const jupiterX = quadraticBezier(jupiterPath.p0.x, jupiterPath.p1.x, jupiterPath.p2.x, jupiterProgress);
        const jupiterY = quadraticBezier(jupiterPath.p0.y, jupiterPath.p1.y, jupiterPath.p2.y, jupiterProgress);
    
        const jupiterFade = Math.min(0.4 + jupiterProgress * 2, 1); // More solid start (0.4 base)
        const jupiterRotation = (now * 0.008) % 360; // Slightly faster rotation
        // CONTROLLED SIZE: Starts at 0.9, peaks, then shrinks to 0.7 at the end
        const jupiterScale = 0.9 + 0.5 * Math.sin(jupiterProgress * Math.PI) - (jupiterProgress * 0.35); 
        jupiterEl.style.opacity = (jupiterFade * 0.5).toFixed(2); // Slightly more solid max opacity
        jupiterEl.style.transform = `translate3d(${jupiterX.toFixed(2)}px, ${jupiterY.toFixed(2)}px, 0) rotate(${jupiterRotation.toFixed(2)}deg) scale(${jupiterScale.toFixed(2)})`;
    
        // ========== SATURN: CURVED PATH ==========
        const saturnZoneStart = jupiterZoneEnd * 0.81; // Delayed to prevent overlap
        const saturnZoneEnd = maxScroll;
        const saturnZoneHeight = Math.max(saturnZoneEnd - saturnZoneStart, 1);
    
        let saturnProgress = 0;
        if (currentScrollY >= saturnZoneStart) {
            saturnProgress = Math.min(Math.max((currentScrollY - saturnZoneStart) / saturnZoneHeight, 0), 1);
        }
    
        const saturnX = quadraticBezier(saturnPath.p0.x, saturnPath.p1.x, saturnPath.p2.x, saturnProgress);
        const saturnY = quadraticBezier(saturnPath.p0.y, saturnPath.p1.y, saturnPath.p2.y, saturnProgress);
    
        const saturnFade = Math.min(saturnProgress * 4, 1); 
        const saturnRotation = -(now * 0.01) % 360; // Faster rotation for dynamism
        // FLYBY EFFECT: Starts distant (0.9), grows massive overhead (1.4), fades away
        const saturnScale = 0.9 + 0.5 * Math.sin(saturnProgress * Math.PI); 
    
        saturnEl.style.opacity = (saturnFade * 0.5).toFixed(2); // Slightly clearer than before
        saturnEl.style.transform = `translate3d(${saturnX.toFixed(2)}px, ${saturnY.toFixed(2)}px, 0) rotate(${saturnRotation.toFixed(2)}deg) scale(${saturnScale.toFixed(2)})`;
    }

    // Engine Loop Control: Stop the loop when idle to save CPU, unless planets need to rotate.
    const isIdle = Math.abs(targetScrollY - currentScrollY) < 0.1;

    if (isIdle) {
        // Snap to final position
        currentScrollY = targetScrollY;
    }

    // Keep animating if planets are visible on desktop, or if we are still scrolling.
    if ((jupiterEl && saturnEl && windowWidth >= 900) || !isIdle) {
        animationFrameId = requestAnimationFrame(updateCinematicPhysics);
    } else {
        animationFrameId = null;
    }
}

// ======== CARD GLOW & LIFT EFFECT (No Tilt to prevent blur) ========
function initCardGlow() {
    if (window.matchMedia("(hover: none)").matches) return; // Ignore on touch

    const cards = document.querySelectorAll(CARD_SELECTOR);
    cards.forEach(card => {
        let rect;
        let ticking = false; // Throttling flag for performance

        card.addEventListener("mouseenter", () => {
            card.isHovered = true;
            rect = card.getBoundingClientRect();
            // Enable smooth transition for the hover lift
            card.style.transition = "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.7s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.6s ease, border-color 0.6s ease, background 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)";
            
            const currentParallax = parseFloat(card.dataset.currentParallax || 0);
            card.style.transform = `translate3d(0, ${currentParallax - 5}px, 0)`;
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
            card.isHovered = false;
            // Keep transition for smooth return
            const currentParallax = parseFloat(card.dataset.currentParallax || 0);
            card.style.transform = `translate3d(0, ${currentParallax}px, 0)`;

            // Remove transform transition after tilt reset so parallax isn't laggy
            if (card.resetTimeout) clearTimeout(card.resetTimeout);
            card.resetTimeout = setTimeout(() => {
                if (!card.isHovered) {
                    card.style.transition = "transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.7s, border-color 0.7s, background 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)";
                }
            }, 600);
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
                        stageContent.classList.remove('stage-fade-out');
                    }, 300); // Match CSS transition duration
                }
            }, 50); // 50ms delay to debounce accidental hovers
        });
    });

    // Set initial state
    const initialCategory = 'essays';
    stageContent.dataset.activeCategory = initialCategory;
    document.querySelector(`.museum-item[data-category="${initialCategory}"]`).classList.add('active');
    stageLabel.style.color = contentData[initialCategory].color;
}

// ======== SUBSCRIBE SCROLL & FOCUS ========
function initSubscribeScroll() {
    const subscribeBtns = document.querySelectorAll('.subscribe-btn, .mobile-subscribe-btn');
    
    subscribeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 1. Check for Homepage Subscribe Section
            const homeSubscribeSection = document.getElementById('subscribe-engine');
            const homeInput = document.querySelector('#silent-subscribe-form input[type="email"]');
            
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
    initMuseumDisplay(); // Initialize Museum Display
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
            if (btn) btn.innerHTML = "Reserving...";

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