
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { generateParticles, COUNT } from '../utils/math';
import { Landmark } from '../types';

export const Particles: React.FC = () => {
  const points = useRef<THREE.Points>(null);
  const { currentShape, theme, handData } = useStore();
  const { viewport } = useThree();
  
  // Generate target positions based on current shape
  const targetPositions = useMemo(() => generateParticles(currentShape), [currentShape]);
  
  // Current positions buffer
  const currentPositions = useMemo(() => new Float32Array(COUNT * 3), []);
  
  // Initialize current positions
  useMemo(() => {
    for (let i = 0; i < COUNT * 3; i++) {
        currentPositions[i] = (Math.random() - 0.5) * 10;
    }
  }, [currentPositions]);

  // Helper to map hand landmarks to 3D space
  // Matches HandVisualizer logic
  const getHandPos3D = (landmarks: Landmark[]) => {
      if (!landmarks || landmarks.length === 0) return null;
      // Use index 9 (Middle Finger MCP) as center of palm interaction
      const l = landmarks[9]; 
      return {
          x: (0.5 - l.x) * viewport.width,
          y: (0.5 - l.y) * viewport.height,
          z: l.z * -2 // Depth scaling
      };
  };

  useFrame((state, delta) => {
    if (!points.current) return;

    const tension = (handData.leftHandOpenness + handData.rightHandOpenness) / 2;
    // Max pinch from either hand to control scale tightness
    const maxPinch = Math.max(handData.leftHandPinch, handData.rightHandPinch);
    
    // Scale multiplier: Open hands expand the whole shape
    const targetScale = 1 + tension * 1.5; 
    
    const positions = points.current.geometry.attributes.position.array as Float32Array;
    
    const time = state.clock.getElapsedTime();
    const speed = theme.speed;

    const leftHandPos = getHandPos3D(handData.leftHandLandmarks);
    const rightHandPos = getHandPos3D(handData.rightHandLandmarks);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      
      // Target position
      const tx = targetPositions[i3];
      const ty = targetPositions[i3 + 1];
      const tz = targetPositions[i3 + 2];

      // Current position
      let cx = positions[i3];
      let cy = positions[i3 + 1];
      let cz = positions[i3 + 2];

      // Base movement: Lerp towards target shape
      const noise = Math.sin(time * speed + i) * 0.05 * (1 + tension * 3);
      
      // If holding (pinched), snap tighter to shape. If relaxed, float more.
      const lerpFactor = 2.0 * delta * (1 + maxPinch * 2);

      cx += (tx * targetScale - cx) * lerpFactor + noise;
      cy += (ty * targetScale - cy) * lerpFactor + noise;
      cz += (tz * targetScale - cz) * lerpFactor + noise;

      // INTERACTIVE PHYSICS
      // Apply forces from hands
      
      // Left Hand Logic
      if (leftHandPos) {
          const dx = cx - leftHandPos.x;
          const dy = cy - leftHandPos.y;
          const dz = cz - leftHandPos.z;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          const radius = 2.5;

          if (dist < radius) {
              const force = (radius - dist) / radius; // 0 to 1 strength
              if (handData.leftHandPinch > 0.8) {
                  // HOLD: Attract (Gravity Well)
                  cx -= dx * force * 5.0 * delta;
                  cy -= dy * force * 5.0 * delta;
                  cz -= dz * force * 5.0 * delta;
              } else {
                  // TOUCH: Repel (Force Field)
                  cx += dx * force * 8.0 * delta;
                  cy += dy * force * 8.0 * delta;
                  cz += dz * force * 8.0 * delta;
              }
          }
      }

      // Right Hand Logic
      if (rightHandPos) {
          const dx = cx - rightHandPos.x;
          const dy = cy - rightHandPos.y;
          const dz = cz - rightHandPos.z;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          const radius = 2.5;

          if (dist < radius) {
              const force = (radius - dist) / radius;
              if (handData.rightHandPinch > 0.8) {
                  // HOLD: Attract
                  cx -= dx * force * 5.0 * delta;
                  cy -= dy * force * 5.0 * delta;
                  cz -= dz * force * 5.0 * delta;
              } else {
                  // TOUCH: Repel
                  cx += dx * force * 8.0 * delta;
                  cy += dy * force * 8.0 * delta;
                  cz += dz * force * 8.0 * delta;
              }
          }
      }

      // Rotate whole system slightly
      const rotSpeed = 0.1 * delta * (1 + tension);
      const cos = Math.cos(rotSpeed);
      const sin = Math.sin(rotSpeed);
      
      const nx = cx * cos - cz * sin;
      const nz = cx * sin + cz * cos;
      cx = nx;
      cz = nz;

      positions[i3] = cx;
      positions[i3 + 1] = cy;
      positions[i3 + 2] = cz;
    }

    points.current.geometry.attributes.position.needsUpdate = true;
    
    // Material updates
    if (points.current.material instanceof THREE.PointsMaterial) {
        points.current.material.size = theme.particleSize * (1 + maxPinch);
        points.current.material.color.lerp(new THREE.Color(theme.primaryColor), 0.1);
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={currentPositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={theme.particleSize}
        color={theme.primaryColor}
        sizeAttenuation
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
