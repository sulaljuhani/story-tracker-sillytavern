# Story Tracker Extension for SillyTavern

A customizable story tracking extension for SillyTavern that allows users to define hierarchical fields with individual prompts for LLM-powered automatic updates.

## Features

- **Dynamic Field Management**: Create custom sections, subsections, and fields with individual update prompts
- **Hierarchical Organization**: Organize tracker data in sections → subsections → fields structure
- **LLM Integration**: Automatic field updates using AI based on conversation context
- **Per-Chat Storage**: Each chat maintains its own tracker state
- **Customizable UI**: Multiple themes, collapsible sections, and responsive design
- **Data Management**: Import/export tracker configurations and data

## Installation

1. Open SillyTavern
2. Go to the Extensions tab (cubes icon at the top)
3. Go to Install extension
4. Copy-paste this link: `https://github.com/your-repo/story-tracker-sillytavern`
5. Press Install for all users/Install just for me

## Usage

### Basic Setup

1. Enable the extension in the Extensions tab
2. Click the book icon in the sidebar to open the Story Tracker panel
3. Click "Add Section" to create your first section
4. Add subsections and fields with custom prompts

### Creating Fields

Each field needs:
- **Name**: Display name for the field
- **Prompt**: Instructions for the AI on how to update this field
- **Type**: Text, Number, or Boolean (currently text-only implementation)
- **Enabled**: Whether the field should be updated by AI

### Example Structure

```
World
├── Location
│   └── Current Location: "Track where the story is set"
├── Weather
│   └── Current Weather: "Describe the current weather conditions"
└── Time
    └── Current Time: "Track the passage of time in the story"

Characters
└── {{user}}
    ├── Emotional State: "Update {{user}}'s emotional state based on recent events"
    └── Inventory: "Track {{user}}'s current possessions"
```

### AI Updates

The extension supports two generation modes:
- **Separate Mode**: Uses a separate API call for tracker updates (recommended)
- **Together Mode**: Embeds tracker updates in main responses (not implemented)

## Settings

### General Settings
- **Auto-update**: Automatically update tracker after each message
- **Context messages**: Number of recent messages to include for context

### Generation Mode
- **Separate**: Use separate API calls for tracker updates
- **Use separate preset**: Option to use a different preset for tracker generation

### Appearance
- **Panel position**: Left or right side
- **Theme**: Default, Dark, Light, or Custom colors

### Data Management
- **Export Data**: Download tracker configuration as JSON
- **Import Data**: Load tracker configuration from JSON file
- **Reset Data**: Clear all tracker data

## Technical Details

### Architecture

The extension follows a modular architecture similar to the RPG Companion:

- **Core**: State management, persistence, configuration
- **Systems**:
  - **Generation**: Prompt building, API communication, response parsing
  - **Rendering**: UI rendering and updates
  - **UI**: Layout, themes, modals
  - **Integration**: SillyTavern event handling

### Data Structure

```javascript
{
  sections: [
    {
      id: "world",
      name: "World",
      subsections: [
        {
          id: "location",
          name: "Location",
          fields: [
            {
              id: "current_location",
              name: "Current Location",
              value: "Forest Clearing",
              prompt: "Update the current location based on recent events",
              type: "text",
              enabled: true
            }
          ]
        }
      ]
    }
  ]
}
```

### Prompt Format

The AI receives prompts in this format:

```
You are managing a dynamic story tracker...

Please update the following fields based on the recent events:

Field: Current Location
Previous Value: "Forest Clearing"
Update Prompt: Update the current location based on recent events
Current Value: [AI fills this in]

Field: Emotional State
Previous Value: "Happy"
Update Prompt: Update character's emotional state based on recent events
Current Value: [AI fills this in]
```

## Development

### File Structure

```
story-tracker/
├── index.js                 # Main entry point
├── manifest.json           # Extension manifest
├── template.html           # HTML template
├── style.css              # Styles
├── src/
│   ├── core/              # Core functionality
│   │   ├── config.js      # Configuration constants
│   │   ├── state.js       # State management
│   │   ├── persistence.js # Data persistence
│   │   └── events.js      # Event handling
│   ├── systems/           # Feature modules
│   │   ├── generation/    # AI generation logic
│   │   ├── rendering/     # UI rendering
│   │   ├── ui/           # User interface
│   │   └── integration/   # SillyTavern integration
│   └── types/            # TypeScript-style definitions
│       └── tracker.js     # Data type definitions
└── README.md
```

### Building

The extension uses ES6 modules and should work directly in modern browsers. No build process is required.

## Compatibility

- Requires SillyTavern 1.11.0 or higher
- Works with all AI backends supported by SillyTavern
- Tested on Chrome, Firefox, and Edge

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## Credits

- Inspired by the RPG Companion extension
- Built using modern JavaScript and CSS
- Icons from Font Awesome
