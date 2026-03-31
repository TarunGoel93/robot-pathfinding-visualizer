import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PathfindingVisualizer from './pathfinding_visualizer.jsx'
// import FloorPlanPathfinder from './FloorPlanPathfinder.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PathfindingVisualizer />
  </StrictMode>
)

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <FloorPlanPathfinder />
//   </StrictMode>
// )