import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { expose } from './debug';
import { F } from './domain/data';
import { sim } from './state/sim';
import { useStore } from './state/store';
import './styles.css';

expose('store', useStore);
expose('sim', sim);
expose('formations', F);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
