import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PathfindingVisualizer from './pathfinding_visualizer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PathfindingVisualizer />
  </StrictMode>
)