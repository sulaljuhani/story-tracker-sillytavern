/**
 * Mobile UI Module
 * Handles mobile-specific UI functionality: FAB dragging, tabs, keyboard handling
 */

import { extensionSettings } from '../../core/state.js';
import { saveSettings } from '../../core/persistence.js';
import { closeMobilePanelWithAnimation, updateCollapseToggleIcon } from './layout.js';
import { setupDesktopTabs, removeDesktopTabs } from './desktop.js';

/**
 * Sets up the mobile toggle button (FAB) with drag functionality.
 * Handles touch/mouse events for positioning and panel toggling.
 */
export function setupMobileToggle() {
    const $mobileToggle = $('#story-tracker-mobile-toggle');
    const $panel = $('#story-tracker-panel');
    const $overlay = $('<div class="story-tracker-mobile-overlay"></div>');
    const $document = $(document);

    // DIAGNOSTIC: Check if elements exist and log setup state
    console.log('[Story Tracker Mobile] ========================================');
    console.log('[Story Tracker Mobile] setupMobileToggle called');
    console.log('[Story Tracker Mobile] Button exists:', $mobileToggle.length > 0, 'jQuery object:', $mobileToggle);
    console.log('[Story Tracker Mobile] Panel exists:', $panel.length > 0);
    console.log('[Story Tracker Mobile] Window width:', window.innerWidth);
    console.log('[Story Tracker Mobile] Is mobile viewport (<=1000):', window.innerWidth <= 1000);
    console.log('[Story Tracker Mobile] ========================================');

    if ($mobileToggle.length === 0) {
        console.error('[Story Tracker Mobile] ERROR: Mobile toggle button not found in DOM!');
        console.error('[Story Tracker Mobile] Cannot attach event handlers - button does not exist');
        return; // Exit early if button doesn't exist
    }

    // Load and apply saved FAB position
    if (extensionSettings.mobileFabPosition) {
        const pos = extensionSettings.mobileFabPosition;
        console.log('[Story Tracker Mobile] Loading saved FAB position:', pos);

        // Apply saved position
        if (pos.top) $mobileToggle.css('top', pos.top);
        if (pos.right) $mobileToggle.css('right', pos.right);
        if (pos.bottom) $mobileToggle.css('bottom', pos.bottom);
        if (pos.left) $mobileToggle.css('left', pos.left);

        // Constrain to viewport after position is applied
        requestAnimationFrame(() => constrainFabToViewport());
    }

    // Touch/drag state
    let isDragging = false;
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let buttonStartX = 0;
    let buttonStartY = 0;
    const LONG_PRESS_DURATION = 200; // ms to hold before enabling drag
    const MOVE_THRESHOLD = 10; // px to move before enabling drag
    let rafId = null; // RequestAnimationFrame ID for smooth updates
    let pendingX = null;
    let pendingY = null;

    // Update position using requestAnimationFrame for smooth rendering
    function updateFabPosition() {
        if (pendingX !== null && pendingY !== null) {
            $mobileToggle.css({
                left: pendingX + 'px',
                top: pendingY + 'px',
                right: 'auto',
                bottom: 'auto'
            });
            pendingX = null;
            pendingY = null;
        }
        rafId = null;
    }

    // Touch start - begin tracking
    $mobileToggle.off('touchstart').on('touchstart', function(e) {
        const touch = e.originalEvent.touches[0];

        touchStartTime = Date.now();
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;

        const offset = $mobileToggle.offset();
        buttonStartX = offset.left;
        buttonStartY = offset.top;

        isDragging = false;
    });

    // Touch move - check if should start dragging
    $mobileToggle.off('touchmove').on('touchmove', function(e) {
        const touch = e.originalEvent.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const timeSinceStart = Date.now() - touchStartTime;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Start dragging if held long enough OR moved far enough
        if (!isDragging && (timeSinceStart > LONG_PRESS_DURATION || distance > MOVE_THRESHOLD)) {
            isDragging = true;
            $mobileToggle.addClass('dragging'); // Disable transitions while dragging
        }

        if (isDragging) {
            e.preventDefault(); // Prevent scrolling while dragging

            // Calculate new position
            let newX = buttonStartX + deltaX;
            let newY = buttonStartY + deltaY;

            // Get button dimensions
            const buttonWidth = $mobileToggle.outerWidth();
            const buttonHeight = $mobileToggle.outerHeight();

            // Constrain to viewport with 10px padding
            const minX = 10;
            const maxX = window.innerWidth - buttonWidth - 10;
            const minY = 10;
            const maxY = window.innerHeight - buttonHeight - 10;

            newX = Math.max(minX, Math.min(maxX, newX));
            newY = Math.max(minY, Math.min(maxY, newY));

            // Store pending position and request animation frame for smooth update
            pendingX = newX;
            pendingY = newY;
            if (!rafId) {
                rafId = requestAnimationFrame(updateFabPosition);
            }
        }
    });

    // Mouse drag support for desktop
    let mouseDown = false;

    $mobileToggle.off('mousedown').on('mousedown', function(e) {
        // Prevent default to avoid text selection
        e.preventDefault();

        touchStartTime = Date.now();
        touchStartX = e.clientX;
        touchStartY = e.clientY;

        const offset = $mobileToggle.offset();
        buttonStartX = offset.left;
        buttonStartY = offset.top;

        isDragging = false;
        mouseDown = true;
    });

    // Mouse move - only track if mouse is down
    $document.off('mousemove.storyTrackerMobile mouseup.storyTrackerMobile');

    $document.on('mousemove.storyTrackerMobile', function(e) {
        if (!mouseDown) return;

        const deltaX = e.clientX - touchStartX;
        const deltaY = e.clientY - touchStartY;
        const timeSinceStart = Date.now() - touchStartTime;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Start dragging if held long enough OR moved far enough
        if (!isDragging && (timeSinceStart > LONG_PRESS_DURATION || distance > MOVE_THRESHOLD)) {
            isDragging = true;
            $mobileToggle.addClass('dragging'); // Disable transitions while dragging
        }

        if (isDragging) {
            e.preventDefault();

            // Calculate new position
            let newX = buttonStartX + deltaX;
            let newY = buttonStartY + deltaY;

            // Get button dimensions
            const buttonWidth = $mobileToggle.outerWidth();
            const buttonHeight = $mobileToggle.outerHeight();

            // Constrain to viewport with 10px padding
            const minX = 10;
            const maxX = window.innerWidth - buttonWidth - 10;
            const minY = 10;
            const maxY = window.innerHeight - buttonHeight - 10;

            newX = Math.max(minX, Math.min(maxX, newX));
            newY = Math.max(minY, Math.min(maxY, newY));

            // Store pending position and request animation frame for smooth update
            pendingX = newX;
            pendingY = newY;
            if (!rafId) {
                rafId = requestAnimationFrame(updateFabPosition);
            }
        }
    });

    // Mouse up - save position or let click handler toggle
    $document.on('mouseup.storyTrackerMobile', function(e) {
        if (!mouseDown) return;

        mouseDown = false;

        if (isDragging) {
            // Was dragging - save new position
            const offset = $mobileToggle.offset();
            const newPosition = {
                left: offset.left + 'px',
                top: offset.top + 'px'
            };

            extensionSettings.mobileFabPosition = newPosition;
            saveSettings();

            console.log('[Story Tracker Mobile] Saved new FAB position (mouse):', newPosition);

            // Constrain to viewport bounds (now that position is saved)
            setTimeout(() => constrainFabToViewport(), 10);

            // Re-enable transitions with smooth animation
            setTimeout(() => {
                $mobileToggle.removeClass('dragging');
            }, 50);

            isDragging = false;

            // Prevent click from firing after drag
            e.preventDefault();
            e.stopPropagation();

            // Add flag to prevent click handler from firing
            $mobileToggle.data('just-dragged', true);
            setTimeout(() => {
                $mobileToggle.data('just-dragged', false);
            }, 100);
        }
        // If not dragging, let the click handler toggle the panel
    });

    // Touch end - save position or toggle panel
    $mobileToggle.off('touchend').on('touchend', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isDragging) {
            // Was dragging - save new position
            const offset = $mobileToggle.offset();
            const newPosition = {
                left: offset.left + 'px',
                top: offset.top + 'px'
            };

            extensionSettings.mobileFabPosition = newPosition;
            saveSettings();

            console.log('[Story Tracker Mobile] Saved new FAB position:', newPosition);

            // Constrain to viewport bounds (now that position is saved)
            setTimeout(() => constrainFabToViewport(), 10);

            // Re-enable transitions with smooth animation
            setTimeout(() => {
                $mobileToggle.removeClass('dragging');
            }, 50);

            isDragging = false;
        } else {
            // Was a tap - toggle panel
            console.log('[Story Tracker Mobile] Quick tap detected - toggling panel');

            if ($panel.hasClass('story-tracker-mobile-open')) {
                // Close panel with animation
                closeMobilePanelWithAnimation();
                updateCollapseToggleIcon();
            } else {
                // Open panel
                $panel.addClass('story-tracker-mobile-open');
                $('body').append($overlay);
                $mobileToggle.addClass('active');
                updateCollapseToggleIcon();

                // Close when clicking overlay
                $overlay.off('click').on('click', function() {
                    closeMobilePanelWithAnimation();
                    updateCollapseToggleIcon();
                });
            }

            $mobileToggle.data('just-tapped', true);
            setTimeout(() => {
                $mobileToggle.removeData('just-tapped');
            }, 400);
        }
    });

    // Click handler - works on both mobile and desktop
    $mobileToggle.on('click', function(e) {
        // Skip if we just finished dragging
        if ($mobileToggle.data('just-dragged') || $mobileToggle.data('just-tapped')) {
            const reason = $mobileToggle.data('just-dragged') ? 'drag gesture' : 'touch tap';
            console.log('[Story Tracker Mobile] Click blocked - ' + reason);
            e.preventDefault();
            e.stopPropagation();
            $mobileToggle.removeData('just-tapped');
            return;
        }

        console.log('[Story Tracker Mobile] >>> CLICK EVENT FIRED <<<', {
            windowWidth: window.innerWidth,
            isMobileViewport: window.innerWidth <= 1000,
            panelOpen: $panel.hasClass('story-tracker-mobile-open')
        });

        // Work on both mobile and desktop (removed viewport check)
        if ($panel.hasClass('story-tracker-mobile-open')) {
            console.log('[Story Tracker Mobile] Click: Closing panel');
            closeMobilePanelWithAnimation();
            updateCollapseToggleIcon();
        } else {
            console.log('[Story Tracker Mobile] Click: Opening panel');
            $panel.addClass('story-tracker-mobile-open');
            $('body').append($overlay);
            $mobileToggle.addClass('active');
            updateCollapseToggleIcon();

            $overlay.off('click').on('click', function() {
                console.log('[Story Tracker Mobile] Overlay clicked - closing panel');
                closeMobilePanelWithAnimation();
                updateCollapseToggleIcon();
            });
        }
    });

    // Handle viewport resize to manage desktop/mobile transitions
    let wasMobile = window.innerWidth <= 1000;
    let resizeTimer;

    $(window).on('resize', function() {
        clearTimeout(resizeTimer);

        const isMobile = window.innerWidth <= 1000;
        const $panel = $('#story-tracker-panel');
        const $mobileToggle = $('#story-tracker-mobile-toggle');

        // Transitioning from desktop to mobile - handle immediately for smooth transition
        if (!wasMobile && isMobile) {
            console.log('[Story Tracker Mobile] Transitioning desktop -> mobile');

            // Remove desktop tabs first
            removeDesktopTabs();

            // Remove desktop positioning classes
            $panel.removeClass('story-tracker-position-right story-tracker-position-left story-tracker-position-top');

            // Clear collapsed state - mobile doesn't use collapse
            $panel.removeClass('story-tracker-collapsed');

            // Close panel on mobile with animation
            closeMobilePanelWithAnimation();

            // Clear any inline styles that might be overriding CSS
            $panel.attr('style', '');

            console.log('[Story Tracker Mobile] After cleanup:', {
                panelClasses: $panel.attr('class'),
                inlineStyles: $panel.attr('style'),
                panelPosition: {
                    top: $panel.css('top'),
                    bottom: $panel.css('bottom'),
                    transform: $panel.css('transform'),
                    visibility: $panel.css('visibility')
                }
            });

            // Set up mobile tabs IMMEDIATELY (no debounce delay)
            setupMobileTabs();

            // Update icon for mobile state
            updateCollapseToggleIcon();

            wasMobile = isMobile;
            return;
        }

        // For mobile to desktop transition, use debounce
        resizeTimer = setTimeout(function() {
            const isMobile = window.innerWidth <= 1000;

            // Transitioning from mobile to desktop
            if (wasMobile && !isMobile) {
                // Disable transitions to prevent left→right slide animation
                $panel.css('transition', 'none');

                $panel.removeClass('story-tracker-mobile-open story-tracker-mobile-closing');
                $mobileToggle.removeClass('active');
                $('.story-tracker-mobile-overlay').remove();

                // Restore desktop positioning class
                const position = extensionSettings.panelPosition || 'right';
                $panel.addClass('story-tracker-position-' + position);

                // Remove mobile tabs structure
                removeMobileTabs();

                // Setup desktop tabs
                setupDesktopTabs();

                // Force reflow to apply position instantly
                $panel[0].offsetHeight;

                // Re-enable transitions after positioned
                setTimeout(function() {
                    $panel.css('transition', '');
                }, 50);
            }

            wasMobile = isMobile;

            // Constrain FAB to viewport after resize (only if user has positioned it)
            constrainFabToViewport();
        }, 150); // Debounce only for mobile→desktop
    });

    // Initialize mobile tabs if starting on mobile
    const isMobile = window.innerWidth <= 1000;
    if (isMobile) {
        const $panel = $('#story-tracker-panel');
        // Clear any inline styles
        $panel.attr('style', '');

        console.log('[Story Tracker Mobile] Initial load on mobile viewport:', {
            panelClasses: $panel.attr('class'),
            inlineStyles: $panel.attr('style'),
            panelPosition: {
                top: $panel.css('top'),
                bottom: $panel.css('top'),
                transform: $panel.css('transform'),
                visibility: $panel.css('visibility')
            }
        });
        setupMobileTabs();
        // Set initial icon for mobile
        updateCollapseToggleIcon();
    }
}

