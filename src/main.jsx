import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';import{AuthProvider}from'./contexts/AuthContext';import{DataProvider}from'./contexts/DataContext';import App from'./App';import'./styles/global.css';
const nativeApp=Boolean(window.Capacitor?.isNativePlatform?.());if(nativeApp)document.documentElement.classList.add('capacitor-native');
createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><DataProvider><App/></DataProvider></AuthProvider></BrowserRouter></React.StrictMode>);
if(!nativeApp&&'serviceWorker'in navigator&&import.meta.env.PROD)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));
