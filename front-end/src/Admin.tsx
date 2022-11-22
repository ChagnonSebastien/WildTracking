import React, { FunctionComponent, useEffect, useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, User, signOut } from 'firebase/auth';
import { uploadBytesResumable, ref, getDownloadURL } from 'firebase/storage';
import { FaArrowLeft, FaTrash } from 'react-icons/fa';
import { GoSignOut } from 'react-icons/go';
import useGoogleServices from './useGoogleService';

import './Admin.css';

const provider = new GoogleAuthProvider();

const Admin: FunctionComponent = () => {
  
  const { auth, storage } = useGoogleServices();
  
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => auth.onAuthStateChanged(user => setUser(user)), [auth]);
  
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timeout);
  }, []);
  
  const [selectedImages, setSelectedImages] = useState<{
    preview?: string,
    file: File,
    progress: number,
    isProcessing: boolean,
    selected: boolean,
  }[]>([]);
  
  let controls;
  if (loading || selectedImages.reduce((prev, image) => prev || image.isProcessing, false)) {
    controls = (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="loader" style={{ width: '1rem', height: '1rem' }} />
      </div>
    );
  }
  else if (user === null) {
    controls = (
      <div
        className="Button"
        onClick={() => {
          setLoading(true);
          signInWithPopup(auth, provider).finally(() => setLoading(false));
        }}
      >
        Login
      </div>
    );
  }
  else if (selectedImages.length === 0) {
    controls = (
      <>
        <label className="Button">
          <input
            type="file"
            multiple
            accept="image/jpeg"
            onChange={event => {
              if (event.target === null || event.target.files === null) return;
              
              const images = [];
              for (let i = 0; i < event.target.files.length; i++) {
                const file = event.target.files.item(i);
                if (file === null) continue;
                images.push({ file, progress: 0, isProcessing: false, selected: false });
              }
              
              setSelectedImages(images);
    
              images.forEach(image => {
                const reader = new FileReader();
      
                reader.addEventListener('load', (event: ProgressEvent<FileReader>) => {
                  if (event.target === null || event.target.result === null) return;
                  const result = event.target.result as string;
                  setSelectedImages(prev => prev.map(contender => (
                    image.file.name === contender.file.name
                      ? { ...contender, preview: result }
                      : contender
                  )));
                });
      
                reader.readAsDataURL(image.file);
              });
            }}
          />
          Select Images
        </label>
  
        <div
          className="Button"
          onClick={() => signOut(auth)}
        >
          <GoSignOut />
        </div>
      </>
    );
  }
  else {
    controls = (
      <>
        <div
          className="Button"
          onClick={() => {
            setSelectedImages(images => images.map(image => ({ ...image, isProcessing: true })));
            
            selectedImages.forEach(image => {
              const imageRef = ref(storage, `pictures/${image.file.name}`);
              getDownloadURL(imageRef)
                .then(() => {
                  setSelectedImages(prev => prev.filter(i => i.file.name !== image.file.name));
                })
                .catch(error => {
                  if (error.code !== 'storage/object-not-found') {
                    console.error(error);
                    setSelectedImages(prev => prev.map(i => {
                      return i.file.name === image.file.name ? { ...i, progress: -1, isProcessing: false } : i;
                    }));
                    return;
                  }
                  uploadBytesResumable(imageRef, image.file).on(
                    'state_changed',
                    snapshot => {
                      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                      setSelectedImages(prev => prev.map(i => {
                        return i.file.name === image.file.name ? { ...i, progress } : i;
                      }));
                    },
                    error => {
                      console.error(error);
                      setSelectedImages(prev => prev.map(i => {
                        return i.file.name === image.file.name ? { ...i, progress: -1, isProcessing: false } : i;
                      }));
                    },
                    () => {
                      setSelectedImages(prev => prev.filter(i => i.file.name !== image.file.name));
                    }
                  );
                });
            });
          }}
        >
          Upload
        </div>
        
        <div
          className="Button"
          onClick={() => {
            setSelectedImages([]);
          }}
        >
          <FaArrowLeft />
        </div>
      </>
    );
  }
  
  return (
    <div className="Admin">
      <div className="Container">
        <div className="Controls">
          {controls}
        </div>
        
        <div className="Gallery">
          {selectedImages.map(image => (
            <div key={image.file.name} className="ImageBox">
              {image.selected && !image.isProcessing
                ? (
                    <div
                      className="Remove"
                      onClick={() => {
                        setSelectedImages(prev => prev.filter(i => i.file.name !== image.file.name));
                      }}
                    >
                      <FaTrash color="red" />
                    </div>
                  )
                : null}
              
              <img
                src={image.preview}
                alt={`Preview of ${image.file.name}`}
                onClick={() => {
                  setSelectedImages(prev => prev.map(i => ({
                    ...i,
                    selected: i.file.name === image.file.name,
                  })));
                }}
              />
              
              <div
                className="ProgressBar"
                style={{
                  width: `${image.progress === -1 ? 100 : image.progress}%`,
                  ...(image.progress === -1 ? { backgroundColor: 'red' } : {})
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;