/**
 * Constrains the mobile FAB button to viewport bounds with top-bar awareness.
 * Only runs when button is in user-controlled state (mobileFabPosition exists).
 * Ensures button never goes behind the top bar or outside viewport edges.
 */
export function constrainFabToViewport() {
    // Only constrain if user has set a custom position
    if (!extensionSettings.mobileFabPosition) {
        console.log('[Story Tracker Mobile] Skipping viewport constraint - using CSS defaults');
        return;
    }

    const $mobileToggle = $('#story-tracker-mobile-toggle');
    if ($mobileToggle.length === 0) return;

    // Skip if button is not visible
    if (!$mobileToggle.is(':visible')) {
        console.log('[Story Tracker Mobile] Skipping viewport constraint - button not visible');
        return;
    }

    // Get current position
    const offset = $mobileToggle.offset();
    if (!offset) return;

    let currentX = offset.left;
    let currentY = offset.top;

    const buttonWidth = $mobileToggle.outerWidth();
    const buttonHeight = $mobileToggle.outerHeight();

    // Get top bar height from CSS variable (fallback to 50px if not set)
    const topBarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topBarBlockSize')) || 50;

    // Calculate viewport bounds with padding
    // Use top bar height + extra padding for top bound
    const minX = 10;
    const maxX = window.innerWidth - buttonWidth - 10;
    const minY = topBarHeight + 60; // Top bar + extra space for visibility
    const maxY = window.innerHeight - buttonHeight - 10;

    // Constrain to bounds
    let newX = Math.max(minX, Math.min(maxX, currentX));
    let newY = Math.max(minY, Math.min(maxY, currentY));

    // Only update if position changed
    if (newX !== currentX || newY !== currentY) {
        console.log('[Story Tracker Mobile] Constraining FAB to viewport:', {
            old: { x: currentX, y: currentY },
            new: { x: newX, y: newY },
            viewport: { width: window.innerWidth, height: window.innerHeight },
            topBarHeight
        });

        // Apply new position
        $mobileToggle.css({
            left: newX + 'px',
            top: newY + 'px',
            right: 'auto',
            bottom: 'auto'
        });

        // Save corrected position
        extensionSettings.mobileFabPosition = {
            left: newX + 'px',
            top: newY + 'px'
        };
        saveSettings();
    }
}

