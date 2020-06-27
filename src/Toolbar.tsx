import React, { useEffect, useState } from "react";

import "./Toolbar.css";
import { ExcalidrawElement, NonDeletedExcalidrawElement } from "./excalidraw/src/element/types";
import { loadFromJSON } from "./excalidraw/src/data/json";

const linkRegex = /#json=([0-9]+),?([a-zA-Z0-9_-]*)/;

type Props = {
  elements: NonDeletedExcalidrawElement[];
  loadData: (data: { elements: readonly ExcalidrawElement[] }) => void;
};

const Toolbar: React.FC<Props> = ({ elements, loadData }) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const searchParams = new URLSearchParams(hash);
    if (searchParams.get("toolbar") !== "no") {
      setShowToolbar(true);
    }
  }, []);

  if (!showToolbar) {
    return null;
  }

  const loadFile = async () => {
    const data = await loadFromJSON();
    loadData(data);
  };

  const loadLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const match = linkRegex.exec(link);
    if (!match) {
      window.alert("Invalid link");
      return;
    }
    window.location.hash = match[0];
    window.location.reload();
  };

  return (
    <div className="Toolbar">
      <button type="button" onClick={loadFile} disabled={!!elements}>
        Load File
      </button>
      <span>OR</span>
      <form onSubmit={loadLink}>
        <input
          placeholder="Enter shareable link..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button type="submit" disabled={!linkRegex.test(link)}>
          View
        </button>
      </form>
    </div>
  );
};

export default Toolbar;
