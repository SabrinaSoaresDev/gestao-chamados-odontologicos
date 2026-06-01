// src/utils/browserDetect.js
export const browserInfo = {
  isModern: () => {
    const userAgent = navigator.userAgent;
    const isChrome = /Chrome\/([0-9]+)/.test(userAgent);
    const chromeVersion = isChrome ? parseInt(RegExp.$1) : 0;
    const isFirefox = /Firefox\/([0-9]+)/.test(userAgent);
    const firefoxVersion = isFirefox ? parseInt(RegExp.$1) : 0;
    
    return (chromeVersion >= 60) || (firefoxVersion >= 55) || 
           /Edge/.test(userAgent) || /Safari/.test(userAgent);
  },
  
  // Verifica se suporta CSS Grid
  supportsGrid: () => {
    return typeof document.createElement('div').style.grid !== 'undefined';
  },
  
  // Verifica se suporta Flexbox
  supportsFlex: () => {
    return typeof document.createElement('div').style.flex !== 'undefined';
  }
};