/**
 * Sets up mobile tab navigation for organizing content.
 * Only runs on mobile viewports (<=1000px).
 */
export function setupMobileTabs() {
    const isMobile = window.innerWidth <= 1000;
    if (!isMobile) return;

    // Check if tabs already exist
    if ($('.story-tracker-mobile-tabs').length > 0) return;

    const $panel = $('#story-tracker-panel');
    const $contentBox = $panel.find('.story-tracker-content-box');

    // Get existing sections
    const $userStats = $('#story-tracker-user-stats');
    const $infoBox = $('#story-tracker-info-box');
    const $thoughts = $('#story-tracker-thoughts');
    const $inventory = $('#story-tracker-inventory');

    // If no sections exist, nothing to organize
    if ($userStats.length === 0 && $infoBox.length === 0 && $thoughts.length === 0 && $inventory.length === 0) {
        return;
    }

    // Create tab navigation (3 tabs for mobile)
    const tabs = [];
    const hasStats = $userStats.length > 0;
    const hasInfo = $infoBox.length > 0 || $thoughts.length > 0;
    const hasInventory = $inventory.length > 0;

    // Tab 1: Stats (User Stats only)
    if (hasStats) {
        tabs.push('<button class="story-tracker-mobile-tab active" data-tab="stats"><i class="fa-solid fa-chart-bar"></i><span>Stats</span></button>');
    }
    // Tab 2: Info (Info Box + Character Thoughts)
    if (hasInfo) {
        tabs.push('<button class="story-tracker-mobile-tab ' + (tabs.length === 0 ? 'active' : '') + '" data-tab="info"><i class="fa-solid fa-book"></i><span>Info</span></button>');
    }
    // Tab 3: Inventory
    if (hasInventory) {
        tabs.push('<button class="story-tracker-mobile-tab ' + (tabs.length === 0 ? 'active' : '') + '" data-tab="inventory"><i class="fa-solid fa-box"></i><span>Inventory</span></button>');
    }

    const $tabNav = $('<div class="story-tracker-mobile-tabs">' + tabs.join('') + '</div>');

    // Determine which tab should be active
    let firstTab = '';
    if (hasStats) firstTab = 'stats';
    else if (hasInfo) firstTab = 'info';
    else if (hasInventory) firstTab = 'inventory';

    // Create tab content wrappers
    const $statsTab = $('<div class="story-tracker-mobile-tab-content ' + (firstTab === 'stats' ? 'active' : '') + '" data-tab-content="stats"></div>');
    const $infoTab = $('<div class="story-tracker-mobile-tab-content ' + (firstTab === 'info' ? 'active' : '') + '" data-tab-content="info"></div>');
    const $inventoryTab = $('<div class="story-tracker-mobile-tab-content ' + (firstTab === 'inventory' ? 'active' : '') + '" data-tab-content="inventory"></div>');

    // Move sections into their respective tabs (detach to preserve event handlers)
    // Stats tab: User Stats only
    if ($userStats.length > 0) {
        $statsTab.append($userStats.detach());
        $userStats.show();
    }

    // Info tab: Info Box + Character Thoughts
    if ($infoBox.length > 0) {
        $infoTab.append($infoBox.detach());
        $infoBox.show();
    }
    if ($thoughts.length > 0) {
        $infoTab.append($thoughts.detach());
        $thoughts.show();
    }

    // Inventory tab: Inventory only
    if ($inventory.length > 0) {
        $inventoryTab.append($inventory.detach());
        $inventory.show();
    }

    // Hide dividers on mobile
    $('.story-tracker-divider').hide();

    // Build mobile tab structure
    const $mobileContainer = $('<div class="story-tracker-mobile-container"></div>');
    $mobileContainer.append($tabNav);

    // Only append tab content wrappers that have content
    if (hasStats) $mobileContainer.append($statsTab);
    if (hasInfo) $mobileContainer.append($infoTab);
    if (hasInventory) $mobileContainer.append($inventoryTab);

    // Insert mobile tab structure at the beginning of content box
    $contentBox.prepend($mobileContainer);

    // Handle tab switching
    $tabNav.find('.story-tracker-mobile-tab').on('click', function() {
        const tabName = $(this).data('tab');

        // Update active tab button
        $tabNav.find('.story-tracker-mobile-tab').removeClass('active');
        $(this).addClass('active');

        // Update active tab content
        $mobileContainer.find('.story-tracker-mobile-tab-content').removeClass('active');
        $mobileContainer.find('[data-tab-content="' + tabName + '"]').addClass('active');
    });
}

