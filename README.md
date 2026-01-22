# Bill's Personal Portfolio Website

A beautiful, modern personal website built with Next.js, TypeScript, and Tailwind CSS. This portfolio showcases a clean, minimalist design inspired by current UI/UX designer portfolio trends.

## Features

- 🎨 **Modern Design**: Clean, minimalist interface with smooth animations
- 📱 **Fully Responsive**: Optimized for all devices and screen sizes
- 🌙 **Dark Mode Support**: Automatic dark mode based on system preferences
- ⚡ **Performance**: Built with Next.js for optimal performance and SEO
- 🎯 **Accessible**: Semantic HTML and proper ARIA labels
- ✨ **Smooth Animations**: Subtle transitions and hover effects

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Project Structure

```
├── app/
│   ├── layout.tsx      # Root layout with metadata
│   ├── page.tsx        # Main landing page
│   └── globals.css     # Global styles and Tailwind imports
├── components/
│   ├── Hero.tsx        # Hero section with introduction
│   ├── ProjectGrid.tsx # Featured projects showcase
│   ├── About.tsx       # About section with skills
│   ├── Contact.tsx     # Contact form and information
│   └── Footer.tsx      # Footer with social links
└── public/             # Static assets
```

## Customization

### Update Personal Information

1. **Hero Section** (`components/Hero.tsx`):
   - Change the name, title, and description
   - Update social media links

2. **Projects** (`components/ProjectGrid.tsx`):
   - Replace the projects array with your own work
   - Update project images, titles, and descriptions

3. **About Section** (`components/About.tsx`):
   - Modify the bio text
   - Update the skills array

4. **Contact Section** (`components/Contact.tsx`):
   - Change the email address
   - Update location and response time information
   - Connect the form to your preferred backend service

5. **Metadata** (`app/layout.tsx`):
   - Update the title and description for SEO

## Build for Production

```bash
npm run build
npm start
```

## Technologies Used

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React 19** - UI library

## License

This project is open source and available for personal use.
