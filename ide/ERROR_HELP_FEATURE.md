# Contextual Error Help Feature

## Overview

The Contextual Error Help feature provides beginner-friendly explanations for Rust and Soroban compilation errors directly within the IDE. When a compilation error occurs, users can click a "Learn More" link to open a sidebar panel with detailed explanations, common causes, and fix examples.

## Features

### 1. Error Code Detection
- Automatically detects Rust error codes (e.g., E0277, E0425, E0308)
- Recognizes custom Soroban-specific errors (e.g., SOROBAN_STATE_LIMIT, SOROBAN_AUTH)
- Extracts error codes from diagnostic messages

### 2. Code Actions
- Hovering over an error squiggle shows a "💡 Learn More" quick fix
- Clicking the quick fix opens the Error Help Panel
- Integrated with Monaco Editor's code action system

### 3. Error Help Panel
- Displays in a sidebar on the right side of the IDE
- Shows:
  - Error code badge
  - Plain-language title and description
  - Common causes (bulleted list)
  - Code examples showing the problem and solution
  - Links to official Stellar and Rust documentation

### 4. Error Database
- Curated JSON database of common errors
- Includes 10 error types:
  - **E0277**: Trait Not Implemented
  - **E0425**: Cannot Find Value
  - **E0308**: Type Mismatch
  - **E0382**: Use of Moved Value
  - **E0599**: Method Not Found
  - **E0507**: Cannot Move Out of Borrowed Content
  - **SOROBAN_STATE_LIMIT**: Contract State Size Limit Exceeded (64KB)
  - **SOROBAN_AUTH**: Authorization Required
  - **SOROBAN_PANIC**: Contract Panic
  - **SOROBAN_OVERFLOW**: Integer Overflow

## Architecture

### Components

1. **ErrorHelpPanel** (`ide/src/components/ide/ErrorHelpPanel.tsx`)
   - React component that displays error help content
   - Fetches error data from API
   - Provides accessible UI with proper ARIA labels

2. **Error Help Store** (`ide/src/store/useErrorHelpStore.ts`)
   - Zustand store managing panel open/close state
   - Tracks currently displayed error code

3. **Error Database** (`ide/src/data/errorHelpDatabase.json`)
   - JSON file containing error definitions
   - Structured with title, description, causes, examples, and docs links

4. **API Route** (`ide/app/api/error-help/route.ts`)
   - Next.js API route serving error database
   - Returns JSON data for client consumption

5. **Error Code Extractor** (`ide/src/utils/errorCodeExtractor.ts`)
   - Utility functions for extracting error codes from messages
   - Pattern matching for both explicit codes and error descriptions

### Integration Points

1. **CodeEditor** (`ide/src/components/editor/CodeEditor.tsx`)
   - Registers Monaco code action provider
   - Adds "Learn More" quick fixes to diagnostics
   - Triggers error help panel opening

2. **IDE Layout** (`ide/src/features/ide/Index.tsx`)
   - Renders ErrorHelpPanel in right sidebar
   - Manages panel visibility based on store state

## Usage

### For Users

1. Write Rust/Soroban code with an error
2. Hover over the red squiggle
3. Click the lightbulb icon or press `Ctrl+.` (Cmd+. on Mac)
4. Select "💡 Learn More About [ERROR_CODE]"
5. Read the explanation in the sidebar panel
6. Click documentation links for more details
7. Close the panel with the X button

### For Developers

#### Adding New Error Codes

1. Open `ide/src/data/errorHelpDatabase.json`
2. Add a new entry under the `errors` object:

```json
{
  "errors": {
    "E0XXX": {
      "title": "Error Title",
      "description": "Plain-language explanation",
      "commonCauses": [
        "Cause 1",
        "Cause 2"
      ],
      "fixExample": "// Code example showing problem and solution",
      "stellarDocs": "https://developers.stellar.org/...",
      "rustDocs": "https://doc.rust-lang.org/error-index.html#E0XXX"
    }
  }
}
```

3. Add the error code to `KNOWN_ERROR_CODES` in `ide/src/utils/errorCodeExtractor.ts`
4. Optionally add pattern matching in `extractErrorCode()` function

## Testing

### Manual Testing Steps

1. **Test Error Detection**
   - Create a Rust file with a known error (e.g., missing trait implementation)
   - Verify error squiggle appears
   - Hover to see quick fix

2. **Test Panel Opening**
   - Click "Learn More" quick fix
   - Verify panel opens on the right side
   - Check that correct error code is displayed

3. **Test Panel Content**
   - Verify all sections render correctly (title, description, causes, example, links)
   - Test documentation links open in new tabs
   - Check code example formatting

4. **Test Panel Closing**
   - Click X button to close
   - Verify panel disappears
   - Open another error to verify panel updates

5. **Test Unknown Errors**
   - Create an error without help documentation
   - Verify "No Help Available" message shows
   - Check fallback documentation links work

### Automated Testing

```bash
cd ide
npm test -- ErrorHelpPanel
```

## Accessibility

- Proper ARIA labels on all interactive elements
- Keyboard navigation support
- High contrast color scheme
- Screen reader friendly content structure
- Focus management when opening/closing panel

## Brand Consistency

- Uses Stellar color palette (blues, purples)
- Consistent with IDE theme (stellar-dark)
- Matches existing UI component styling
- Professional, educational tone in content

## Future Enhancements

1. **Search Functionality**: Allow users to search error database
2. **Related Errors**: Show similar errors at bottom of panel
3. **Community Examples**: Link to Stack Overflow or GitHub discussions
4. **AI-Powered Suggestions**: Use LLM to generate context-specific fixes
5. **Telemetry**: Track which errors users look up most
6. **Localization**: Translate error help into multiple languages
7. **Video Tutorials**: Embed short video explanations
8. **Interactive Fixes**: One-click apply suggested fixes

## Documentation Links

- [Stellar Developer Docs](https://developers.stellar.org/docs)
- [Rust Error Index](https://doc.rust-lang.org/error-index.html)
- [Soroban SDK Docs](https://docs.rs/soroban-sdk)

## Deliverables Checklist

- [x] Error resolution database (JSON)
- [x] Help panel sidebar component
- [x] Code action provider integration
- [x] API route for serving error data
- [x] Error code extraction utility
- [x] Store for state management
- [x] Integration with IDE layout
- [x] Documentation (this file)
- [ ] Functional screenshots
- [ ] Terminal output verification

## Screenshots

*To be added after testing in development environment*

1. Error squiggle with "Learn More" quick fix
2. Error Help Panel showing E0277 explanation
3. Error Help Panel showing Soroban-specific error
4. Panel with documentation links highlighted
5. "No Help Available" fallback state