/**
 * Removes mobile tab navigation and restores desktop layout.
 */
export function removeMobileTabs() {
    // Get sections from tabs before removing
    const $userStats = $('#story-tracker-user-stats').detach();
    const $infoBox = $('#story-tracker-info-box').detach();
    const $thoughts = $('#story-tracker-thoughts').detach();
    const $inventory = $('#story-tracker-inventory').detach();

    // Remove mobile tab container
    $('.story-tracker-mobile-container').remove();

    // Get dividers
    const $dividerStats = $('#story-tracker-divider-stats');
    const $dividerInfo = $('#story-tracker-divider-info');
    const $dividerThoughts = $('#story-tracker-divider-thoughts');

    // Restore original sections to content box in correct order
    const $contentBox = $('.story-tracker-content-box');

    // Re-insert sections in original order: User Stats, Info Box, Thoughts, Inventory
    if ($dividerStats.length) {
        $dividerStats.before($userStats);
        $dividerInfo.before($infoBox);
        $dividerThoughts.before($thoughts);
        $contentBox.append($inventory);
    } else {
        // Fallback if dividers don't exist
        $contentBox.prepend($inventory);
        $contentBox.prepend($thoughts);
        $contentBox.prepend($infoBox);
        $contentBox.prepend($userStats);
    }

    // Show sections and dividers
    $userStats.show();
    $infoBox.show();
    $thoughts.show();
    $inventory.show();
    $('.story-tracker-divider').show();
}

