/* eslint no-restricted-globals: off */

import rough from "roughjs/bin/rough";

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

const render = (
  canvas: HTMLCanvasElement,
  scale: number,
  scrollX: number,
  scrollY: number,
  elements: readonly NonDeletedExcalidrawElement[]
) => {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to get canvas context");
  context.scale(scale, scale);
  elements.forEach((element) => {
    const elementCanvas = getElementCanvas(scale, element);
    const [x1, y1, x2, y2] = getElementBounds(element);
    const w = (x2 - x1 + CANVAS_PADDING * 2) * scale;
    const h = (y2 - y1 + CANVAS_PADDING * 2) * scale;
    context.drawImage(
      elementCanvas,
      0,
      0,
      w,
      h,
      scrollX + x1 - CANVAS_PADDING,
      scrollY + y1 - CANVAS_PADDING,
      w / scale,
      h / scale
    );
  });
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
      render(
        data.offscreen,
        data.scale,
        data.scrollX,
        data.scrollY,
        data.elements
      );
    });
  } else {
    console.log("unknown data", data);
  }
};

export {};
