# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TidyMark is a Chrome/Edge browser extension with two variants:
- **Full version**: Complete functionality with New Tab page override
- **Organize-only version**: Minimal version focused on bookmark management without navigation UI

The extension provides intelligent bookmark organization, AI-assisted categorization, dead link detection, GitHub backup, and a rich New Tab experience.

## Development Commands

### Building and Development
```bash
# Install Playwright for screenshot generation
npm run shots:install

# Start static server for development (required for screenshots)
npm run shots:serve

# Generate screenshots for full variant
npm run shots:full

# Generate screenshots for organize-only variant
npm run shots:organize

# Default screenshot generation (full variant)
npm run shots

# Sync shared services between variants
npm run sync:organize
```

### Testing the Extension
```bash
# Load extension in Developer Mode:
# 1. Open chrome://extensions/ or edge://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the folder:
#    - For full variant: root directory
#    - For organize-only: extensions/organize/
```

## Architecture

### Core Components

#### Service Worker (`src/background/index.js`)
Central message handling hub that manages:
- Bookmark CRUD operations and AI-assisted classification
- GitHub backup functionality with daily scheduling
- Context menu integration and dead link detection
- Automatic archiving based on last visit time

#### New Tab Page (`src/pages/newtab/`)
Rich navigation interface featuring:
- Categorized bookmark display with search functionality
- Dynamic Bing wallpaper integration and caching
- Weather widget and 60s news feed integration
- Visit statistics tracking and usage heat analysis
- Theme support (light/dark mode)

#### Shared Services (`/services/`)
Core business logic modules:
- `bookmarkService.js`: Low-level bookmark operations
- `classificationService.js`: Rule-based and AI categorization
- `storageService.js`: Chrome storage abstraction layer
- `i18n.js`: Internationalization support
- `defaultRules.js`: Default bookmark classification rules

### Multi-Variant Architecture

The codebase supports two variants from shared source:
- **Full variant**: Complete feature set with New Tab override
- **Organize variant**: Minimal permissions, no New Tab functionality
- **Shared code**: Core services and business logic reused across variants

### Message-Based Communication

Extension components communicate via Chrome messaging API:
```javascript
// Action-based message pattern
chrome.runtime.sendMessage({
  action: 'CLASSIFY_BOOKMARKS',
  data: { ... }
})
.then(response => handleResponse(response));
```

### Key Features Implementation

#### AI Integration
- Support for OpenAI and DeepSeek API endpoints
- Batch processing with configurable chunk sizes
- Retry mechanisms with exponential backoff
- Confidence scoring for classification results

#### Data Storage Strategy
- **Sync storage**: User preferences and configuration
- **Local storage**: Bookmark data, caches, and statistics
- **GitHub backup**: Automatic daily sync with configurable format (JSON/HTML)

#### Internationalization
- Support for English, Chinese (Simplified/Traditional), and Russian
- Dynamic language detection and switching
- Localized category names and UI elements

## File Structure Notes

### Extension Manifests
- `manifest.json`: Main full-variant manifest with complete permissions
- `extensions/organize/manifest.json`: Reduced permissions for organize-only variant

### Key Directories
- `/src/pages/`: Extension UI pages (newtab, options, preview)
- `/_locales/`: Internationalization files organized by language code
- `/icons/`: Extension icons in various sizes (16px to 128px)
- `/scripts/`: Build and utility scripts for development workflow

### Configuration Files
- `package.json`: Build scripts and Playwright dependencies for screenshot generation
- No bundling configuration - uses native ES6 modules

## Development Patterns

### Extension Development
- Uses Manifest V3 with service workers (not background pages)
- Native ES6 module loading without bundlers
- Chrome Extension API for all browser interactions
- Message-passing architecture between components

### Error Handling
- Structured error responses with action codes
- Graceful degradation for missing API keys or network failures
- User notifications for important operations and errors

### Permission Management
- Minimal required permissions for organize-only variant
- Optional permissions granted on-demand for AI features
- Host permissions limited to required API endpoints

## Testing and Quality

### Screenshot Generation
- Automated screenshot capture using Playwright
- Multi-language support for documentation
- Static server requirement for local development
- Configurable viewport sizes and variant selection

### Code Organization
- Service-oriented architecture with clear separation of concerns
- Shared business logic between extension variants
- Modular design enabling feature toggling based on variant type