import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CookieDeclaration from './CookieDeclaration';
import './cookie-declaration.css';

createRoot(document.getElementById('root')!).render(<StrictMode><CookieDeclaration /></StrictMode>);
