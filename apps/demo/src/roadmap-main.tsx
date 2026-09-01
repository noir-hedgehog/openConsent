import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Roadmap from './Roadmap';
import './roadmap.css';

createRoot(document.getElementById('root')!).render(<StrictMode><Roadmap /></StrictMode>);
