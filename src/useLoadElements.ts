import { useCallback, useEffect, useState } from "react";

import { importFromBackend } from "./excalidraw/src/data";
import { getNonDeletedElements } from "./excalidraw/src/element";
import { ExcalidrawElement, NonDeletedExcalidrawElement } from "./excalidraw/src/element/types";

export const useLoadElements = () => {
  const [loading, setLoading] = useState(true);
  const [elements, setElements] = useState<
    readonly NonDeletedExcalidrawElement[]
  >();

  const loadData = useCallback(
    (data: { elements: readonly ExcalidrawElement[] }) => {
      setElements(getNonDeletedElements(data.elements));
    },[]);

  useEffect(() => {
    (async () => {
      const hash = window.location.hash.slice(1);
      const searchParams = new URLSearchParams(hash);
      const match = /([0-9]+),?([a-zA-Z0-9_-]*)/.exec(
        searchParams.get("json") || ""
      );
      if (match) {
        const [, id, key] = match;
        const data = await importFromBackend(id, key);
        loadData(data);
      }
      setLoading(false);
    })();
  }, [loadData]);

  return { loading, elements, loadData };
};
