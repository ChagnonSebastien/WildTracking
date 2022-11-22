import React, { ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore/lite';
import useGoogleServices from './useGoogleService';
import ExpeditionTrail from './ExpeditionTrail';
import Expedition from './Expedition';
import Loading from './Loading';

import './App.css';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { LanguageContext } from './useLanguage';
import useOptions, { OptionsContext } from './useOptions';

const App = () => {
  const { firestore } = useGoogleServices();

  const navigate = useNavigate();
  const { expeditionId } = useParams<{ expeditionId: string }>();

  const [expeditions, setExpeditions] = useState<Expedition[] | null>(null);
  const { text } = useContext(LanguageContext);

  useEffect(() => {
    const expeditionsRef = collection(firestore, 'expeditions');
    const expeditionsQuery = query(expeditionsRef, where('visible', '==', true));
    getDocs(expeditionsQuery)
      .then(expeditionsSnapshot => {
        const data = expeditionsSnapshot.docs.map<Expedition>(e => {
          const data = e.data();
          return {
            id: e.id,
            from: data.from,
            to: data.to,
            description: data.description,
            name: data.name,
            image: data.image,
          };
        });
        setExpeditions(data);
      });
  }, [firestore]);

  const expeditionTiles = useMemo(() => {
    return expeditions?.sort((b, a) => {
      return new Date(b.from).getTime() - new Date(a.from).getTime();
    }).map(expedition => (
      <div
        key={`ExpeditionTile-${expedition.id}`}
        className="Card"
        onClick={() => navigate(`${expedition.id}`)}
      >
        <img src={expedition.image} alt={expedition.name} />

        <div
          className="Text"
          style={{
            padding: '1rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
          }}
        >
          <h3>{expedition.name}</h3>
          <p>{expedition.description}</p>
        </div>
      </div>
    ));
  }, [expeditions, navigate]);

  const currentExpedition = useMemo(
    () => expeditions?.find(e => e.id === expeditionId),
    [expeditionId, expeditions]
  );

  const { menu, ...options } = useOptions(typeof currentExpedition !== 'undefined');

  let contents: ReactNode;
  if (expeditions === null) {
    contents = <Loading text={text.loadingRoute} />;
  }
  else if (typeof currentExpedition === 'undefined') {
    contents = typeof expeditionId !== 'undefined'
      ? <Navigate to="/expeditions" replace />
      : (
          <div className={`Expeditions${options.noSmoothMovement ? ' NoTransition' : ''}`}>
            {menu}

            <div className="ExpeditionsWrapper">
              {expeditionTiles}
            </div>
          </div>
        );
  }
  else {
    contents = (
      <ExpeditionTrail expedition={currentExpedition} className={options.noSmoothMovement ? 'NoTransition' : undefined}>
        {menu}
      </ExpeditionTrail>
    );
  }



  return (
    <div
      style={{ width: '100%', height: '100%' }}
      onTouchStart={options.close}
      onMouseDown={options.close}
    >
      <OptionsContext.Provider value={options}>
        {contents}
      </OptionsContext.Provider>
    </div>
  );
};

export default App;
