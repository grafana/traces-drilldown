import { type ResourceLoader } from '@grafana/i18n';

export const loadResources: ResourceLoader = async (language: string) => {
  const fallbackLanguage = 'en-US';
  const locale = language || fallbackLanguage;

  try {
    return await import(`../locales/${locale}/grafana-exploretraces-app.json`);
  } catch (error) {
    if (locale !== fallbackLanguage) {
      return await import(`../locales/${fallbackLanguage}/grafana-exploretraces-app.json`);
    }
    throw error;
  }
};
