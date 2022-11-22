import React, { createContext, useContext, useState } from 'react';

import { FaArrowLeft } from 'react-icons/fa';
import { RxGear } from 'react-icons/rx';

import { useNavigate } from 'react-router-dom';
import { TutorialContext } from './tutorialWrapper';
import { LanguageContext } from './useLanguage';

type Options = {
  noImages: boolean,
  lowDensity: boolean,
  noSmoothMovement: boolean,
  close: () => void,
}

export const OptionsContext = createContext<Options>({
  noImages: false,
  lowDensity: false,
  noSmoothMovement: false,
  close: () => { /** Does Nothing */ },
});

const noImagesKey = 'noImagesKey';
const lowDensityKey = 'lowDensityKey';
const noSmoothMovementKey = 'noSmoothMovementKey';
const useOptions = (showReturn: boolean) => {
  
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState(false);
  const { reset } = useContext(TutorialContext);
  const language = useContext(LanguageContext);
  const [noImages, setNoImages] = useState(
    (localStorage.getItem(noImagesKey) ?? 'false').toLocaleLowerCase() === 'true'
  );
  const [lowDensity, setLowDensity] = useState(
    (localStorage.getItem(lowDensityKey) ?? 'false').toLocaleLowerCase() === 'true'
  );
  const [noSmoothMovement, setNoSmoothMovement] = useState(
    (localStorage.getItem(noSmoothMovementKey) ?? 'false').toLocaleLowerCase() === 'true'
  );

  const options = (
    <>
      <div className="Options">
        {showReturn
          ? (
              <div onClick={() => navigate('/expeditions')}>
                <FaArrowLeft style={{ padding: '0.5rem 0.5rem' }} />
              </div>
            )
          : null}
  
        <div>
          <RxGear style={{ padding: '0.5rem 0.5rem' }} onClick={() => setShowOptions(prev => !prev)} />
        </div>
      </div>
      
      <div
        className="OptionsPopup"
        style={{ visibility: showOptions ? 'visible' : 'hidden' }}
        onTouchStart={event => event.stopPropagation()}
        onMouseDown={event => event.stopPropagation()}
      >
        <h3>{language.text.options}</h3>
        <h4>{language.text.language}</h4>
        {language.languageSelectionInput}
        <h4>{language.text.optionsPerformance}</h4>
        
        <label>
          <input
            type="checkbox"
            checked={noImages}
            onChange={() => {
              setNoImages(!noImages);
              localStorage.setItem(noImagesKey, (!noImages).toString());
            }}
          />
          
          {' '}
          {language.text.optionMapImages}
        </label>
  
        <label>
          <input
            type="checkbox"
            checked={lowDensity}
            onChange={() => {
              setLowDensity(!lowDensity);
              localStorage.setItem(lowDensityKey, (!lowDensity).toString());
            }}
          />
          
          {' '}
          {language.text.optionLowestDensity}
        </label>
  
        <label>
          <input
            type="checkbox"
            checked={noSmoothMovement}
            onChange={() => {
              setNoSmoothMovement(!noSmoothMovement);
              localStorage.setItem(noSmoothMovementKey, (!noSmoothMovement).toString());
            }}
          />
          
          {' '}
          {language.text.optionNoSmoothMovement}
        </label>
  
        <h4>{language.text.tutorial}</h4>
        
        <button
          style={{
            backgroundColor: '#7073b6',
            padding: '0.5rem',
            margin: '0.5rem',
            border: 'none',
            borderRadius: '0.3rem',
            cursor: 'pointer',
          }}
          onClick={() => {
            reset();
            setShowOptions(false);
          }}
        >
          {language.text.tutorialAgain}
        </button>
        
      </div>
    </>
  );

  return {
    menu: options,
    noImages,
    lowDensity,
    noSmoothMovement,
    close: () => setShowOptions(false),
  };
};

export default useOptions;
