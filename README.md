# StreamSwipe

A couples movie-matching app built with React Native and Teenybase. Swipe right on movies you want to watch, and when both you and your partner swipe right on the same movie, it's a match!

## Features

- **Swipe Discovery** - Tinder-style swiping through movies filtered by your streaming services
- **Partner Matching** - Link with a partner via invite code and discover movies you both want to watch
- **Streaming Service Filters** - Select from Netflix, Hulu, Disney+, Prime Video, Max, Apple TV+, Paramount+, and Peacock
- **Browse Grid** - Scroll through all available movies in a grid layout
- **Match Tracking** - View your matched movies and mark them as watched
- **Movie Details** - See ratings, genres, overviews, and which streaming services carry each title

## Screenshots

The app has 4 main tabs:
1. **Discover** - Swipe left/right on movie cards
2. **Browse** - Grid view of all available movies
3. **Matches** - Movies you and your partner both liked
4. **Profile** - Streaming services, partner linking, account settings

## Prerequisites

- **macOS** (required for iOS simulator)
- **Node.js** >= 18
- **Xcode** >= 15 with iOS Simulator
- **CocoaPods** (`sudo gem install cocoapods`)
- **TMDB API Key** - Free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API keys

Copy the example config files and add your TMDB API key:

```bash
# Environment variables (used by Vite web build)
cp .env.example .env
# Edit .env and replace placeholders with your TMDB API key

# App config (used by React Native)
cp src/config.example.ts src/config.ts
# Edit src/config.ts and add your TMDB API key
```

### 3. Configure backend secrets

Copy the sample vars file for local development:

```bash
cp sample.vars .dev.vars
```

The default values in `sample.vars` work fine for local development.

### 4. Install iOS dependencies

```bash
cd ios
NO_FLIPPER=1 pod install
cd ..
```

### 5. Start the backend

```bash
npm run dev:backend
```

This starts the Teenybase backend on port 8787.

### 6. Run database migrations

In a separate terminal:

```bash
npm run migrate:backend -- -y
```

### 7. Create a guest account (optional)

```bash
npm run create-guest
```

This creates a guest account (username: `guest`, password: `guest123`) for quick testing.

### 8. Start Metro bundler

```bash
npm run start:native
```

### 9. Run on iOS Simulator

In a separate terminal:

```bash
npm run ios -- --simulator="iPhone 16"
```

Or open `ios/BlitzApp.xcworkspace` in Xcode and run from there.

## Running the Web Version

The app also runs in the browser via React Native Web:

```bash
# Start backend (if not already running)
npm run dev:backend

# Start Vite dev server
npm run dev
```

Then open [http://localhost:5174](http://localhost:5174).

## How It Works

1. **Sign up** or use the guest login
2. **Select your streaming services** in the Profile tab
3. **Link with a partner** using an invite code (Profile > Link Partner)
4. **Start swiping** on the Discover tab
5. When both partners swipe right on the same movie, it appears in the **Matches** tab

## Tech Stack

- **Frontend**: React Native 0.79 + React 19
- **Web**: React Native Web + Vite
- **Backend**: [Teenybase](https://github.com/nicosql/teenybase) (Cloudflare D1 SQLite)
- **Movie Data**: [TMDB API](https://www.themoviedb.org/documentation/api)
- **Storage**: AsyncStorage for auth token persistence

## Project Structure

```
src/
├── App.tsx                     # Root component with tab navigation
├── api.ts                      # Teenybase API client
├── config.ts                   # TMDB API key (gitignored)
├── screens/
│   ├── SwipeScreen.tsx         # Card swiping interface
│   ├── BrowseScreen.tsx        # Grid movie browser
│   ├── MatchesScreen.tsx       # Matched movies list
│   ├── ProfileScreen.tsx       # User profile & settings
│   ├── PartnerLinkScreen.tsx   # Partner invite code flow
│   ├── LoginScreen.tsx         # Login form
│   └── SignupScreen.tsx        # Registration form
├── components/
│   ├── ui.tsx                  # Shared UI components
│   ├── SwipeCard.tsx           # Movie swipe card
│   ├── MatchModal.tsx          # Match celebration modal
│   └── TabBar.tsx              # Bottom tab navigation
├── context/
│   ├── AuthContext.tsx          # Authentication state
│   ├── CoupleContext.tsx        # Partner linking state
│   ├── StreamingServicesContext.tsx
│   └── ThemeContext.tsx         # Theme colors & fonts
├── hooks/
│   └── useStreamingServices.ts
└── services/
    └── tmdb.ts                 # TMDB API wrapper

teenybase.ts                    # Database schema definition
src-backend/worker.ts           # Backend server entry point
migrations/                     # Auto-generated SQL migrations
ios/                            # iOS native project
```

## Database Schema

The app uses 6 tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with auth |
| `couples` | Partner relationships via invite codes |
| `swipes` | Individual user movie swipes (left/right) |
| `matches` | Movies both partners swiped right on |
| `user_services` | Selected streaming services per user |
| `kv_store` | General key-value storage |

## Troubleshooting

**Backend won't start**: Make sure port 8787 is free. Check that `.dev.vars` exists.

**No movies showing**: Verify your TMDB API key is set in both `.env` and `src/config.ts`.

**Pod install fails**: Try `cd ios && NO_FLIPPER=1 pod install --repo-update`.

**Reset everything**: `rm -rf .local-persist && npm run migrate:backend -- -y`

## License

MIT
# StreamSwipe
