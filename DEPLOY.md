# Deployment Guide for Cordinal Mushrooms

This guide covers how to deploy the Cordinal Mushrooms facility management system.

## Prerequisites

- **Node.js**: Version 18.17 or later.
- **Database**: The app uses SQLite (`sqlite.db`).
- **Disk Space**: ~1GB for the built application and dependencies.

## Deployment Steps (Manual / VPS)

1.  **Clone/Copy Source Code**
    Transfer the project files to your server.

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Build the Application**
    ```bash
    npm run build
    ```

4.  **Start the Server**
    ```bash
    npm start
    ```
    The app will run on `http://localhost:3000`.

5.  **Running in Background (PM2)**
    To keep the app running after you disconnect (recommended for production):
    ```bash
    # Install PM2 globally
    npm install -g pm2
    
    # Start the app
    pm2 start npm --name "cordinal-mushrooms" -- start
    
    # Save the process list to respawn on reboot
    pm2 save
    
    # Generate startup script (copy/paste the output command)
    pm2 startup
    ```

## Android App Installation

The app is built as a PWA, meaning you can install it directly from your browser without the Play Store.

1.  Open **Google Chrome** on your Android device.
2.  Navigate to the app's URL (e.g., `http://192.168.1.5:3000` if on local WiFi).
3.  Tap the **Menu** button (three dots) in the top-right corner.
4.  Select **"Add to Home Screen"** or **"Install App"**.
5.  Confirm the name ("Cordinal") and click **Add**.
6.  The app will appear on your home screen with the mushroom icon.

## Recommended Setup for 2 Users

Since your goal is to have 2 people use it efficiently, here are the best options:

### Option A: Local Network (Free & Easiest)
*Best if both users are in the same building (e.g., connected to the same WiFi).*
1.  Run the app on **Computer A** (the "Server") using `npm start` (or PM2).
2.  Find Computer A's **Local IP Address** (e.g., `192.168.1.10`).
    - Windows: Run `ipconfig` in CMD.
3.  **User 2** enters `http://192.168.1.10:3000` in their phone/laptop browser.
4.  **Note**: Ensure Computer A's firewall allows traffic on port 3000.

### Option B: Cheap VPS (Remote Access)
*Best if users are in different locations/networks.*
1.  Rent a small VPS (e.g., DigitalOcean Droplet, ~$6/mo).
2.  Follow the **Manual Deployment** steps above to set it up on the VPS.
3.  Both users access it via the VPS IP address (e.g., `http://159.203.x.x:3000`).


## Database Backups

The entire state is stored in `sqlite.db`.
**Backup this file regularly.**