/**
 * Sets up mobile keyboard handling using Visual Viewport API.
 * Prevents layout squashing when keyboard appears by detecting
 * viewport changes and adding CSS classes for adjustment.
 */
export function setupMobileKeyboardHandling() {
    if (!window.visualViewport) {
        // console.log('[Story Tracker Mobile] Visual Viewport API not supported');
        return;
    }

    const $panel = $('#story-tracker-panel');
    let keyboardVisible = false;

    // Listen for viewport resize (keyboard show/hide)
    window.visualViewport.addEventListener('resize', () => {
        // Only handle if panel is open on mobile
        if (!$panel.hasClass('story-tracker-mobile-open')) return;

        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;

        // Keyboard visible if viewport significantly smaller than window
        // Using 75% threshold to account for browser UI variations
        const isKeyboardShowing = viewportHeight < windowHeight * 0.75;

        if (isKeyboardShowing && !keyboardVisible) {
            // Keyboard just appeared
            keyboardVisible = true;
            $panel.addClass('story-tracker-keyboard-visible');
            // console.log('[Story Tracker Mobile] Keyboard opened');
        } else if (!isKeyboardShowing && keyboardVisible) {
            // Keyboard just disappeared
            keyboardVisible = false;
            $panel.removeClass('story-tracker-keyboard-visible');
            // console.log('[Story Tracker Mobile] Keyboard closed');
        }
    });
}

/**
 * Handles focus on contenteditable fields to ensure they're visible when keyboard appears.
 * Uses smooth scrolling to bring focused field into view with proper padding.
 */
export function setupContentEditableScrolling() {
    const $panel = $('#story-tracker-panel');

    // Use event delegation for all contenteditable fields
    $panel.on('focusin', '[contenteditable="true"]', function(e) {
        const $field = $(this);

        // Small delay to let keyboard animate in
        setTimeout(() => {
            // Scroll field into view with padding
            // Using 'center' to ensure field is in middle of viewport
            $field[0].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }, 300);
    });
}
