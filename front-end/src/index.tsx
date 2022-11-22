import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import Admin from './Admin';
import App from './App';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import TutorialWrapper from './tutorialWrapper';
import LanguageWrapper from './useLanguage';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
const app = <App />;
root.render(
  <StrictMode>
    <LanguageWrapper>
      <TutorialWrapper>
        <BrowserRouter>
          <Routes>
            <Route path="/">
              <Route index element={<Navigate to="/expeditions" replace />} />
              <Route path="expeditions/:expeditionId/images/:day/:index" element={app} />
              <Route path="expeditions/:expeditionId" element={app} />
              <Route path="expeditions" element={app} />
              <Route path="admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/expeditions" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TutorialWrapper>
    </LanguageWrapper>
  </StrictMode>
);
