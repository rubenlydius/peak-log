# Peak Log

An iOS app for keeping track of the mountains you climb. Browse almost four thousand peaks, see
which ones are around you, find them on a map, and write down every climb with notes, photos, a date
and the workout you recorded for it.

Built with Expo (SDK 57), Expo Router and TypeScript. iOS only.

## Expo SDK modules used

| Module | What it does here |
| --- | --- |
| `expo-router` | File-based navigation with native tabs, and a peak page shared by three tabs |
| `expo-sensors` | Magnetometer and accelerometer for the compass, device motion for the photo tilt |
| `expo-location` | Your position, for the nearby peaks and the map |
| `expo-image` | Photos in the logbook and the full-screen viewer |
| `expo-image-picker` | Choosing photos from the library |
| `expo-file-system` | Copying those photos into the app's own storage |
| `expo-symbols` | SF Symbols throughout the interface |
| `expo-splash-screen` | The launch screen and the animation that hands over to the app |
| `@expo/ui` | SwiftUI views: the popover on the map, the date picker, the range slider |

## Third-party libraries used

All from the "Third-party libraries" section of the Expo SDK documentation.

| Library | What it does here |
| --- | --- |
| `react-native-maps` | The map, with a pin per peak on Apple Maps |
| `@shopify/flash-list` | The long lists, 3,953 peaks in one of them |
| `react-native-reanimated` | The compass dial, the horizon strip and the photo tilt, on the UI thread |
| `react-native-gesture-handler` | The two-thumb height slider in the filters |
| `@react-native-async-storage/async-storage` | Saving the logbook between launches |
| `react-native-safe-area-context` | Keeping content clear of the notch and the tab bar |

Plus `@kingstinct/react-native-healthkit` for Apple Health, which isn't in that list but is what makes
the activity feature possible.

## Things that only work on a native app

- **A tilt-compensated compass** built from raw magnetometer and accelerometer readings, smoothed
  with a low-pass filter, driving the dial through a shared value so it turns without re-rendering.
- **A horizon strip** that lays the surrounding peaks out by their real bearing, so they slide past
  as you turn the phone, with distance deciding how high each one sits.
- **Apple Maps** with native pins, collision priorities, and a SwiftUI popover anchored to a marker.
- **Apple Health**: reading your real hikes, walks, runs and climbs, and attaching one to a climb.
- **Device motion** in the photo viewer: the picture leans as you tilt the phone.
- **GPS**, feeding distances, bearings, the blue dot and the recentre button.
- **The photo library**, with photos copied into the app's sandbox so entries can't lose them.
- **Native UI**: SwiftUI controls, SF Symbols, native tabs, and the iOS launch screen.

Everything is stored on the device. No accounts, no servers, no analytics, and it all works offline.

## Getting started

```bash
npm install
npx expo run:ios --device
```

Apple Health needs a native module, so the app runs in a development build rather than Expo Go.
After the first build, `npx expo start` is enough; rebuild only when something native changes
(a new package, the icon, `app.json`).

Two things need a real phone: the compass needs a magnetometer and the photo tilt needs the motion
sensors, neither of which the simulator has. For location in the simulator,
`xcrun simctl location booted set 45.9237,6.8694` drops you in Chamonix, or use the development
switch described below.

## The data

