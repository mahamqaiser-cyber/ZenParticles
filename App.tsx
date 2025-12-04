
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Particles } from './components/Particles';
import { HandTracker } from './components/HandTracker';
import { HandVisualizer } from './components/HandVisualizer';
import { Controls } from './components/Controls';

const App: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-black">
      <HandTracker />
      
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]} // Handle high DPI screens
        gl={{ antialias: false }} // Performance boost for particles
      >
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        <Suspense fallback={null}>
            <Particles />
            <HandVisualizer />
            {/* Soft environment reflection if we used standard materials, gives nice mood even for basic points */}
            <Environment preset="city" /> 
        </Suspense>
        
        <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            autoRotate 
            autoRotateSpeed={0.5} 
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 3}
        />
      </Canvas>

      <Controls />
    </div>
  );
};

export default App;
