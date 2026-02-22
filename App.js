import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Canvas, useFrame } from '@react-three/fiber';
import { Icosahedron } from '@react-three/drei';
import { soundEngine } from './SoundEngine';
import './index.css';

// --- CONFIGURAZIONE API ---
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://smart-core.onrender.com";
const SESSION_ID = "REL-OPP-002"; // ID Fisso per il test

// --- COMPONENTE 3D: Dodecaedro Frattale ---
const FractalMind = ({ complexity }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    meshRef.current.rotation.x += 0.005;
    meshRef.current.rotation.y += 0.005;
    // Effetto respiro basato sulla complessità
    const scale = 1 + Math.sin(state.clock.elapsedTime) * 0.05 + (complexity * 0.02);
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <Icosahedron args={[1, complexity]} ref={meshRef}>
      <meshPhysicalMaterial 
        color="#FFFFFF" 
        wireframe={true}
        emissive="#111111"
        roughness={0}
        metalness={0.8}
      />
    </Icosahedron>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  // Stato Globale
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [consoleLog, setConsoleLog] = useState([]);
  const [complexity, setComplexity] = useState(0); // Per il 3D
  const [dragState, setDragState] = useState({ active: false, source: null, mouseX: 0, mouseY: 0 });
  const [startTime, setStartTime] = useState(0);

  // Inizializzazione
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await axios.get(`${API_BASE}/session/new/${SESSION_ID}`);
        // Posizioniamo i nodi in un cerchio iniziale per il layout
        const fetchedNodes = res.data.nodes.map((name, i) => ({
          id: name,
          x: 100 + i * 150, // Layout semplice orizzontale per start
          y: 200 + (i % 2) * 50
        }));
        
        setNodes(fetchedNodes);
        
        // Carichiamo premesse esistenti se presenti
        if (res.data.premises) {
             setEdges(res.data.premises.map((p, i) => ({
                id: `premise-${i}`,
                source: p.source,
                target: p.target,
                relation: p.relation,
                isValid: true,
                isStatic: true
            })));
        }

        setStartTime(performance.now());
        setLog("> SYSTEM ONLINE. SESSION: " + SESSION_ID);
      } catch (e) {
        setLog("> ERROR: CANNOT CONNECT TO CORE RIE.", true);
      }
    };
    initSession();
  }, []);

  // Logger Helper
  const setLog = (text, isError = false) => {
    setConsoleLog(prev => [...prev.slice(-4), { text, isError, id: Date.now() }]);
  };

  // --- GESTIONE DRAG & DROP DEI NODI ---
  const handleNodeDragStart = (e, nodeId) => {
    // Logica di trascinamento nodo (semplificata per brevità)
    // In un setup reale useremmo react-use-gesture
  };

  // --- GESTIONE CREAZIONE VETTORI (GHOST LOGIC) ---
  const startConnection = (nodeId) => {
    soundEngine.init(); // Attiva audio al primo tocco
    soundEngine.startDrone();
    setDragState({ active: true, source: nodeId, mouseX: 0, mouseY: 0 });
  };

  const updateDrag = (e) => {
    if (dragState.active) {
        setDragState(prev => ({ ...prev, mouseX: e.clientX, mouseY: e.clientY }));
    }
  };

  const endConnection = async (targetNodeId) => {
    if (!dragState.active) return;
    const sourceId = dragState.source;
    
    setDragState({ ...dragState, active: false });

    if (sourceId === targetNodeId) return;

    // Default relation per il prototipo: GREATER (L'UI completa avrebbe un selettore radiale)
    const relation = "GREATER"; 
    
    // Optimistic UI: Disegna subito
    const tempEdgeId = `temp-${Date.now()}`;
    const newEdge = { id: tempEdgeId, source: sourceId, target: targetNodeId, relation, isValid: 'pending' };
    setEdges(prev => [...prev, newEdge]);

    // PREPARAZIONE PAYLOAD
    const thinkingTime = performance.now() - startTime;
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetNodeId);
    
    // Calcolo gerarchia
    const isVertical = Math.abs(sourceNode.y - targetNode.y) > 50;
    
    try {
      const res = await axios.post(`${API_BASE}/validate-edge`, {
        session_id: SESSION_ID,
        user_edge: { source: sourceId, target: targetNodeId, relation },
        thinking_time_ms: thinkingTime,
        spatial_data: {
            is_highest_node: sourceNode.y < targetNode.y,
            vertical_bias: isVertical
        }
      });

      if (res.data.is_valid) {
        // SUCCESSO
        soundEngine.playSuccess(complexity);
        setComplexity(prev => Math.min(prev + 1, 5)); // Aumenta dettagli 3D
        setEdges(prev => prev.map(e => e.id === tempEdgeId ? { ...e, isValid: true } : e));
        setLog(`> CONNECTION ESTABLISHED: ${sourceId} -> ${targetNodeId}`);
      } else {
        // ERRORE (Logic Flash)
        soundEngine.playError();
        setLog(`> LOGIC CONTRADICTION: ${res.data.logic_path}`, true);
        
        // Animazione Errore e Rimozione
        setTimeout(() => {
             setEdges(prev => prev.filter(e => e.id !== tempEdgeId));
        }, 800);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- RENDERING ---
  return (
    <div className="workspace" onMouseMove={updateDrag} onMouseUp={() => setDragState({...dragState, active: false})}>
      
      {/* 1. GRIGLIA SFONDO */}
      <div className="workspace-grid" />

      {/* 2. MAPPA DEL POTENZIALE (3D) */}
      <div id="fractal-container">
        <Canvas camera={{ position: [0, 0, 3] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <FractalMind complexity={complexity} />
        </Canvas>
      </div>

      {/* 3. VETTORI (SVG LAYER) */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="20" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#FFF" />
          </marker>
        </defs>
        
        {/* Vettore in trascinamento */}
        {dragState.active && (
           <line 
             x1={nodes.find(n => n.id === dragState.source).x + 60} 
             y1={nodes.find(n => n.id === dragState.source).y + 20} 
             x2={dragState.mouseX} 
             y2={dragState.mouseY} 
             stroke="#666" strokeWidth="2" strokeDasharray="5,5" 
           />
        )}

        {/* Vettori esistenti */}
        {edges.map(e => {
            const s = nodes.find(n => n.id === e.source);
            const t = nodes.find(n => n.id === e.target);
            if (!s || !t) return null;
            
            let className = "vector-line";
            if (e.isValid === true) className += " valid";
            if (e.isValid === 'pending') className += " pending";
            if (e.relation === 'DURING') className += " pulse";
            
            return (
                <line 
                    key={e.id}
                    x1={s.x + 60} y1={s.y + 20}
                    x2={t.x + 60} y2={t.y + 20}
                    className={className}
                    markerEnd="url(#arrow)"
                />
            );
        })}
      </svg>

      {/* 4. NODI GHOST */}
      {nodes.map(node => (
        <div 
            key={node.id} 
            className="node" 
            style={{ left: node.x, top: node.y }}
            onMouseDown={(e) => startConnection(node.id)}
            onMouseUp={(e) => endConnection(node.id)}
        >
          {node.id}
        </div>
      ))}

      {/* 5. DEEP-WHY CONSOLE */}
      <div className="console-log">
        {consoleLog.map(log => (
            <div key={log.id} className={`console-entry ${log.isError ? 'console-error' : ''}`}>
                {log.text}
            </div>
        ))}
      </div>

    </div>
  );
}
