const SPEAKER_NAME_KEY = 'atlas_speaker_name';

export const getSpeakerName = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SPEAKER_NAME_KEY);
};

export const setSpeakerName = (name: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SPEAKER_NAME_KEY, name);
};

export const clearSpeakerName = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SPEAKER_NAME_KEY);
};
