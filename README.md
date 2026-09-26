# Peak Log

An iOS app for keeping track of the mountains you climb. Browse almost four thousand peaks, see
which ones are around you, find them on a map, and write down every climb with notes, photos and a
date.

Built with Expo (SDK 57), Expo Router and TypeScript. It runs in Expo Go, so no development build is
needed.

## Getting started

```bash
npm install
npx expo start
```

Then open the project in Expo Go on an iPhone, or press `i` for the iOS simulator.

The app is iOS only. Android was deliberately dropped, and the web build only serves as a fallback:
the map and the compass rely on iOS features and show a short message there instead.

Some things only work on a real phone: the compass needs a magnetometer, the photo tilt needs the
motion sensors, and the simulator has neither. For location, set a position in the simulator with
`xcrun simctl location booted set 45.9237,6.8694`, or use the built-in development switch described
below.

## The data

`src/data/peaks.json` holds 3,953 peaks from the [open-peaks](https://github.com/open-peaks/data)
dataset, sorted by height. Each peak has a name, height in metres and feet, continent, countries,
regions and, for 2,994 of them, coordinates. Peaks without coordinates appear in lists but cannot be
placed on the map or the compass.

The data ships with the app, so browsing, searching and filtering all work offline.

## Features

### Mountains tab

- **The list** of all peaks, sorted by height, showing name, countries, a checkmark when the peak is
  in your logbook, and its height.
- **Search** through the header's magnifying glass. It ignores accents, so "monch" finds "Mönch".
- **Filters** through the header's filter icon: climbed status, a height range with a two-thumb
  slider, and a country picker with its own search. The icon fills in when a filter is active.
- **Map view**, through the button at the bottom centre that switches between list and map. It shows
  the same peaks the list would, with the filters and the search applied.
- **On the map**, peaks are pins, green for climbed and blue for the rest. Tapping one opens a
  popover with its name and height; tapping the popover opens the peak. Apple Maps hides pins that
  overlap, keeping the highest and the ones you climbed, so the world view stays readable.
- **Your location** shows as the usual blue dot, with a button to recentre the map on it.

### Compass tab

- **A horizon strip** at the top: the peaks around you laid out left to right by direction and top to
  bottom by distance, nearest lowest. They slide past as you sweep the phone, and tapping one opens
  it. Labels never overlap, and a peak is never drawn below a nearer one.
- **The compass dial** underneath, tilt-compensated and smoothed, with the heading in degrees.
- **A range slider** at the bottom, from 5 to 500 km, which decides how far the strip reaches. Dense
  areas want a short range, flat ones a long range.
- **Without a compass** (the simulator, or an older phone) the strip is replaced by a plain list
  sorted by distance, and the slider keeps working.

### Profile tab

- **Statistics**: peaks climbed with the number of logged climbs, your highest peak, the summit
  heights added up, and how many countries and continents you have reached.
- **The Seven Summits**, ticked off as you climb them.
- **Progress per continent** as bars, and a list of every peak you climbed.

### The logbook

- **A peak can be climbed more than once.** Each climb is its own entry with a date, notes and
  photos, and the entries are listed newest first on the peak's page.
- **Photos** are picked from your library and copied into the app's own storage, so an entry can
  never lose its pictures. Tapping a photo opens it full screen on a dimmed page, where it tilts
  gently with the phone; tapping around it closes it again.
- **Editing and deleting** an entry works from the same screen that created it.
- **"View on map"** on a peak's page jumps to the Mountains tab, opens the map centred on that peak
  and opens its popover, even if the current filters would normally hide it.

Everything is stored on the device. There are no accounts, no servers and no analytics.

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
  utils/                  Distance and bearing maths, photo file handling
  data/                   The peak dataset and its types
  constants/theme.ts      Colors, spacing and fonts
```

The peak page and the log form are shared components, re-exported by a small route file in each tab,
so opening a peak keeps you inside the tab you started from.

### State

Three [Zustand](https://zustand.docs.pmnd.rs) stores, all in `src/hooks`:

- `use-logbook-store.ts` — your climbs, saved to AsyncStorage and migrated from the older
  "climbed peaks" format.
- `use-peak-filters.ts` — search and filter state, plus the shared `useFilteredPeaks` hook that the
  list and the map both use, so they can never disagree.
- `use-mountains-view-store.ts` — list or map, and which peak the map should fly to.

### Notable pieces

- `use-compass-heading.ts` — tilt-compensated heading from the magnetometer and accelerometer, with
  low-pass smoothing, feeding a Reanimated shared value so the dial turns without re-rendering.
- `horizon-strip.tsx` — the layout that places peaks by bearing and distance without overlapping.
- `geo.ts` — great-circle distance and bearing.
- `photo-viewer.tsx` — the full-screen photo with its motion tilt.

## Technology

| What | Used for |
| --- | --- |
| Expo Router | File-based navigation with native tabs |
| react-native-maps | Apple Maps with the peak pins |
| @expo/ui (SwiftUI) | Popover on the map, date picker, range slider |
| expo-sensors | Compass heading and the photo tilt |
| expo-location | Your position for the compass and the map |
| expo-image / expo-image-picker | Photos in the logbook |
| expo-file-system | Copying photos into the app's storage |
| Reanimated | The dial, the horizon strip and the photo tilt |
| FlashList | The long peak lists |
| Zustand + AsyncStorage | State and saved data |

## Development helpers

- **Fake location** (development builds only): long-press the compass dial for 1.5 seconds to step
  through your own location → Chamonix → Kathmandu. A message confirms the change and a line above
  the slider shows which stand-in is active. It is never saved, so restarting returns to the real
  location. Without a compass, long-press the "No compass on this device" message instead. The code
  lives in `src/hooks/use-dev-location.ts` and can simply be deleted.
- `npx expo lint` for linting, `npx tsc --noEmit` for type checking.

## Known limits

- The map and the compass need iOS; the web build shows a message instead.
- Peaks without coordinates cannot appear on the map or the compass.
- The map's popover uses a SwiftUI popover, so it exists on iOS only.
- Nothing is backed up: deleting the app deletes your logbook.
