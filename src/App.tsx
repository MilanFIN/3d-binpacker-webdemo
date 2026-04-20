import { useState, useRef, useEffect } from 'react';
import init, { WasmOptimizer } from 'rustport';
import { Viewer } from './components/Viewer';
import { Sidebar } from './components/Sidebar';
import type { SidebarConfig } from './components/Sidebar';
import { generateRandomBoxes, createBoxCloud } from './utils/boxUtils';
import type { CloudBox, JsResult } from './utils/boxUtils';
import './App.css';

const BIN_SIZE = { w: 100, h: 100, d: 100 };

/**
 * Main application component.
 */
function App() {
  const [boxes, setBoxes] = useState<CloudBox[]>([]);
  const [stats, setStats] = useState({ binCount: 1, score: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  
  const [config, setConfig] = useState<SidebarConfig>({
    solver: "best_fit_ems",
    populationSize: 32,
    eliteCount: 4
  });

  const optimizerRef = useRef<WasmOptimizer | null>(null);
  const prevConfigRef = useRef<SidebarConfig>(config);
  const colorsRef = useRef<Record<number, string>>({});

  // Initialize Wasm on mount
  useEffect(() => {
    init().then(() => setWasmReady(true));
  }, []);

  // Generate initial cloud
  useEffect(() => {
    const rawBoxes = generateRandomBoxes(300);
    const cloudValue = createBoxCloud(rawBoxes);
    
    // Store colors for consistency
    const colors: Record<number, string> = {};
    cloudValue.forEach(b => { colors[b.id] = b.color; });
    colorsRef.current = colors;
    
    setBoxes(cloudValue);
    // Reset optimizer on new box generation
    optimizerRef.current = null;
  }, []);

  const handleStartOptimization = async () => {
    if (!wasmReady) return;
    setIsRunning(true);

    try {
      // Check if config changed – if so, reset optimizer
      const configChanged = 
        config.solver !== prevConfigRef.current.solver ||
        config.populationSize !== prevConfigRef.current.populationSize ||
        config.eliteCount !== prevConfigRef.current.eliteCount;

      if (configChanged) {
        optimizerRef.current = null;
        prevConfigRef.current = config;
      }

      // Initialize optimizer if first run after reset
      if (!optimizerRef.current) {
        const jsConfig = {
          bin: { ...BIN_SIZE, max_weight: 0 },
          boxes: boxes.map(b => ({ id: b.id, w: b.w, h: b.h, d: b.d, weight: b.weight })),
          solver: config.solver,
          population_size: config.populationSize,
          elite_count: config.eliteCount,
          growing_bin: false,
          grow_axis: "y",
          rotation_axes: [0, 1, 2]
        };
        optimizerRef.current = new WasmOptimizer(jsConfig);
      }

      // Run one iteration
      const result: JsResult = optimizerRef.current.run_generation();

      // Update boxes with new positions and bin indices
      const nextBoxes: CloudBox[] = result.packed.map(pb => ({
        id: pb.id,
        w: pb.w,
        h: pb.h,
        d: pb.d,
        x: pb.x,
        y: pb.y,
        z: pb.z,
        binIndex: pb.bin_index,
        weight: pb.weight,
        color: colorsRef.current[pb.id] || '#ffffff'
      }));

      setBoxes(nextBoxes);
      setStats({ binCount: result.bin_count, score: result.score });
    } catch (err) {
      console.error("Optimization failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="app-container">
      <Viewer boxes={boxes} binCount={stats.binCount} binSize={BIN_SIZE} />
      
      {/* UI Overlay */}
      <div className="ui-overlay">
        <h1>Rustport Bin Packer</h1>
        <p>{boxes.length} Boxes Generated</p>
      </div>

      <Sidebar 
        onStartOptimization={handleStartOptimization}
        config={config}
        onConfigChange={(newPart) => setConfig({ ...config, ...newPart })}
        isRunning={isRunning}
        binCount={stats.binCount}
        score={stats.score}
      />
    </div>
  );
}

export default App;
