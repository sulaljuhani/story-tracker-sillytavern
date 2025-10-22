/**
 * Parser Module
 * Handles parsing of AI responses to extract tracker data
 */

import { extensionSettings } from '../../core/state.js';
import { saveSettings } from '../../core/persistence.js';

/**
 * Parses the model response to extract the different data sections.
 * Extracts tracker data from markdown code blocks in the AI response.
 *
 * @param {string} responseText - The raw AI response text
 * @returns {{trackerData: object|null, html: string|null}} Parsed data
 */
export function parseResponse(responseText) {
    const result = {
        trackerData: null,
        html: null
    };

    // First, try to extract any HTML content.
    const htmlRegex = /(<div[^>]*>[\s\S]*?<\/div>|<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>)/gi;
    const htmlMatches = responseText.match(htmlRegex);
    if (htmlMatches) {
        result.html = htmlMatches.join('\n');
        // Remove the HTML from the response so it doesn't interfere with tracker parsing
        responseText = responseText.replace(htmlRegex, '');
    }

    // Now, parse the tracker data from code blocks
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let match;
    const matches = [];
    while ((match = codeBlockRegex.exec(responseText)) !== null) {
        matches.push(match[1]);
    }

    if (matches.length > 0) {
        // For story tracker, we expect a single JSON block
        try {
            result.trackerData = JSON.parse(matches[0]);
        } catch (error) {
            console.error('[Story Tracker] Error parsing tracker data from code block:', error);
        }
    }

    return result;
}
