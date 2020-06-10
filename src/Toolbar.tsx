import React, { useEffect, useState } from "react";

import "./Toolbar.css";

type Props = {};

const Toolbar: React.FC<Props> = () => {
  const [showToolbar, setShowToolbar] = useState(false);

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

  const loadLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const match = /#json=([0-9]+),?([a-zA-Z0-9_-]*)/.exec(
      (event.target as any).link.value /* FIXME no-any */
    );
    if (!match) {
      window.alert("Invalid link");
      return;
    }
    window.location.hash = match[0];
    window.location.reload();
  };

  return (
    <div className="Toolbar">
      <form onSubmit={loadLink}>
        <label>
          Excalidraw shareable link:
          <input name="link" />
        </label>
        <button type="submit">View Layers!</button>
      </form>
    </div>
  );
};

export default Toolbar;
