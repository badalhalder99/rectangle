import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

interface Label {
  div: HTMLDivElement;
  point: THREE.Vector3;
}

interface Rectangle {
  points: THREE.Vector3[];
  lines: THREE.Line[];
  labels: Label[];
}

export const ARMeasure = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isARSupported, setIsARSupported] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let renderer: THREE.WebGLRenderer;
    let controller: THREE.XRTargetRaySpace;
    let reticle: THREE.Mesh;
    let hitTestSource: XRHitTestSource | null = null;
    const hitTestSourceRequested = false;

    // Track current rectangle being drawn
    let currentRectangle: Rectangle = {
      points: [],
      lines: [],
      labels: []
    };

    // Store completed rectangles
    const rectangles: Rectangle[] = [];

    const init = async () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      light.position.set(0.5, 1, 0.25);
      scene.add(light);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;

      if (containerRef.current) {
        containerRef.current.appendChild(renderer.domElement);
      }

      const button = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: containerRef.current },
      });

      document.body.appendChild(button);

      controller = renderer.xr.getController(0);
      controller.addEventListener('select', onSelect);
      scene.add(controller);

      reticle = createReticle();
      scene.add(reticle);

      window.addEventListener('resize', onWindowResize, false);

      setIsARSupported(true);
      animate();
    };

    const createReticle = () => {
      const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial();
      const reticleMesh = new THREE.Mesh(geometry, material);
      reticleMesh.matrixAutoUpdate = false;
      reticleMesh.visible = false;
      return reticleMesh;
    };

    const createPoint = (position: THREE.Vector3) => {
      const geometry = new THREE.SphereGeometry(0.02);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const point = new THREE.Mesh(geometry, material);
      point.position.copy(position);
      scene.add(point);
      return point;
    };

    const createLine = (start: THREE.Vector3, end: THREE.Vector3) => {
      const points = [start, end];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0xffffff });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      return line;
    };

    const createLabel = (text: string, position: THREE.Vector3) => {
      if (!containerRef.current) return null;
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = text;
      containerRef.current.appendChild(label);
      return {
        div: label,
        point: position.clone()
      };
    };

    const completeRectangle = () => {
      // Create the final line to close the rectangle
      const firstPoint = currentRectangle.points[0];
      const lastPoint = currentRectangle.points[3];
      const finalLine = createLine(lastPoint, firstPoint);
      currentRectangle.lines.push(finalLine);

      // Create labels for all sides
      for (let i = 0; i < 4; i++) {
        const start = currentRectangle.points[i];
        const end = currentRectangle.points[(i + 1) % 4];
        const distance = start.distanceTo(end);
        const distanceCm = Math.round(distance * 100);
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        const label = createLabel(`${distanceCm} cm`, midPoint);
        if (label) {
          currentRectangle.labels.push(label);
        }
      }

      // Store completed rectangle and start a new one
      rectangles.push(currentRectangle);
      currentRectangle = {
        points: [],
        lines: [],
        labels: []
      };
    };

    const onSelect = () => {
      if (!reticle.visible) return;

      const point = new THREE.Vector3();
      point.setFromMatrixPosition(reticle.matrix);

      // Add point to current rectangle
      currentRectangle.points.push(point);
      createPoint(point);

      // If we have more than one point, create a line
      if (currentRectangle.points.length > 1) {
        const lastPoint = currentRectangle.points[currentRectangle.points.length - 1];
        const prevPoint = currentRectangle.points[currentRectangle.points.length - 2];
        const line = createLine(prevPoint, lastPoint);
        currentRectangle.lines.push(line);
      }

      // If we have 4 points, complete the rectangle
      if (currentRectangle.points.length === 4) {
        completeRectangle();
      }
    };

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
      renderer.setAnimationLoop(render);
    };

    const render = (timestamp: number | null, frame: XRFrame | null) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (session && !hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then((refSpace) => {
            if (session.requestHitTestSource) {
              session
                .requestHitTestSource({ space: refSpace })
                .then((source) => {
                  hitTestSource = source;
                });
            }
          });
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);

          if (hitTestResults.length) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace!);

            if (pose) {
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
            }
          } else {
            reticle.visible = false;
          }
        }

        // Update all labels (both current and completed rectangles)
        const allLabels = [
          ...rectangles.flatMap(rect => rect.labels),
          ...currentRectangle.labels
        ];

        allLabels.forEach((label) => {
          const camera3D = renderer.xr.getCamera();
          const pos = label.point.clone().project(camera3D);
          const x = (pos.x + 1) * window.innerWidth / 2;
          const y = (-pos.y + 1) * window.innerHeight / 2;
          label.div.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
        });
      }

      renderer.render(scene, camera);
    };

    init();

    return () => {
      // Cleanup
      renderer?.dispose();
      scene?.clear();

      // Remove all labels
      const allLabels = [
        ...rectangles.flatMap(rect => rect.labels),
        ...currentRectangle.labels
      ];
      allLabels.forEach((label) => label.div.remove());

      const button = document.querySelector('button');
      button?.remove();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-screen relative">
      {!isARSupported && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 text-white text-center p-4">
          <p className="text-xl">WebXR is not supported on your device</p>
        </div>
      )}
      <style>
        {`
          .label {
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
          }
        `}
      </style>
    </div>
  );
};
