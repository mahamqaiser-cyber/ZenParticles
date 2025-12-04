
import React, { useMemo } from 'react';
import { useStore } from '../store';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Landmark } from '../types';

const HandMesh = ({ landmarks, color }: { landmarks: Landmark[], color: string }) => {
  const { viewport } = useThree();

  // Helper to map normalized coordinates (0..1) to 3D scene coordinates
  // We mirror X (0.5 - x) to match the "mirror" feel of the webcam 
  const mapCoord = (l: Landmark) => {
    // x: 0 (left of video) -> 1 (right of video)
    // In mirror mode, we want user's left hand (on left of screen) to be on left of 3D scene.
    // If user raises Left Hand, it appears on Left side of Mirror. 
    // MediaPipe x=0 is left edge of frame.
    // So 3D X should map 0 -> -width/2 and 1 -> width/2?
    // Let's try direct mapping: (x - 0.5) * width * -1 (to flip)
    const x = (0.5 - l.x) * viewport.width; 
    const y = (0.5 - l.y) * viewport.height;
    // Z is usually just depth, let's keep it slightly in front of particles (z=0) or use l.z if meaningful
    // MediaPipe l.z is relative to wrist. 
    const z = l.z * -2; // Scale z depth a bit
    return new THREE.Vector3(x, y, z);
  };

  const points = useMemo(() => landmarks.map(mapCoord), [landmarks, viewport]);
  
  // Connections
  const connections = [
    [0,1], [1,2], [2,3], [3,4], // Thumb
    [0,5], [5,6], [6,7], [7,8], // Index
    [0,9], [9,10], [10,11], [11,12], // Middle
    [0,13], [13,14], [14,15], [15,16], // Ring
    [0,17], [17,18], [18,19], [19,20], // Pinky
    [5,9], [9,13], [13,17], [0, 17] // Palm base
  ];

  return (
    <group>
        {/* Joints */}
        {points.map((p, i) => (
            <mesh key={i} position={p}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.8} />
            </mesh>
        ))}
        {/* Bones */}
        {connections.map(([start, end], i) => {
            const startP = points[start];
            const endP = points[end];
            // Calculate cylinder position, rotation, height
            const dist = startP.distanceTo(endP);
            const mid = startP.clone().add(endP).multiplyScalar(0.5);
            const direction = endP.clone().sub(startP).normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

            return (
                <mesh key={`bone-${i}`} position={mid} quaternion={quaternion}>
                    <cylinderGeometry args={[0.03, 0.03, dist, 8]} />
                    <meshStandardMaterial color={color} transparent opacity={0.4} />
                </mesh>
            );
        })}
    </group>
  );
};

export const HandVisualizer: React.FC = () => {
    const { handData, theme } = useStore();

    if (!handData.isPresent) return null;

    return (
        <group>
            {handData.leftHandLandmarks.length > 0 && (
                <HandMesh landmarks={handData.leftHandLandmarks} color={theme.secondaryColor} />
            )}
            {handData.rightHandLandmarks.length > 0 && (
                <HandMesh landmarks={handData.rightHandLandmarks} color={theme.secondaryColor} />
            )}
        </group>
    );
};
