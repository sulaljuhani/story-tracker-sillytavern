/**
 * Layout Management Module
 * Handles panel visibility, section visibility, collapse/expand toggle, and panel positioning
 */

import {
    extensionSettings,
    $panelContainer
} from '../../core/state.js';

/**
 * Toggles the visibility of plot buttons based on settings.
 */
export function togglePlotButtons() {
    const $plotButtons = $('#story-tracker-plot-buttons, #rpg-plot-buttons');
    if ($plotButtons.length === 0) return;

    if (extensionSettings.enablePlotButtons && extensionSettings.enabled) {
        $plotButtons.show();
    } else {
        $plotButtons.hide();
    }
}

/**
 * Helper function to close the mobile panel with animation.
 */
export function closeMobilePanelWithAnimation() {
    const $panel = $('#story-tracker-panel');
    const $mobileToggle = $('#story-tracker-mobile-toggle');

    // Add closing class to trigger slide-out animation
    $panel.removeClass('story-tracker-mobile-open').addClass('story-tracker-mobile-closing');
    $mobileToggle.removeClass('active');

    // Wait for transition/animation to complete before hiding
    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        $panel.removeClass('story-tracker-mobile-closing');
        $('.story-tracker-mobile-overlay').remove();
    };

    $panel.one('transitionend animationend', cleanup);
    setTimeout(cleanup, 400); // Fallback in case no event fires
}

/**
 * Updates the collapse toggle icon direction based on panel position.
 */
export function updateCollapseToggleIcon() {
    const $collapseToggle = $('#story-tracker-collapse');
    const $panel = $('#story-tracker-panel');
    const $icon = $collapseToggle.find('i');
    const isMobile = window.innerWidth <= 1000;

    if (isMobile) {
        // Mobile: slides from right, use same icon logic as desktop right panel
        const isOpen = $panel.hasClass('story-tracker-mobile-open');
        console.log('[Story Tracker Mobile] updateCollapseToggleIcon:', {
            isMobile: true,
            isOpen,
            settingIcon: isOpen ? 'chevron-left' : 'chevron-right'
        });
        if (isOpen) {
            // Panel open - chevron points left (to close/slide back right)
            $icon.removeClass('fa-chevron-down fa-chevron-up fa-chevron-right').addClass('fa-chevron-left');
        } else {
            // Panel closed - chevron points right (to open/slide in from right)
            $icon.removeClass('fa-chevron-down fa-chevron-up fa-chevron-left').addClass('fa-chevron-right');
        }
    } else {
        // Desktop: icon direction based on panel position and collapsed state
        const isCollapsed = $panel.hasClass('story-tracker-collapsed');

        if (isCollapsed) {
            // When collapsed, arrow points inward (to expand)
            if ($panel.hasClass('story-tracker-position-right')) {
                $icon.removeClass('fa-chevron-right').addClass('fa-chevron-left');
            } else if ($panel.hasClass('story-tracker-position-left')) {
                $icon.removeClass('fa-chevron-left').addClass('fa-chevron-right');
            }
        } else {
            // When expanded, arrow points outward (to collapse)
            if ($panel.hasClass('story-tracker-position-right')) {
                $icon.removeClass('fa-chevron-left').addClass('fa-chevron-right');
            } else if ($panel.hasClass('story-tracker-position-left')) {
                $icon.removeClass('fa-chevron-right').addClass('fa-chevron-left');
            }
        }
    }
}

/**
 * Sets up the collapse/expand toggle button for side panels.
 */
