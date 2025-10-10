# Dark Mode Feature Documentation

## Overview

The VoidCat RDC platform now includes a comprehensive dark mode feature that enhances user experience by providing a comfortable viewing option for low-light environments.

## Features

### 🌓 Dark Mode Toggle
- **Location**: Header section, right side of the navigation
- **Icons**: 
  - 🌙 Moon icon for light mode (click to enable dark mode)
  - ☀️ Sun icon for dark mode (click to disable dark mode)
- **Accessibility**: Fully accessible with `aria-label="Toggle dark mode"`

### 💾 Persistent Preference
- Dark mode preference is saved to browser's `localStorage`
- Setting persists across page reloads and browser sessions
- Automatic restoration on page load

### 🎨 Comprehensive Styling
All UI components have been updated with dark mode support:

#### Header & Navigation
- Dark background (`dark:bg-gray-900`)
- Light text for readability (`dark:text-white`)
- Hover states adjusted for dark mode

#### Search Section
- Dark card backgrounds (`dark:bg-gray-800`)
- Dark borders (`dark:border-gray-700`)
- Input fields with dark styling

#### Modals
All modals support dark mode:
- Registration Modal
- Upgrade to Pro Modal
- Usage Limit Modal
- Proposal Generation Modal
- Grant Details Modal
- Error Modal
- Notification Toast

#### Content Sections
- Grant results cards
- Hero section
- Social proof testimonials
- Features grid
- Demo section
- Footer

## Implementation Details

### Tailwind CSS Configuration
```javascript
tailwind.config = {
    darkMode: 'class'
}
```

Dark mode is triggered by adding the `dark` class to the `<html>` element.

### Alpine.js State Management
```javascript
{
    darkMode: false,
    
    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        this.applyDarkMode();
    },
    
    applyDarkMode() {
        if (this.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
}
```

### Color Scheme

#### Light Mode (Default)
- Background: `bg-gray-50`
- Cards: `bg-white`
- Text: `text-gray-900`, `text-gray-600`
- Borders: `border-gray-300`

#### Dark Mode
- Background: `bg-gray-900`
- Cards: `bg-gray-800`
- Text: `text-white`, `text-gray-300`
- Borders: `border-gray-700`

### Transition Effects
- Smooth transitions on theme toggle
- `transition-colors duration-300` applied to body element

## User Guide

### How to Enable Dark Mode
1. Navigate to the VoidCat RDC platform
2. Look for the dark mode toggle button in the header (top-right area)
3. Click the moon icon 🌙 to enable dark mode
4. The interface will smoothly transition to dark theme

### How to Disable Dark Mode
1. Click the sun icon ☀️ in the header
2. The interface will transition back to light mode

### Automatic Restoration
- Your preference is automatically saved
- Next time you visit the site, your preferred theme will be applied automatically

## Benefits

### User Experience
- **Eye Strain Reduction**: Dark mode reduces eye strain in low-light environments
- **Battery Savings**: OLED/AMOLED screens consume less power in dark mode
- **Accessibility**: Provides options for users with light sensitivity
- **Modern UX**: Aligns with contemporary design practices

### Technical Benefits
- **Performance**: No additional HTTP requests (uses Tailwind's built-in dark mode)
- **Lightweight**: Minimal JavaScript overhead
- **Maintainable**: Consistent dark mode classes across all components
- **Standards-Compliant**: Uses standard `class` strategy for dark mode

## Testing

### Manual Testing Checklist
- [x] Dark mode toggle button visible and accessible
- [x] Toggle switches between light and dark modes
- [x] Preference persists across page reloads
- [x] All sections properly styled in dark mode
- [x] Modals display correctly in dark mode
- [x] Form inputs are readable in dark mode
- [x] Buttons maintain proper contrast in dark mode
- [x] Links are visible and accessible in dark mode

### Automated Tests
Location: `tests/e2e/darkMode.spec.ts`

Tests cover:
1. Toggle button visibility
2. Mode switching functionality
3. localStorage persistence
4. Theme restoration on reload
5. Icon changes based on mode
6. Navigation state preservation

## Browser Compatibility

Dark mode works in all modern browsers that support:
- CSS custom properties
- JavaScript localStorage API
- Tailwind CSS (via CDN)
- Alpine.js (via CDN)

Tested on:
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements:
- System preference detection (`prefers-color-scheme` media query)
- Transition animations between themes
- Custom color themes beyond light/dark
- Theme selector with multiple options

## Related Files

- Frontend implementation: `frontend/index.html`
- Test suite: `tests/e2e/darkMode.spec.ts`
- Documentation: `README.md` (feature list updated)

---

*Feature implemented: October 2025*
*Version: 1.2.0*
