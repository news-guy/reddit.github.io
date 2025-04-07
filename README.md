# Kindle Reddit Client

A simple Reddit client optimized for Kindle Paperwhite display. This client uses basic HTML and JavaScript to provide a minimalist browsing experience on Kindle's e-ink screen.

## Features

- Browse Reddit posts from any subreddit
- View comments for any post
- Simple navigation with Previous/Next buttons
- High contrast UI optimized for Kindle Paperwhite screen size (600px width)
- Minimal data usage with only 5 posts loaded at a time
- Displays post titles, author, scores, and content
- Uses thumbnails instead of full-sized images for faster loading
- Strips markdown formatting for cleaner text display

## Installation on Kindle

### Method 1: Using USB Transfer

1. Download the files to your computer:

   - `index.html`
   - `script.js`

2. Connect your Kindle to your computer via USB

   - Your Kindle should appear as a USB drive

3. Create a new folder on your Kindle (e.g., "reddit")

   - Copy both files into this folder

4. Safely eject your Kindle from your computer

5. On your Kindle:
   - Go to Home → Menu → Experimental Browser
   - In the address bar, type: `file:///mnt/us/reddit/index.html`
   - (Replace "reddit" with the folder name you created)

### Method 2: Using a Web Server

1. Host the files on a web server or free hosting service like GitHub Pages

   - Create a repository and upload the files
   - Enable GitHub Pages in the repository settings

2. On your Kindle:
   - Go to Home → Menu → Experimental Browser
   - Navigate to the URL where the files are hosted
   - You can bookmark this page for easy access

## Usage

1. The default view shows posts from r/all

2. To browse a specific subreddit:

   - Enter the subreddit name in the input field (without the "r/")
   - Tap "Load" or press Enter

3. Post navigation:

   - Use the "Previous" and "Next" buttons to navigate between pages
   - Tap on a post to open it directly in Reddit (requires internet connection)

4. Comment browsing:
   - Tap the "View Comments" button on any post to load its comments
   - The first 8 top-level comments will be displayed with their nested replies in threads
   - Use the "Back to Posts" button to return to the posts view
   - Each comment with replies has a toggle button to expand/collapse the thread
   - Deeply nested replies are automatically collapsed to improve readability
   - Tap "View full discussion on Reddit" to see all comments in the Reddit website

## Tips for Kindle Use

- The client works best in Kindle's Experimental Browser
- Page refreshes may be slow due to e-ink technology
- For better performance, avoid subreddits with many images
- Text-based subreddits like r/AskReddit work best
- Comments are limited to 10 per post for better performance

## Limitations

- Limited styling due to Kindle's browser capabilities
- Images may load slowly on Kindle's e-ink display
- Comment threads are limited in depth (max 3 levels) for better performance
- Top-level comments are limited to 8 per post
- May not work well on old Kindle models with limited browser support

## Technical Details

This client uses the Reddit JSON API to fetch posts and comments without requiring login as it only accesses publicly available data. It's designed to be lightweight and compatible with the limited processing power of Kindle devices.
