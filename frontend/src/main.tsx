import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css'; // This imports the Tailwind directives we created

ReactDOM.createRoot(document.getElementById('root')!).render(
  // React.StrictMode is deliberately removed here because in development mode
  // it causes components to mount twice, which instantly creates TWO WebSockets 
  // and breaks our Redis distributed lock testing logic.
  <App />
);






