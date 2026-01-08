import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import App from './App.jsx'


const domNode= document.getElementById('root');
const root = createRoot(domNode).render(
  <StrictMode>
    <App />
  </StrictMode>
)