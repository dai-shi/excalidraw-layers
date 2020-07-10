/* eslint no-restricted-globals: off */

import rough from "roughjs/bin/rough";
import * as THREE from "three";

import { NonDeletedExcalidrawElement } from "./excalidraw/src/element/types";
import { SceneState } from "./excalidraw/src/scene/types";
import { renderElement } from "./excalidraw/src/renderer/renderElement";
import { getElementBounds } from "./excalidraw/src/element/bounds";

const CANVAS_PADDING = 20;

const drawElementCanvas = (
  element: NonDeletedExcalidrawElement,
  canvas: HTMLCanvasElement,
  scale: number
) => {
  const [x1, y1, x2, y2] = getElementBounds(element);
  canvas.width = (x2 - x1 + CANVAS_PADDING * 2) * scale;
  canvas.height = (y2 - y1 + CANVAS_PADDING * 2) * scale;
  const sceneState: SceneState = {
    viewBackgroundColor: null,
    scrollX: (-x1 + CANVAS_PADDING) as any,
    scrollY: (-y1 + CANVAS_PADDING) as any,
    zoom: 1,
    remotePointerViewportCoords: {},
    remoteSelectedElementIds: {},
    shouldCacheIgnoreZoom: false,
    remotePointerUsernames: {},
  };
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to get canvas context");
  context.scale(scale, scale);
  const rc = rough.canvas(canvas);
  const renderOptimizations = false;
  renderElement(element, rc, context, renderOptimizations, sceneState);
};

let render: (
  viewAngle: number,
  zoom: number,
  centerX: number,
  centerY: number
) => void = () => undefined;

const init = (
  canvas: HTMLCanvasElement,
  scale: number,
  width: number,
  height: number,
  scrollX: number,
  scrollY: number,
  elements: readonly NonDeletedExcalidrawElement[]
) => {
  (canvas as any).style = { width: 0, height: 0 };
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setPixelRatio(scale);
  renderer.setSize(width, height);
  const scene = new THREE.Scene();
  const light = new THREE.AmbientLight(0xffffff);
  scene.add(light);

  type ElementCube = {
    element: NonDeletedExcalidrawElement;
    elementCanvas: HTMLCanvasElement;
    texture: THREE.CanvasTexture;
    geometry: THREE.PlaneGeometry;
    cube: THREE.Mesh;
    lastZoom: number;
  };
  const elementCubes: ElementCube[] = [];
  elements.forEach((element, index) => {
    const elementCanvas = (new OffscreenCanvas(
      0,
      0
    ) as unknown) as HTMLCanvasElement;
    elementCanvas.setAttribute = () => undefined;
    drawElementCanvas(element, elementCanvas, scale);
    const [x1, y1, x2, y2] = getElementBounds(element);
    const w = x2 - x1 + CANVAS_PADDING * 2;
    const h = y2 - y1 + CANVAS_PADDING * 2;
    const texture = new THREE.CanvasTexture(elementCanvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });
    const geometry = new THREE.PlaneGeometry(w, h);
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cube.position.set(
      scrollX + x1 + (x2 - x1) / 2 - width / 2,
      -(scrollY + y1 + (y2 - y1) / 2) + height / 2,
      -height / 4 + (height / 2 / elements.length) * index
    );
    elementCubes[index] = {
      element,
      elementCanvas,
      texture,
      geometry,
      cube,
      lastZoom: 1,
    };
  });

  const camera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    0,
    height
  );

  const getResizingElementCubes = (zoom: number) =>
    elementCubes.filter((item) => {
      const { geometry, cube, lastZoom } = item;
      if (lastZoom === zoom) return false;
      const { width, height } = geometry.parameters;
      const { x, y } = cube.position;
      const needsResizing =
        Math.abs(x - (camera.left + camera.right) / 2) - width / 2 <
          (camera.right - camera.left) / 2 / camera.zoom &&
        Math.abs(y - (camera.bottom + camera.top) / 2) - height / 2 <
          (camera.top - camera.bottom) / 2 / camera.zoom;
      if (needsResizing) {
        // we update lastZoom here as it will be scheduled
        item.lastZoom = zoom;
        return true;
      }
      return false;
    });

  let currZoom = 1;
  const BATCH_SIZE = 20;
  const redrawElements = (
    resizingElementCubes: ElementCube[],
    index: number,
    zoom: number
  ) => {
    if (zoom !== currZoom) {
      // no longer valid
      return;
    }
    let i = 0;
    while (i < BATCH_SIZE && index + i < resizingElementCubes.length) {
      const { element, elementCanvas, texture } = resizingElementCubes[
        index + i
      ];
      drawElementCanvas(element, elementCanvas, scale * zoom);
      texture.needsUpdate = true;
      i += 1;
    }
    renderer.render(scene, camera);
    if (index + i >= resizingElementCubes.length) {
      return;
    }
    setTimeout(() => {
      redrawElements(resizingElementCubes, index + i, zoom);
    }, 1);
  };

  let lastData: {
    viewAngle: number;
    zoom: number;
    centerX: number;
    centerY: number;
  } | null = {
    viewAngle: 0,
    zoom: currZoom,
    centerX: 0,
    centerY: 0,
  };
  render = (
    viewAngle: number,
    zoom: number,
    centerX: number,
    centerY: number
  ) => {
    lastData = { viewAngle, zoom, centerX, centerY };
  };

  const renderLoop = () => {
    if (lastData) {
      const { viewAngle, zoom, centerX, centerY } = lastData;
      lastData = null;
      camera.zoom = zoom;
      camera.left = -width / 2 + centerX;
      camera.right = width / 2 + centerX;
      camera.top = height / 2 + centerY;
      camera.bottom = -height / 2 + centerY;
      camera.updateProjectionMatrix();
      camera.position.z = (height / 2) * Math.cos(viewAngle);
      camera.position.y = -(height / 2) * Math.sin(viewAngle);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      const resizingElementCubes = getResizingElementCubes(zoom);
      if (resizingElementCubes.length) {
        currZoom = zoom;
        setTimeout(() => {
          redrawElements(resizingElementCubes, 0, zoom);
        }, 1);
      }
      setTimeout(renderLoop, 0);
    } else {
      setTimeout(renderLoop, 50);
    }
  };
  renderLoop();
};

self.onmessage = (event: MessageEvent) => {
  const { data } = event;
  if (data.type === "init") {
    const fontFace1 = new (self as any).FontFace(
      "Virgil",
      "url(https://excalidraw.com/FG_Virgil.woff2)"
    );
    const fontFace2 = new (self as any).FontFace(
      "Cascadia",
      "url(https://excalidraw.com/Cascadia.woff2)"
    );
    (self as any).fonts.add(fontFace1);
    (self as any).fonts.add(fontFace2);
    Promise.all([fontFace1.load(), fontFace2.load()]).then(() => {
      init(
        data.offscreen,
        data.scale,
        data.width,
        data.height,
        data.scrollX,
        data.scrollY,
        data.elements
      );
    });
  } else if (data.type === "render") {
    render(data.viewAngle, data.zoom, data.centerX, data.centerY);
  } else {
    console.log("unknown data", data);
  }
};

export {};
