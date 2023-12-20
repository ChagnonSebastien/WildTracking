import React, {
  FunctionComponent,
  ReactElement, useContext, ReactNode, useMemo
} from 'react';
import { LanguageContext } from './useLanguage';
import useTrailLoader from './useTrailLoader';

import './Gallery.css';
import Expedition from './Expedition';
import { convertDMS } from './Math';
import { FaWindowClose } from 'react-icons/fa';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Loading from './Loading';
import Image from './Image';

const bucketRoot = process.env.REACT_APP_BUCKET_ROOT;


type Props = {
  expedition: Expedition,
  children?: ReactElement,
  className?: string,
}
const Gallery: FunctionComponent<Props> = ({ expedition, children = null, className }) => {

  const { detailedPath } = useTrailLoader(new Date(expedition.from).getTime(), new Date(expedition.to).getTime());

  const navigate = useNavigate();

  const images = useMemo(() => {
    return detailedPath?.reduce<Image[]>((prev, day) => {
      return [...prev, ...day.images];
    }, []);
  }, [detailedPath]);

  const { index } = useParams<{ index?: string }>();

  const { text } = useContext(LanguageContext);

  if (typeof detailedPath === 'undefined' || typeof images === 'undefined') {
    return <Loading text={text.loadingRoute} />;
  }

  let overlay = null;
  if (typeof index !== 'undefined') {
    const i = Number.parseInt(index);
    if (!(Number.isNaN(i) || i >= images.length || i < 0)) {
      overlay = (
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            zIndex: 100,
            backgroundColor: 'black',
            color: 'white',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <img
              style={{ objectFit: 'contain', width: '100%', height: 'calc(100% - 5rem)' }}
              src={`${bucketRoot}/pictures/${images[i].src}.jpg`}
              alt={`${text.fullResImageOf} ${images[i].src}`}
            />

            <div
              style={{
                height: '5rem',
                padding: '0.5rem 2rem',
                zIndex: 200,
                display: 'flex',
                justifyContent: 'space-evenly',
                alignItems: 'center',
                gap: '0 2rem',
              }}
            >

              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <div><strong>{text.position}:&nbsp;</strong></div>

                <div>
                  {convertDMS(
                    images[i].pos.lat,
                    images[i].pos.lng
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <div><strong>{text.date}:&nbsp;</strong></div>

                <div>
                  {images[i]
                    .timestamp.toLocaleDateString()
                    .replace(/ /g, '\u00a0')}

                  {' '}

                  {images[i]
                    .timestamp.toLocaleTimeString()
                    .replace(/ /g, '\u00a0')}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'black',
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              height: '1rem',
              cursor: 'pointer',
            }}
          >
            <FaWindowClose
              style={{ transform: 'translate(0, -2px)' }}
              size="20px"
              onClick={() => navigate(-1)}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="GallCont">
      {children}
      {overlay}

      <div className="Gallery">
        {
          images.map<ReactNode>((image, i) => {
            return (
              <div key={`${bucketRoot}/gallery/${image.src}.jpg`} className="ImageBox">
                <img
                  src={`${bucketRoot}/gallery/${image.src}.jpg`}
                  alt={`${text.fullResImageOf} ${image.src}`}
                  onClick={() => navigate(i.toString())}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Gallery;
