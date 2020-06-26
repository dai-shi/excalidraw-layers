/* eslint no-restricted-globals: off */

import rough from "roughjs/bin/rough";
import * as THREE from "three";

import { NonDeletedExcalidrawElement } from "./excalidraw/src/element/types";
import { SceneState } from "./excalidraw/src/scene/types";
import { renderElement } from "./excalidraw/src/renderer/renderElement";
import { getElementBounds } from "./excalidraw/src/element/bounds";

const CANVAS_PADDING = 20;

const getElementCanvas = (
  scale: number,
  element: NonDeletedExcalidrawElement
) => {
  const [x1, y1, x2, y2] = getElementBounds(element);
  const canvas = (new OffscreenCanvas(
    (x2 - x1 + CANVAS_PADDING * 2) * scale,
    (y2 - y1 + CANVAS_PADDING * 2) * scale
  ) as unknown) as HTMLCanvasElement;
  canvas.setAttribute = () => undefined;
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
  return canvas;
};

let render: (viewAngle: number) => void = () => undefined;

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
  renderer.setSize(width, height);
  const scene = new THREE.Scene();
  const light = new THREE.AmbientLight(0xffffff);
  scene.add(light);

  elements.forEach((element, index) => {
    const elementCanvas = getElementCanvas(scale, element);
    const [x1, y1, x2, y2] = getElementBounds(element);
    const w = (x2 - x1 + CANVAS_PADDING * 2) * scale;
    const h = (y2 - y1 + CANVAS_PADDING * 2) * scale;
    const texture = new THREE.CanvasTexture(elementCanvas);
    texture.needsUpdate = false;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });
    const geometry = new THREE.PlaneGeometry(w / scale, h / scale);
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cube.position.set(
      scrollX + x1 + (x2 - x1) / 2 - width / 2,
      -(scrollY + y1 + (y2 - y1) / 2) + height / 2,
      -height / 4 + (height / 2 / elements.length) * index
    );
  });

  const camera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    0,
    height
  );

  render = (viewAngle: number) => {
    camera.position.z = (height / 2) * Math.cos(viewAngle);
    camera.position.y = -(height / 2) * Math.sin(viewAngle);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };
  render(0);
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
    render(data.viewAngle);
  } else {
    console.log("unknown data", data);
  }
};

export {};
