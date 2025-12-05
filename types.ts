export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SceneConfig {
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
}

export enum InteractionState {
  IDLE = 'IDLE',
  HOVER = 'HOVER',
  ACTIVE = 'ACTIVE'
}