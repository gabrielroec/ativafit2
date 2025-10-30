# Product Main Section - Refactoring Guide

## Overview

The `product-main-section.liquid` has been professionally refactored following Shopify 2.0 best practices. The monolithic 4000+ line file has been modularized into reusable components.

## Files Created

### 1. Snippets (Components)

#### `snippets/product-gallery.liquid`

- **Purpose**: Renders product images/videos gallery with fullscreen modal
- **Features**:
  - Image/video viewer with thumbnails
  - Fullscreen modal with navigation
  - Touch/swipe support for mobile
  - Video autoplay with controls

#### `snippets/product-info.liquid`

- **Purpose**: Displays product information
- **Includes**:
  - Product title (customizable or from product)
  - Subtitle
  - Reviews section with stars
  - Feature lines
  - Price display
  - AtivaPeople badge
  - Payment options text

#### `snippets/product-benefits.liquid`

- **Purpose**: Renders product benefits with SVG icons
- **Features**:
  - Up to 4 customizable benefits
  - SVG icons (inline)
  - Info buttons ("?") for popups
  - Links support

#### `snippets/product-add-to-cart.liquid`

- **Purpose**: Add to cart functionality
- **Includes**:
  - Variant selector (if product has variants)
  - Quantity selector
  - Add to Cart button
  - Buy It Now button (optional)
  - AtivaPeople CTA (optional)

#### `snippets/product-accordions.liquid`

- **Purpose**: Product information accordions
- **Features**:
  - Dynamic blocks support
  - Rich text or list content types
  - Optional links
  - Smooth animations

#### `snippets/product-benefit-popups.liquid`

- **Purpose**: Popup modals for benefit details
- **Features**:
  - Modal dialogs for each benefit
  - Close on backdrop click, ESC key, or close button
  - Responsive design

### 2. Assets

#### `assets/product-main-section.css`

- **Purpose**: All styles for product main section
- **Benefits**:
  - Centralized styling
  - Better performance (cached by browser)
  - Easier maintenance
  - Organized by sections with comments

### 3. New Section File

#### `sections/product-main-refactored.liquid`

- **Purpose**: Main section file using all snippets
- **Features**:
  - Clean, minimal HTML
  - Modular architecture
  - Complete Shopify 2.0 schema
  - Professional JavaScript organization
  - All customizable via Theme Editor

## Shopify 2.0 Schema

The new section includes a comprehensive schema with:

### Product Information Settings

- Custom product title
- Product subtitle
- Reviews display toggle
- Review text customization

### Features Settings

- Show/hide features
- Two customizable feature lines

### Pricing Settings

- Mobile price display toggle
- AtivaPeople badge toggle
- Custom badge HTML

### Payment Options

- Payment text customization
- Shop Pay logo toggle
- Learn more link

### Benefits Settings (4 Benefits)

Each benefit includes:

- Enable/disable toggle
- Title
- Description
- SVG icon (HTML field for flexibility)
- Link text and URL
- Popup title and content

### Variant & Quantity

- Variant selector toggle
- Custom labels
- Quantity selector toggle

### Buttons

- Add to Cart button text
- Buy It Now toggle and text
- AtivaPeople CTA toggle and text

### Blocks

- **Accordion Items**: Unlimited accordion blocks
  - Title
  - Content type (Rich Text or List)
  - Up to 5 list items
  - Optional link

## Migration Guide

### Option 1: Replace Existing Section

1. Backup created at: `sections/product-main-section.liquid.backup`
2. Copy content from `sections/product-main-refactored.liquid`
3. Paste into `sections/product-main-section.liquid`
4. Configure settings in Theme Editor

### Option 2: Use as New Section

1. Keep both sections
2. Update product template JSON to use `product-main-refactored`
3. Configure settings in Theme Editor

## Benefits of Refactored Structure

### Code Organization

- ✅ Modular components (easy to maintain)
- ✅ Separation of concerns (HTML/CSS/JS)
- ✅ Reusable snippets
- ✅ Professional commenting

### Performance

- ✅ Cached CSS file (faster loading)
- ✅ Organized JavaScript (better compression)
- ✅ Optimized selectors

### Maintainability

- ✅ Easy to find and edit components
- ✅ Clear file structure
- ✅ Self-documenting code
- ✅ Professional standards

### Shopify 2.0 Compliance

- ✅ Complete schema with all settings
- ✅ Block support for accordions
- ✅ Theme Editor friendly
- ✅ All settings in English
- ✅ Intuitive labels and organization

## Settings Configuration

All settings are accessible via **Theme Editor > Sections > Product Main**.

Settings are organized in logical groups:

1. **Product Information** - Title, subtitle, reviews
2. **Features** - Feature lines
3. **Pricing** - Price display, badges
4. **Payment Options** - Payment text, logos
5. **Benefits** - 4 customizable benefits
6. **Variant & Quantity** - Selectors
7. **Buttons** - CTA buttons

## Next Steps

1. Test the refactored section on a product page
2. Configure settings in Theme Editor
3. Add benefit SVG icons to settings
4. Add benefit popup content if needed
5. Test on desktop and mobile
6. Deploy to production when satisfied

## Support

For questions or issues with the refactored structure, refer to:

- Shopify Liquid documentation
- Shopify 2.0 section documentation
- Individual snippet files (all have detailed comments)

---

**Note**: The original file is backed up at `sections/product-main-section.liquid.backup` for reference or rollback if needed.

