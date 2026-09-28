import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { iniciarWebVitals } from './webVitals.js'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// Desempenho real (Fase P.6): só no build de produção — em desenvolvimento o
// código não é minificado nem empacotado do jeito que o visitante recebe, e
// os números não diriam nada sobre o site publicado.
if (import.meta.env.PROD) iniciarWebVitals()
