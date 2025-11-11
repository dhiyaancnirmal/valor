# Valor UI Style Guide

> A comprehensive design system for the Valor gas price tracking app

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Animations & Transitions](#animations--transitions)
7. [Icons & Imagery](#icons--imagery)
8. [Best Practices](#best-practices)

---

## Design Philosophy

The Valor UI is built around these core principles:

- **Clean & Modern**: Minimalist design with purposeful use of gradients and shadows
- **Mobile-First**: Optimized for mobile experiences with touch-friendly interactions
- **Consistent**: Predictable patterns across all screens and components
- **Accessible**: High contrast ratios, large touch targets, clear visual hierarchy
- **Smooth**: Fluid animations and transitions for premium feel

---

## Color Palette

### Primary Colors

```css
--valor-green: #7DD756        /* Primary action color */
--valor-green-dark: #5FB840   /* Hover/pressed states */
--background: #F4F4F8         /* Main background */
--foreground: #1C1C1E         /* Primary text */
```

### Gradients

```css
/* Primary Green Gradient */
from-[#7DD756] to-[#6BC647]

/* Warm Gradient (Price Input) */
from-[#FF6B35] via-[#F7931E] to-[#FFD23F]

/* Overlay Gradients */
from-black/80 via-transparent to-transparent  /* Bottom overlay */
from-black/50 backdrop-blur-sm                 /* Modal backdrop */
```

### Semantic Colors

```css
--gray-50: #F9FAFB      /* Light backgrounds */
--gray-100: #F3F4F6     /* Card borders */
--gray-200: #E5E7EB     /* Borders */
--gray-400: #9CA3AF     /* Secondary text */
--gray-600: #4B5563     /* Body text */
--gray-900: #111827     /* Headings */

--white: #FFFFFF        /* Cards, buttons */
--black: #000000        /* Text, overlays */

/* Status Colors */
--blue-500: #3B82F6     /* Info */
--blue-600: #2563EB     /* Info dark */
--red-500: #EF4444      /* Error */
--red-600: #DC2626      /* Error dark */
--green-500: #10B981    /* Success */
```

---

## Typography

### Font Families

```css
/* Primary Font Stack */
font-family: 'DM Sans', sans-serif;  /* Body text, UI elements */

/* Display Font */
.jersey-20-regular {
  font-family: var(--font-jersey-20), sans-serif;  /* Headers, large numbers */
  font-weight: 400;
}

/* Monospace Font */
font-family: 'Garet Book';  /* Special use (wallet balance display) */
```

### Type Scale

```css
/* Display */
text-7xl    /* 72px - Hero numbers (price input) */
text-6xl    /* 60px - Main display */
text-5xl    /* 48px - Large values */

/* Headings */
text-3xl    /* 30px - Page titles */
text-2xl    /* 24px - Section headers */
text-xl     /* 20px - Card headers */
text-lg     /* 18px - Subheaders */

/* Body */
text-base   /* 16px - Primary body */
text-sm     /* 14px - Secondary body */
text-xs     /* 12px - Labels, captions */
```

### Font Weights

```css
font-bold       /* 700 - Headers, emphasis */
font-semibold   /* 600 - Sub-headers */
font-medium     /* 500 - UI elements */
font-normal     /* 400 - Body text */
```

### Text Colors

```css
text-[#1C1C1E]     /* Primary text */
text-gray-900      /* Headers */
text-gray-600      /* Body text */
text-gray-500      /* Secondary text */
text-gray-400      /* Tertiary text */
text-white         /* Light text */
text-[#7DD756]     /* Green accent */
```

---

## Spacing & Layout

### Spacing Scale

```css
px-2  py-2    /* 8px  - Tight spacing */
px-3  py-3    /* 12px - Close spacing */
px-4  py-4    /* 16px - Standard spacing */
px-6  py-6    /* 24px - Section padding */
px-8  py-8    /* 32px - Large padding */

/* Gap Spacing */
gap-2         /* 8px  - Tight gaps */
gap-3         /* 12px - Standard gaps */
gap-4         /* 16px - Comfortable gaps */
```

### Container Widths

```css
/* Full Width Containers */
w-full        /* 100% - Default for mobile */
min-w-0       /* For truncation */

/* Fixed Dimensions */
w-10 h-10     /* 40px - Icons, small buttons */
w-12 h-12     /* 48px - Profile pictures */
w-16 h-16     /* 64px - Large icons */
w-24 h-24     /* 96px - Profile avatars */
```

### Border Radius

```css
rounded-full      /* 9999px - Pills, circles */
rounded-3xl       /* 24px - Modals, large cards */
rounded-2xl       /* 16px - Cards, buttons */
rounded-xl        /* 12px - Inner elements */
rounded-lg        /* 8px  - Small elements */
```

### Safe Areas

```css
/* iOS Safe Area Support */
style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}
style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
```

---

## Components

### Buttons

#### Primary Button (Green)
```tsx
className="w-full bg-gradient-to-r from-[#7DD756] to-[#6BC647] text-white
  rounded-2xl py-5 px-8 font-bold text-lg
  hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]
  shadow-xl transition-all duration-200"
```

#### Secondary Button (Orange Gradient)
```tsx
className="w-full bg-gradient-to-r from-[#FF6B35] via-[#F7931E] to-[#FFD23F]
  text-white rounded-2xl py-6 px-8 font-bold text-xl
  hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]
  shadow-xl border-2 border-[#FF6B35]
  transition-all duration-200 jersey-20-regular tracking-wide"
```

#### Icon Button
```tsx
className="w-10 h-10 bg-white rounded-full shadow-md flex items-center
  justify-center hover:shadow-lg transition-all duration-200
  hover:scale-105"
```

#### Disabled Button
```tsx
className="bg-gray-200 text-gray-400 cursor-not-allowed
  border-2 border-gray-300"
```

### Cards

#### Base Card
```tsx
className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
```

#### Gradient Card
```tsx
<GradientCard
  title="USDC Earned"
  value="165"
  gradient="bg-gradient-to-br from-[#7DD756] to-green-600"
/>
```

#### Hover Card (Clickable)
```tsx
className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100
  cursor-pointer hover:bg-gray-100 transition-colors"
```

#### Store Card (with image overlay)
```tsx
<div className="relative w-[280px] h-[280px] rounded-2xl overflow-hidden">
  <img className="w-full h-full object-cover transition-transform
    duration-300 group-hover:scale-105" />
  <div className="absolute inset-0 bg-gradient-to-t from-black/80
    via-transparent to-transparent" />
  <div className="absolute bottom-3 left-3 right-3">
    <h3 className="text-lg font-bold text-white">Store Name</h3>
  </div>
</div>
```

### Progress Indicators

#### Step Progress (Gas Price Entry)
```tsx
{/* Active Step */}
<div className="w-8 h-8 rounded-full bg-[#7DD756] text-white
  ring-4 ring-[#7DD756]/20 flex items-center justify-center
  text-sm font-bold transition-all duration-200">
  <Check size={16} />
</div>

{/* Completed Step */}
<div className="w-8 h-8 rounded-full bg-[#7DD756] text-white
  flex items-center justify-center text-sm font-bold">
  <Check size={16} />
</div>

{/* Inactive Step */}
<div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500
  flex items-center justify-center text-sm font-bold">
  1
</div>
```

#### Progress Bar
```tsx
<div className="flex-1 h-1 mx-2 rounded-full bg-gray-200">
  <div className="h-full bg-[#7DD756] rounded-full transition-all"
    style={{ width: `${progress}%` }} />
</div>
```

### Input Fields

#### Text Input (Price Entry)
```tsx
<input
  type="number"
  className="w-40 text-7xl font-bold text-[#1C1C1E] bg-transparent
    focus:outline-none jersey-20-regular text-center
    border-b-4 border-[#FF6B35]/30 focus:border-[#FF6B35]
    transition-colors"
  inputMode="decimal"
/>
```

#### Search Input (Expandable)
```tsx
<div className={`flex items-center bg-white rounded-full shadow-md
  cursor-pointer transition-all duration-300 ease-in-out
  ${isExpanded ? 'w-full px-4 py-2.5 h-10' : 'w-10 h-10 justify-center'}`}>
  <svg>...</svg>
  <input className={`bg-transparent text-gray-900
    placeholder-gray-400 outline-none font-dm-sans text-sm
    ${isExpanded ? 'w-full ml-3 opacity-100' : 'w-0 ml-0 opacity-0'}`} />
</div>
```

### Modals & Overlays

#### Full-Screen Modal
```tsx
<div className="fixed inset-0 bg-[#F4F4F8] z-[100] flex flex-col
  overflow-hidden">
  {/* Header */}
  <div className="sticky top-0 bg-white border-b border-gray-200
    px-6 py-3 z-10 shadow-sm">
    {/* Content */}
  </div>

  {/* Scrollable Content */}
  <div className="flex-1 overflow-y-auto px-6 py-4">
    {/* Content */}
  </div>

  {/* Sticky Footer */}
  <div className="sticky bottom-0 bg-white border-t-2 border-gray-200
    px-6 py-6 shadow-lg z-10">
    {/* Actions */}
  </div>
</div>
```

#### Backdrop Overlay
```tsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10"
  onClick={handleClose} />
```

### Lists & Grids

#### Horizontal Scroll List
```tsx
<div className="flex gap-4 overflow-x-auto overflow-y-hidden"
  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
  {items.map(...)}
</div>
```

#### Stats Grid
```tsx
<StatsGrid
  columns={3}
  stats={[
    { label: "Submissions", value: "0" },
    { label: "USDC Earned", value: "0" },
    { label: "Rank", value: "1" }
  ]}
/>
```

### Category Pills
```tsx
<div className={`px-4 py-2 rounded-full font-medium text-sm
  transition-all duration-300 cursor-pointer font-inter
  flex items-center gap-2 flex-shrink-0
  ${isSelected ? 'bg-[#1C1C1E] text-white' : 'bg-[#E0E0E0] text-[#1C1C1E]'}`}>
  <span className="text-base">⛽</span>
  Gas
</div>
```

### Loading States

#### Spinner
```tsx
<div className="w-16 h-16 border-4 border-white border-t-transparent
  rounded-full animate-spin"></div>
```

#### Skeleton Card
```tsx
<div className="relative w-[280px] h-[280px] rounded-2xl overflow-hidden
  bg-gray-200 animate-pulse">
  <div className="absolute bottom-3 left-3 right-3">
    <div className="h-5 bg-gray-300 rounded mb-2"></div>
    <div className="h-4 bg-gray-300 rounded w-16"></div>
  </div>
</div>
```

### Info Banners

#### Photo Tips Banner
```tsx
<div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
  <div className="flex items-start space-x-3">
    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center
      justify-center flex-shrink-0 mt-0.5">
      <span className="text-white text-xs font-bold">!</span>
    </div>
    <div>
      <h4 className="text-sm font-bold text-blue-900 font-dm-sans mb-1">
        Photo Tips
      </h4>
      <ul className="text-xs text-blue-800 font-dm-sans space-y-1">
        <li>• Ensure prices are clearly visible</li>
        <li>• Include the fuel type labels</li>
        <li>• Avoid glare and blurry images</li>
      </ul>
    </div>
  </div>
</div>
```

#### Streak Banner (Rolling)
```tsx
<div className="bg-gradient-to-r from-[#7DD756] to-[#6BC647]
  overflow-hidden py-2">
  <div className="flex animate-scroll-left whitespace-nowrap">
    <span className="text-white font-bold">🔥 7 Day Streak!</span>
  </div>
</div>

{/* CSS */}
@keyframes scroll-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-scroll-left {
  animation: scroll-left 20s linear infinite;
}
```

---

## Animations & Transitions

### Standard Transitions

```css
/* Default Transition */
transition-all duration-200

/* Colors Only */
transition-colors

/* Transform Only */
transition-transform

/* Long Duration */
transition-all duration-300
```

### Hover Effects

```css
/* Scale Up */
hover:scale-105        /* Small elements */
hover:scale-[1.02]     /* Large elements */

/* Scale Down (Active) */
active:scale-95
active:scale-[0.98]

/* Shadow */
hover:shadow-lg
hover:shadow-2xl

/* Background */
hover:bg-gray-100
hover:bg-white/20
```

### Animation Keyframes

```css
/* Slide Up (Profile Drawer) */
@keyframes slide-up {
  0% { transform: translateY(100%); }
  100% { transform: translateY(0); }
}
.slide-up-enter {
  animation: slide-up 0.3s ease-out;
}

/* Continuous Scroll (Banner) */
@keyframes scroll-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-scroll-left {
  animation: scroll-left 20s linear infinite;
}

/* Spin (Loading) */
animate-spin
```

---

## Icons & Imagery

### Icon System

**Library**: Lucide React (`lucide-react`)

**Common Sizes**:
```tsx
size={16}  // Small icons, checkmarks
size={20}  // Standard UI icons
size={24}  // Large UI icons
size={40}  // Feature icons
```

**Common Icons**:
```tsx
import {
  ArrowLeft,     // Back navigation
  Camera,        // Photo capture
  X,             // Close
  MapPin,        // Location
  Check,         // Checkmarks
  ChevronRight,  // Forward navigation
  Settings,      // Settings
  Copy,          // Copy action
  Info,          // Information
  LogOut         // Sign out
} from 'lucide-react';
```

### Image Treatment

#### Photo Capture Preview
```tsx
<img
  src={capturedPhoto}
  className="w-full aspect-[4/3] object-cover rounded-2xl
    border-2 border-[#7DD756]"
/>
```

#### Store Images with Overlay
```tsx
<img
  className="w-full h-full object-cover transition-transform
    duration-300 group-hover:scale-105"
/>
<div className="absolute inset-0 bg-gradient-to-t
  from-black/80 via-transparent to-transparent" />
```

### Emoji Usage

Used consistently for visual hierarchy and quick recognition:

```tsx
⛽  // Gas stations
🛒  // Grocery stores
🔥  // Streak/fire
⭐  // Ratings
✓   // Success/Complete
❌  // Error/Failed
🚀  // Submit action
💰  // Money/rewards
```

---

## Best Practices

### Do's ✓

1. **Always use the jersey-20-regular font for:**
   - Page titles
   - Large numeric values
   - Section headers
   - Button text (when specified)

2. **Always use DM Sans for:**
   - Body text
   - Labels
   - Descriptions
   - Form inputs

3. **Maintain consistent spacing:**
   - Use px-6 for main content padding
   - Use gap-3 or gap-4 for standard spacing
   - Use py-6 for section dividers

4. **Apply smooth transitions:**
   - Add `transition-all duration-200` to interactive elements
   - Use `hover:scale-105` for small buttons
   - Use `hover:scale-[1.02]` for cards

5. **Handle safe areas on iOS:**
   - Add bottom padding for buttons: `calc(env(safe-area-inset-bottom) + 100px)`
   - Account for notch in headers

6. **Make touch targets large:**
   - Minimum 44px × 44px (w-11 h-11 or larger)
   - Use generous padding on clickable areas

### Don'ts ✗

1. **Don't mix fonts inappropriately:**
   - Never use Jersey 20 for body text
   - Never use DM Sans for large display numbers

2. **Don't use arbitrary colors:**
   - Stick to the defined palette
   - Use CSS variables for brand colors

3. **Don't create inconsistent borders:**
   - Always use rounded-2xl for cards
   - Always use rounded-full for circular buttons

4. **Don't forget loading states:**
   - Every async action needs a loading indicator
   - Use skeleton screens for lists

5. **Don't ignore accessibility:**
   - Maintain WCAG AA contrast ratios
   - Provide alternative text for images
   - Ensure keyboard navigation works

### Component Composition Patterns

#### Page Structure
```tsx
<div className="min-h-screen bg-[#F4F4F8] font-dm-sans flex flex-col">
  {/* Header */}
  <div className="px-6 pt-8 pb-6">
    <h1 className="text-3xl font-bold text-gray-900 jersey-20-regular">
      Page Title
    </h1>
  </div>

  {/* Content */}
  <div className="flex-1 px-6 pb-8">
    {/* Main content */}
  </div>
</div>
```

#### Form Pattern (Price Entry)
```tsx
{/* Step 1: Product Selection */}
<div className="space-y-4">
  <div>
    <h3 className="text-xl font-bold text-[#1C1C1E]
      jersey-20-regular mb-2">
      Select Product
    </h3>
    <p className="text-sm text-gray-600 font-dm-sans">
      Choose the fuel type
    </p>
  </div>

  <div className="space-y-3">
    {/* Selection cards */}
  </div>
</div>
```

---

## Responsive Behavior

### Mobile First (Default)

All components are designed mobile-first with these breakpoints:

```css
/* Base: 0-640px (Mobile) */
default styles

/* sm: 640px+ (Large Mobile) */
sm:text-[6rem]

/* md: 768px+ (Tablet) */
md:text-[8rem]

/* lg: 1024px+ (Desktop) */
lg:text-[12rem]

/* xl: 1280px+ (Large Desktop) */
xl:text-[16rem]
```

### Horizontal Scrolling

For mobile-optimized horizontal lists:

```tsx
<div className="flex gap-4 overflow-x-auto overflow-y-hidden
  scrollbar-hide">
  {items.map(...)}
</div>

<style jsx>{`
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`}</style>
```

---

## Implementation Notes

### Font Loading

Fonts are loaded via Next.js font optimization:

```tsx
import { DM_Sans, Jersey_20 } from 'next/font/google';

const dmSans = DM_Sans({ subsets: ['latin'] });
const jersey20 = Jersey_20({ weight: '400', subsets: ['latin'] });
```

### Color Variables

Use CSS custom properties for dynamic theming:

```css
:root {
  --valor-green: #7DD756;
  --valor-green-dark: #5FB840;
}
```

Reference in Tailwind:

```tsx
className="bg-[var(--valor-green)] text-[#1C1C1E]"
```

---

## Quick Reference

### Common Class Combinations

```css
/* Standard Card */
"bg-white rounded-2xl shadow-sm border border-gray-100 p-6"

/* Primary Button */
"bg-gradient-to-r from-[#7DD756] to-[#6BC647] text-white
 rounded-2xl py-5 px-8 font-bold hover:shadow-2xl
 transition-all duration-200"

/* Icon Button */
"w-10 h-10 bg-white rounded-full shadow-md flex items-center
 justify-center hover:scale-105 transition-all"

/* Section Header */
"text-2xl font-bold text-[#1C1C1E] jersey-20-regular mb-4"

/* Body Text */
"text-sm text-gray-600 font-dm-sans"
```

---

## Version History

- **v1.0.0** (Current) - Initial style guide based on Gas Price Entry page and app analysis

---

This style guide is a living document. Update it as new patterns emerge or designs evolve.
