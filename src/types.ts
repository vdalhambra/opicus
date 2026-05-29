/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StructuralNode {
  id: number;
  x: number; // 3D local coordinates
  y: number;
  z: number;
  // Current projected coordinates
  px?: number;
  py?: number;
  // Dynamic displacement values (due to forces)
  dx?: number;
  dy?: number;
  dz?: number;
  isSupport?: boolean; // Anchored to ground
}

export interface StructuralMember {
  id: number;
  from: number; // Node index
  to: number; // Node index
  type: 'column' | 'beam' | 'brace' | 'slab-edge';
  stress: number; // Value from 0.0 (safe) to 1.0 (overloaded/tension)
}

export type StructuralLoadType = 'gravity' | 'wind' | 'seismic' | 'none';

export interface EmailQuery {
  id: string;
  sender: string;
  subject: string;
  date: string;
  content: string;
  status: 'sent' | 'processing' | 'replied';
  reply?: {
    date: string;
    subject: string;
    body: string;
    calculations: {
      formula: string;
      result: string;
      status: 'pass' | 'warning' | 'fail';
      label: string;
    }[];
  };
}
