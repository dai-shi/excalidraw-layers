import React, { useEffect, useRef } from "react";

import "./Viewer.css";
import { NonDeletedExcalidrawElement } from "./excalidraw/src/element/types";
import { getCommonBounds } from "./excalidraw/src/element/bounds";

type Props = {
  elements: readonly NonDeletedExcalidrawElement[];
};

const Viewer: React.FC<Props> = ({ elements }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const worker = new Worker("./viewer.worker", { type: "module" });
      const [minX, minY, maxX, maxY] = getCommonBounds(elements);
      const exportPadding = 10;
      const width = maxX - minX + exportPadding * 2;
      const height = maxY - minY + exportPadding * 2;
      const scale = window.devicePixelRatio;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const offscreen = canvas.transferControlToOffscreen();
      const scrollX = Math.floor(-minX + exportPadding);
      const scrollY = Math.floor(-minY + exportPadding);
      worker.postMessage(
        {
          type: "init",
          offscreen,
          scale,
          width,
          height,
          scrollX,
          scrollY,
          elements,
        },
        [offscreen]
      );
      let viewAngle = 0;
      let zoom = 1;
      let centerX = 0;
      let centerY = 0;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (e.ctrlKey) {
          zoom -= e.deltaY / 100;
          zoom = Math.max(0.1, Math.min(2, zoom));
        } else if (e.shiftKey) {
          viewAngle += e.deltaY / 1000;
          viewAngle = Math.max(0, Math.min(Math.PI / 2, viewAngle));
        } else {
          centerX += e.deltaX / zoom;
          centerY -= e.deltaY / zoom;
        }
        centerX = Math.max(
          (-width / 2) * (1 + 1 / zoom),
          Math.min((width / 2) * (1 + 1 / zoom), centerX)
        );
        centerY = Math.max(
          (-height / 2) * (1 + 1 / zoom),
          Math.min((height / 2) * (1 + 1 / zoom), centerY)
        );
        worker.postMessage({
          type: "render",
          viewAngle,
          zoom,
          centerX,
          centerY,
        });
      };
      canvas.addEventListener("wheel", onWheel, { passive: false });
      return () => {
        worker.terminate();
        canvas.removeEventListener("wheel", onWheel);
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
