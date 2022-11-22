import React, { ReactElement, ReactNode, createContext, useMemo, useState, useContext, } from 'react';

import './ExpeditionTrail.css';
import './Timeline.css';
import { LanguageContext } from './useLanguage';


const tutorialStepKey = 'TUTORIAL_STEP';

type Context = {
  tutorial: ReactNode,
  tutorialStep: number,
  reset: () => void,
}

export const TutorialContext = createContext<Context>({
  tutorial: null,
  tutorialStep: 0,
  reset: () => { /** Does nothing */ },
});
const TutorialWrapper = ({ children }: {children: ReactElement}) => {

  const [tutorialStep, setTutorialStep] = useState(parseInt(localStorage.getItem(tutorialStepKey) ?? '0'));
  const [tutorialSkip, setTutorialSkip] = useState(false);
  const [tutorialSaved, setTutorialSaved] = useState(parseInt(localStorage.getItem(tutorialStepKey) ?? '0'));
  
  const { text: language } = useContext(LanguageContext);
  
  const tutorial = useMemo(() => {
    if (tutorialStep >= 3) {
      return null;
    }

    return (
      <div
        onMouseDown={event => event.stopPropagation()}
        onTouchStart={event => event.stopPropagation()}
      >
        {tutorialStep === 0
          ? (
              <div
                className="InterfaceInstruction"
                style={{
                  bottom: 'calc(20vh + 1rem)',
                  left: '1rem',
                }}
              >
                <p>{language.interface} - {language.part} 1/3</p>
                <p>{language.tut_binding}</p>
                <p><i>{language.onDesktop}:</i><br />{language.tut_mouse}</p>
                <p><i>{language.onMobile}:</i><br />{language.tut_finger}</p>
                <p><i>{language.youCanTry}</i></p>
                <button onClick={() => setTutorialStep(prev => prev + 1)}>{language.understood}</button>
              </div>
            )
          : null}

        {tutorialStep === 1
          ? (
              <div
                className="InterfaceInstruction"
                style={{
                  bottom: 'calc(20vh + 4.65rem)',
                  right: '1rem',
                }}
              >
                <p>{language.interface} - {language.part} 2/3</p>
                <p>{language.tut_moveRestriction}</p>
                <p>{language.tut_unbinding}</p>
                <p><i>{language.youCanTry}</i></p>
                <button onClick={() => setTutorialStep(prev => prev + 1)}>{language.understood}</button>
              </div>
            )
          : null}

        {tutorialStep === 2
          ? (
              <div
                className="InterfaceInstruction"
                style={{
                  bottom: 'calc(20vh + 4rem)',
                  left: 0,
                  right: 0,
                  margin: '0 auto',
                }}
              >
                <p>{language.interface} - {language.part} 3/3</p>
                <p>{language.tut_elevation}</p>
                <p><i>{language.youCanTry}</i></p>
  
                {tutorialSaved < tutorialStep + 1
                  ? (
                      <p>
                        <label>
                          <input
                            type="checkbox"
                            checked={tutorialSkip}
                            onChange={() => setTutorialSkip(prev => !prev)}
                          />

                          {language.tutorialHideSubsequent}
                        </label>
                      </p>
                    )
                  : null
                }

                <button
                  onClick={() => {
                    if (tutorialSkip) {
                      localStorage.setItem(tutorialStepKey, `${tutorialStep + 1}`);
                      setTutorialSaved(tutorialStep + 1);
                    }
                    setTutorialStep(prev => prev + 1);
                  }}
                >
                  {language.understood}
                </button>
              </div>
            )
          : null}
      </div>
    );
  }, [
    language.interface,
    language.onDesktop,
    language.onMobile,
    language.part,
    language.tut_binding,
    language.tut_elevation,
    language.tut_finger,
    language.tut_mouse,
    language.tut_moveRestriction,
    language.tut_unbinding,
    language.tutorialHideSubsequent,
    language.understood,
    language.youCanTry,
    tutorialSaved,
    tutorialSkip,
    tutorialStep
  ]);

  return (
    <TutorialContext.Provider
      value={{ tutorial, tutorialStep, reset: () => setTutorialStep(0) }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export default TutorialWrapper;