export function setupCollapseToggle() {
    const $collapseToggle = $('#story-tracker-collapse');
    const $panel = $('#story-tracker-panel');
    const $icon = $collapseToggle.find('i');

    $collapseToggle.on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const isMobile = window.innerWidth <= 1000;

        // On mobile: button toggles panel open/closed (same as desktop behavior)
        if (isMobile) {
            const isOpen = $panel.hasClass('story-tracker-mobile-open');
            console.log('[Story Tracker Mobile] Collapse toggle clicked. Current state:', {
                isOpen,
                panelClasses: $panel.attr('class'),
                inlineStyles: $panel.attr('style'),
                panelPosition: {
                    top: $panel.css('top'),
                    bottom: $panel.css('bottom'),
                    transform: $panel.css('transform'),
                    visibility: $panel.css('visibility')
                }
            });

            if (isOpen) {
                // Close panel with animation
                console.log('[Story Tracker Mobile] Closing panel');
                closeMobilePanelWithAnimation();
            } else {
                // Open panel
                console.log('[Story Tracker Mobile] Opening panel');
                $panel.addClass('story-tracker-mobile-open');
                const $overlay = $('<div class="story-tracker-mobile-overlay"></div>');
                $('body').append($overlay);

                // Debug: Check state after animation should complete
                setTimeout(() => {
                    console.log('[Story Tracker Mobile] 500ms after opening:', {
                        panelClasses: $panel.attr('class'),
                        hasOpenClass: $panel.hasClass('story-tracker-mobile-open'),
                        visibility: $panel.css('visibility'),
                        transform: $panel.css('transform'),
                        display: $panel.css('display'),
                        opacity: $panel.css('opacity')
                    });
                }, 500);

                // Close when clicking overlay
                $overlay.on('click', function() {
                    console.log('[Story Tracker Mobile] Overlay clicked - closing panel');
                    closeMobilePanelWithAnimation();
                    updateCollapseToggleIcon();
                });
            }

            // Update icon to reflect new state
            updateCollapseToggleIcon();

            console.log('[Story Tracker Mobile] After toggle:', {
                panelClasses: $panel.attr('class'),
                inlineStyles: $panel.attr('style'),
                panelPosition: {
                    top: $panel.css('top'),
                    bottom: $panel.css('bottom'),
                    transform: $panel.css('transform'),
                    visibility: $panel.css('visibility')
                },
                gameContainer: {
                    opacity: $('.story-tracker-content').css('opacity'),
                    visibility: $('.story-tracker-content').css('visibility')
                }
            });
            return;
        }

        // Desktop behavior: collapse/expand side panel
        const isCollapsed = $panel.hasClass('story-tracker-collapsed');

        if (isCollapsed) {
            // Expand panel
            $panel.removeClass('story-tracker-collapsed');

            // Update icon based on position
            if ($panel.hasClass('story-tracker-position-right')) {
                $icon.removeClass('fa-chevron-left').addClass('fa-chevron-right');
            } else if ($panel.hasClass('story-tracker-position-left')) {
                $icon.removeClass('fa-chevron-right').addClass('fa-chevron-left');
            }
        } else {
            // Collapse panel
            $panel.addClass('story-tracker-collapsed');

            // Update icon based on position
            if ($panel.hasClass('story-tracker-position-right')) {
                $icon.removeClass('fa-chevron-right').addClass('fa-chevron-left');
            } else if ($panel.hasClass('story-tracker-position-left')) {
                $icon.removeClass('fa-chevron-left').addClass('fa-chevron-right');
            }
        }
    });

    // Set initial icon direction based on panel position
    updateCollapseToggleIcon();
}

/**
 * Updates the visibility of the entire panel.
 */
export function updatePanelVisibility() {
    if (extensionSettings.enabled) {
        $panelContainer.show();
        togglePlotButtons(); // Update plot button visibility
    } else {
        $panelContainer.hide();
        $('#story-tracker-plot-buttons, #rpg-plot-buttons').hide(); // Hide plot buttons when disabled
    }
}

/**
 * Updates the visibility of individual sections.
 */
export function updateSectionVisibility() {
    // This function is not used by the Story Tracker extension
    // It was part of the RPG Companion extension and can be removed or left empty
    // The Story Tracker doesn't have separate sections like user stats, info box, etc.
}

/**
 * Applies the selected panel position.
 */
export function applyPanelPosition() {
    if (!$panelContainer) return;

    const isMobile = window.innerWidth <= 1000;

    // Remove all position classes
    $panelContainer.removeClass('story-tracker-position-left story-tracker-position-right story-tracker-position-top');

    // On mobile, don't apply desktop position classes
    if (isMobile) {
        return;
    }

    // Desktop: Add the appropriate position class
    const position = extensionSettings.panelPosition || 'right';
    $panelContainer.addClass(`story-tracker-position-${position}`);

    // Update collapse toggle icon direction for new position
    updateCollapseToggleIcon();
}

/**
 * Updates the UI based on generation mode selection.
 */
export function updateGenerationModeUI() {
    if (extensionSettings.generationMode === 'together') {
        // In "together" mode, manual update button is hidden
        $('#story-tracker-manual-update, #rpg-manual-update').hide();
    } else {
        // In "separate" mode, manual update button is visible
        $('#story-tracker-manual-update, #rpg-manual-update').show();
    }
}
