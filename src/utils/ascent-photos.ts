import { Directory, File, Paths } from 'expo-file-system';

// The picker hands out temporary files that iOS may clean up, so photos are copied into the app's
// own folder and the logbook stores those copies.
const photosDirectory = new Directory(Paths.document, 'ascent-photos');

const ensureDirectory = () => {
  if (!photosDirectory.exists) photosDirectory.create({ intermediates: true });
};

export const saveAscentPhoto = (uri: string) => {
  ensureDirectory();
  const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const copy = new File(photosDirectory, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`);
  new File(uri).copy(copy);
  return copy.uri;
};

export const deleteAscentPhoto = (uri: string) => {
  const file = new File(uri);
  // A photo can already be gone, for instance when the same entry is edited twice.
  if (file.exists) file.delete();
};
