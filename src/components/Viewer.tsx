import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Edges } from '@react-three/drei';
import type { CloudBox, CloudSphere } from '../utils/boxUtils';

interface ViewerProps {
  shape?: 'box' | 'sphere';
  boxes: CloudBox[];
  spheres?: CloudSphere[];
  binCount: number;
  binSize: { w: number; h: number; d: number };
  binRadius?: number;
}

const BIN_SPACING = 50;

/**
 * A fullscreen Three.js viewer component.
 */
export function Viewer({ shape = 'box', boxes, spheres = [], binCount, binSize }: ViewerProps) {
  // Array of bin indices to map over for rendering wireframes
  const binIndices = Array.from({ length: Math.max(1, binCount) }, (_, i) => i);

  // Dynamic camera positioning based on bin size
  const camX = binSize.w / 2;
  const camY = binSize.h * 1.2;
  const camZ = Math.max(binSize.d * 3, 600);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[camX, camY, camZ]} fov={50} />
        <OrbitControls makeDefault target={[binSize.w / 2, binSize.h / 2, binSize.d / 2]} />

        <ambientLight intensity={0.5} />
        <pointLight position={[200, 600, 200]} intensity={2} castShadow />
        <pointLight position={[-200, 200, -200]} intensity={0.5} />

        {/* Render multiple bins (only outer edges visible) */}
        {binIndices.map((bi) => {
          const xOffset = bi * (binSize.w + BIN_SPACING);
          return (
            <group key={`bin-${bi}`} position={[xOffset, 0, 0]}>
              <mesh position={[binSize.w / 2, binSize.h / 2, binSize.d / 2]}>
                <boxGeometry args={[binSize.w, binSize.h, binSize.d]} />
                <meshBasicMaterial visible={false} />
                <Edges color="#888888" threshold={15} />
              </mesh>
            </group>
          );
        })}

        {/* Render the items based on shape */}
        {shape === 'box' ? (
          boxes.map((box) => {
            const xOffset = (box.binIndex ?? 0) * (binSize.w + BIN_SPACING);
            return (
              <mesh 
                key={`${box.id}-${box.x}-${box.y}`} 
                position={[xOffset + box.x + box.w/2, box.y + box.h/2, box.z + box.d/2]} 
                castShadow 
                receiveShadow
              >
                <boxGeometry args={[box.w, box.h, box.d]} />
                <meshStandardMaterial 
                  color={box.color} 
                  transparent 
                  opacity={0.85} 
                  roughness={0.2} 
                  metalness={0.1} 
                />
                <Edges color="#ffffff" threshold={15} />
              </mesh>
            );
          })
        ) : (
          spheres.map((sphere) => {
            const xOffset = (sphere.binIndex ?? 0) * (binSize.w + BIN_SPACING);
            return (
              <mesh 
                key={`${sphere.id}-${sphere.x}-${sphere.y}`} 
                // spheres are centered at their x,y,z returned by solver
                position={[xOffset + sphere.x, sphere.y, sphere.z]} 
                castShadow 
                receiveShadow
              >
                <sphereGeometry args={[sphere.radius, 32, 32]} />
                <meshStandardMaterial 
                  color={sphere.color} 
                  transparent 
                  opacity={0.85} 
                  roughness={0.2} 
                  metalness={0.1} 
                />
              </mesh>
            );
          })
        )}

        <Grid 
          infiniteGrid 
          fadeDistance={2000} 
          sectionSize={100} 
          sectionThickness={1} 
          sectionColor="#333333"
          cellSize={20}
          cellThickness={0.5}
          cellColor="#222222"
        />

        <axesHelper args={[200]} />
      </Canvas>
    </div>
  );
}
