declare module 'three/examples/jsm/webxr/ARButton' {
  export const ARButton: {
    createButton: (
      renderer: THREE.WebGLRenderer,
      options?: { requiredFeatures?: string[]; optionalFeatures?: string[]; domOverlay?: { root: HTMLElement } }
    ) => HTMLButtonElement;
  };
}

declare module 'three/examples/jsm/utils/BufferGeometryUtils' {
  export const BufferGeometryUtils: {
    mergeGeometries: (geometries: THREE.BufferGeometry[]) => THREE.BufferGeometry;
  };
}
