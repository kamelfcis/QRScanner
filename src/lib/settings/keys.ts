/** Query keys shared by the settings hooks and server-side prefetching. */
export const settingsKeys = {
  all: ['settings'] as const,
  restaurant: () => [...settingsKeys.all, 'restaurant'] as const,
  theme: () => [...settingsKeys.all, 'theme'] as const,
  hours: () => [...settingsKeys.all, 'hours'] as const,
};
