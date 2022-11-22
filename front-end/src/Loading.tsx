import React, { FunctionComponent } from 'react';

import './Loading.css';


type Props = {
  text: string,
}

const Loading: FunctionComponent<Props> = ({ text }) => (
  <div className="LoadingScreen">
    <div className="loader" />
    {text}
  </div>
);

export default Loading;
