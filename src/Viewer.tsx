import React, { useEffect, useRef } from "react";

import "./Viewer.css";
import { NonDeletedExcalidrawElement } from "./excalidraw/src/element/types";
import { getCommonBounds } from "./excalidraw/src/element/bounds";
import { normalizeScroll } from "./excalidraw/src/scene/scroll";

type Props = {
  elements: readonly NonDeletedExcalidrawElement[];
};

const Viewer: React.FC<Props> = ({ elements }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const worker = new Worker("./viewer.worker", { type: "module" });
      const [minX, minY, maxX, maxY] = getCommonBounds(elements);
      const exportPadding = 10;
      const width = maxX - minX + exportPadding * 2;
      const height = maxY - minY + exportPadding * 2;
      const scale = window.devicePixelRatio;
      canvasRef.current.width = width * scale;
      canvasRef.current.height = height * scale;
      const offscreen = canvasRef.current.transferControlToOffscreen();
      const scrollX = normalizeScroll(-minX + exportPadding);
      const scrollY = normalizeScroll(-minY + exportPadding);
      worker.postMessage(
        { type: "init", offscreen, scale, scrollX, scrollY, elements },
        [offscreen]
      );
      return () => {
        worker.terminate();
      };
    }
  }, [elements]);

  return (
    <div className="Viewer">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Viewer;
