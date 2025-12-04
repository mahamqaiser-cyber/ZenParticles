
export enum ShapeType {
  SPHERE = 'Sphere',
  HEART = 'Heart',
  FLOWER = 'Flower',
  SATURN = 'Saturn',
  SPIRAL = 'Spiral',
  FIREWORKS = 'Fireworks'
}

export interface ParticleTheme {
  primaryColor: string;
  secondaryColor: string;
  particleSize: number;
  speed: number;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  leftHandOpenness: number; // 0 (closed) to 1 (open)
  rightHandOpenness: number;
  leftHandPinch: number; // 0 (open) to 1 (pinched)
  rightHandPinch: number;
  leftHandLandmarks: Landmark[];
  rightHandLandmarks: Landmark[];
  isPresent: boolean;
}
