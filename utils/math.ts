import * as THREE from 'three';
import { ShapeType } from '../types';

export const COUNT = 8000;

export const generateParticles = (type: ShapeType): Float32Array => {
  const positions = new Float32Array(COUNT * 3);
  const colorAttribute = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    let x = 0, y = 0, z = 0;

    switch (type) {
      case ShapeType.SPHERE: {
        const r = 2 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        break;
      }
      case ShapeType.HEART: {
        // Parametric heart
        const t = Math.random() * Math.PI * 2;
        const u = Math.random() * Math.PI;
        // 3D Heart approximation
        x = 16 * Math.pow(Math.sin(t), 3);
        y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        z = (Math.random() - 0.5) * 5; 
        
        // Scale down
        x *= 0.15;
        y *= 0.15;
        z *= 0.5;
        break;
      }
      case ShapeType.FLOWER: {
        const rMax = 3;
        const r = Math.sqrt(Math.random()) * rMax;
        const theta = Math.random() * Math.PI * 2;
        // Petals modulation
        const petals = 6;
        const modulation = 1 + 0.5 * Math.sin(petals * theta);
        
        x = r * Math.cos(theta) * modulation;
        y = r * Math.sin(theta) * modulation;
        z = (Math.random() - 0.5) * 1.5 * (1 - r/rMax); // Taper at edges
        break;
      }
      case ShapeType.SATURN: {
        if (Math.random() > 0.4) {
          // Ring
          const angle = Math.random() * Math.PI * 2;
          const radius = 3 + Math.random() * 2;
          x = Math.cos(angle) * radius;
          z = Math.sin(angle) * radius;
          y = (Math.random() - 0.5) * 0.2;
        } else {
          // Planet
          const r = 1.5 * Math.cbrt(Math.random());
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        }
        break;
      }
      case ShapeType.SPIRAL: {
        const angle = i * 0.1;
        const radius = i * 0.0005;
        x = Math.cos(angle) * radius * 10;
        y = (i / COUNT) * 6 - 3;
        z = Math.sin(angle) * radius * 10;
        break;
      }
      case ShapeType.FIREWORKS: {
        const r = Math.pow(Math.random(), 0.3) * 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        break;
      }
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
  }
  return positions;
};