`src/data/peaks.json` holds 3,953 peaks from the [open-peaks](https://github.com/open-peaks/data)
dataset, sorted by height, with name, height in metres and feet, continent, countries, regions and,
for 2,994 of them, coordinates. Peaks without coordinates appear in lists but not on the map or the
compass. The data ships with the app, so browsing, searching and filtering work offline.

## Features

### Mountains tab

- **The list** of all peaks, sorted by height, showing name, countries, its height, and a checkmark
  when the peak is in your logbook. Climbed rows carry a wash of the accent colour.
- **Search** from the header. It ignores accents, so "monch" finds "Mönch".
- **Filters** from the header: climbed status, a height range on a two-thumb slider, and a country
  picker with its own search. The icon fills in while a filter is active.
- **Map view**, through the button at the bottom centre, showing exactly the peaks the list would.
- **On the map**, pins are the brand blue for climbed peaks and slate for the rest. Tapping one opens
  a popover with its name and height; tapping the popover opens the peak. Apple Maps hides pins that
  collide, always keeping the ones you climbed, then the highest.
- **Your location** as the usual blue dot, with a button to recentre on it.

### Compass tab

- **A horizon strip**: the peaks around you, left to right by direction and top to bottom by
  distance, nearest lowest. Tapping one opens it. Labels never overlap, and a peak is never drawn
  below a nearer one.
- **The compass dial** underneath, with the heading in degrees.
- **A range slider** from 5 to 500 km deciding how far the strip reaches.
- **Without a compass**, the strip is replaced by a list sorted by distance and the slider keeps
  working.

### Profile tab

Peaks climbed and how many climbs are logged, your highest peak, the summit heights added up,
countries and continents reached, the Seven Summits ticked off, and progress per continent.

### The logbook

- **A peak can be climbed more than once**, each climb its own entry with a date, notes, photos and
  an activity, listed newest first on the peak's page.
- **Photos** are copied into the app's own folder, so an entry can't lose its pictures. Tapping one
  opens it full screen on a dimmed page, where it tilts with the phone; tapping around it closes it.
- **Activities from Apple Health**: "Add activity" lists your last 50 hikes, walks, runs and climbs.
  Picking one attaches its date, duration, distance, elevation gain and GPS track, and sets the
  entry's date to match. The numbers are stored as a copy, so the entry survives the workout being
  deleted from Health. Sources differ in what they sync: an Apple Watch hike brings its route along,
  a COROS watch syncs the stats but not the track.
- **"View on map"** jumps to the Mountains tab, centres the map on that peak and opens its popover,
  even when the current filters would hide it.

## Project layout

```
src/
  app/                    Screens; the folder structure is the navigation
    _layout.tsx           Theme provider, splash overlay and the native tab bar
    (index)/              Mountains tab: list, map, filters, peak page, log form
    compass/              Compass tab: horizon strip, dial, peak page, log form
    profile/              Profile tab: statistics, peak page, log form
  components/             Screen building blocks and themed primitives
  hooks/                  Stores and sensor hooks
  utils/                  Distance and bearing maths, photo files, Apple Health
  data/                   The peak dataset and its types
  constants/theme.ts      Colors, spacing and fonts
```

The peak page and the log form are shared components, re-exported by a small route file in each tab,
so opening a peak keeps you inside the tab you started from.

### State

Three [Zustand](https://zustand.docs.pmnd.rs) stores in `src/hooks`:

- `use-logbook-store.ts` — your climbs, saved to AsyncStorage, with a migration from the older
  "climbed peaks" format.
- `use-peak-filters.ts` — search and filters, plus the shared `useFilteredPeaks` hook the list and
  the map both use, so they can't disagree.
- `use-mountains-view-store.ts` — list or map, and which peak the map should fly to.

### Notable pieces

- `use-compass-heading.ts` — tilt-compensated heading from two sensors, smoothed, feeding a
  Reanimated shared value.
- `horizon-strip.tsx` — the layout that places peaks by bearing and distance without overlapping.
- `health-workouts.ios.ts` — everything HealthKit, loaded lazily so the rest of the app doesn't
  depend on it, with a non-iOS sibling that reports it as unavailable.
- `photo-viewer.tsx` — the full-screen photo and its motion tilt.
- `geo.ts` — great-circle distance and bearing.

## Development helpers

- **Fake location** (development builds only): long-press the compass dial for 1.5 seconds to step
  through your own location → Chamonix → Kathmandu. A message confirms the change and a line above
  the slider shows which stand-in is active; the map hides its blue dot meanwhile, since iOS draws
  that from the real position. Nothing is saved, so restarting returns to your own location. Without
  a compass, long-press the "No compass on this device" message instead. It all lives in
  `src/hooks/use-dev-location.ts` and can simply be deleted.
- `npx expo lint` for linting, `npx tsc --noEmit` for type checking.

## Known limits

- iOS only. The map, the compass, the SwiftUI controls and Apple Health all depend on it.
- Peaks without coordinates can't appear on the map or the compass.
- Apple Health is read-only here, and only shows what each source syncs: routes come from sources
  that record them, and stats from all of them.
- Nothing is backed up: deleting the app deletes your logbook.
