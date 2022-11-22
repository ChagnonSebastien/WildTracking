import { useJsApiLoader } from '@react-google-maps/api';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore/lite';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_DATABASE_URL,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const useGoogleServices = () => {

  const { isLoaded: isMapsApiLoaded } = useJsApiLoader({
    googleMapsApiKey: firebaseConfig.apiKey ?? '',
    id: 'google-map-script',
    mapIds: [process.env.REACT_APP_MAPS_ID ?? ''],
  });

  return {
    isMapsApiLoaded,
    firestore,
    auth,
    storage,
  };
};

export default useGoogleServices;
