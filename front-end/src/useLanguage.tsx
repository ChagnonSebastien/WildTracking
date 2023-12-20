import React, { createContext, ReactNode, useCallback, useMemo, useState } from 'react';

const getMonthNames = (language: string) => {
  const formatter = new Intl.DateTimeFormat(language, { month: 'long', timeZone: 'UTC' });
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
    const mm = month < 10 ? `0${month}` : month;
    return new Date(`2017-${mm}-01T00:00:00+00:00`);
  });
  return months.map(date => formatter.format(date));
};


const SupportedLanguages = {
  French: 'fr',
  English: 'en',
} as const;

type SupportedLanguagesType = typeof SupportedLanguages[keyof typeof SupportedLanguages];

const languageKey = 'LANGUAGE';
const browserLanguage = (): SupportedLanguagesType => {
  let language = localStorage.getItem(languageKey);
  switch (language) {
    case SupportedLanguages.French:
    case SupportedLanguages.English:
      return language;
  }

  language = (navigator.language as string).split('-')[0];
  switch (language) {
    case SupportedLanguages.French:
    case SupportedLanguages.English:
      return language;
  }

  return 'en';
};

/* eslint-disable */
const english = {
  language: 'Language',
  options: 'Options',
  loadingProcessing: 'Pre-processing data',
  loadingRoute: 'Downloading data',
  loadingAlmostReady: 'Finalizing',
  loadingMap: 'Initializing Google Maps',
  optionsPerformance: 'Performance',
  optionMapImages: 'Hide images on map',
  optionLowestDensity: 'Only show the lowest point density',
  optionNoTransitions: 'Disable transitions',
  optionNoSmoothMovement: 'Disable smooth movement',
  notStarted: 'Expedition not started, come back later',
  tutorial: 'Instructions',
  tutorialAgain: 'Show instructions again',
  position: 'Position',
  date: 'Date',
  timezone: 'Timezone',
  spotBattery: 'GPS Battery',
  fullResImageOf: 'Full resolution picture of',
  tutorialHideSubsequent: 'No longer show these instructions on subsequent reloads.',
  understood: 'Understood',
  youCanTry: 'You can try it now',
  interface: 'Interface',
  part: 'Part',
  onDesktop: 'On desktop',
  onMobile: 'On mobile',
  tut_binding: 'The map is bound to the timeline at the bottom of your screen. You can zoom in and move the timeline and the map will follow.',
  tut_mouse: 'Use the mouse to drag the timeline left and right and the mousewheel to zoom in and out.',
  tut_finger: 'Use one finger to drag the timeline left and right and pinch using multiple fingers to zoom in and out.',
  tut_moveRestriction: 'By default, you can NOT move the map without using the timeline.',
  tut_unbinding: 'However, you can unbind the map to the timeline and move freely using the lock button just below. It can then be clicked again to re-bind.',
  tut_elevation: 'The timeline shows the elevation profile over the days. For finer elevation details, the timeline can be extended and shrank using the arrow just below.',
  only_images: 'Only the pictures',
  explore: 'View map',
} as const;

export type LanguageStrings = {
  [Property in keyof typeof english]: string;
}

const french: LanguageStrings = {
  language: 'Langue',
  options: 'Options',
  loadingProcessing: 'Pré-traitement des données',
  loadingRoute: 'Téléchargement des données',
  loadingAlmostReady: 'Presque prêt',
  loadingMap: 'Initialisation de Google Maps',
  optionsPerformance: 'Performance',
  optionMapImages: 'Cacher les images de la carte',
  optionLowestDensity: 'N\'afficher que la plus basse densitée de points',
  optionNoTransitions: 'Désactiver les transitions',
  optionNoSmoothMovement: 'Désactiver le mouvement fluide',
  notStarted: 'Cette expedition n\'est pas commencée, revenez plus tard',
  tutorial: 'Instructions',
  tutorialAgain: 'Visionner les instructions à nouveau',
  position: 'Coordonées',
  date: 'Date',
  timezone: 'Fuseau Horaire',
  spotBattery: 'Batterie du GPS',
  fullResImageOf: 'Photo pleine résolution de',
  tutorialHideSubsequent: 'Ne plus montrer ces instructions dans le future',
  understood: 'D\'accord',
  youCanTry: 'Tu peux essayer maintenant',
  interface: 'Interface',
  part: 'Partie',
  onDesktop: 'Sur ordinateur',
  onMobile: 'Sur écran tactile',
  tut_binding: 'La carte est liée à la ligne du temps au bas de l\'écran. Il est possible de redimentionner et déplacer la ligne du temps et la carte suivera.',
  tut_mouse: 'Utiliser la souris pour glisser la ligne du temps de gauche à droite et la roulette pour l\'agrandire et la rapetisser.',
  tut_finger: 'Utiliser un doigt pour glisser la ligne du temps de gauche à groide et pincer avec plusieurs doigts pour l\'agrandire et la rapetisser.',
  tut_moveRestriction: 'Par défaut, il n\'est PAS possible de déplacer la carte sans utiliser la ligne du temps.',
  tut_unbinding: 'Cependant, il est possible de délier la carte et la ligne du temps et bouger la carte à votre guise en utilisant le boutton du barrure ci-dessous. Il peut ensuite être re-cliqué pour re-lier',
  tut_elevation: 'La ligne du temps indique le profil d\'élévation au fil des jours. Pour des détails plus fins, la ligne du temps peur être agrandie et rapetissée en utilisant la flèche ci-dessous.',
  only_images: 'Seulement les photos',
  explore: 'Voir la carte',
} as const;

/* eslint-enable */

const languages: { [Property in SupportedLanguagesType]: LanguageStrings } = {
  fr: french,
  en: english,
};

type Context = {
  text: LanguageStrings,
  languageSelectionInput: ReactNode,
  monthName: (i: number) => string
}

export const LanguageContext = createContext<Context>({
  text: english,
  languageSelectionInput: null,
  monthName: i => i.toLocaleString(),
});

const LanguageWrapper = ({ children }: { children: ReactNode }) => {

  const [ language, setLanguage ] = useState<SupportedLanguagesType>(browserLanguage());

  const monthName = useCallback((i: number) => {
    return getMonthNames(language)[i];
  }, [language]);

  const languageSelectionInput = useMemo(() => {
    return (
      <div>
        <label
          onClick={() => {
            setLanguage(SupportedLanguages.French);
            localStorage.setItem(languageKey, SupportedLanguages.French);
          }}
        >
          <input type="radio" checked={language === 'fr'} readOnly />
          {' '}
          Francais
        </label>

        <br />

        <label
          onClick={() => {
            setLanguage(SupportedLanguages.English);
            localStorage.setItem(languageKey, SupportedLanguages.English);
          }}
        >
          <input type="radio" checked={language === 'en'} readOnly />
          {' '}
          English
        </label>
      </div>
    );
  }, [language]);


  return (
    <LanguageContext.Provider
      value={{
        languageSelectionInput,
        text: languages[language],
        monthName,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageWrapper;
