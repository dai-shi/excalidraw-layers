import React from "react";

import "./App.css";
import Toolbar from "./Toolbar";
import Viewer from "./Viewer";
import { useLoadElements } from "./useLoadElements";

const App: React.FC = () => {
  const { loading, elements, loadData } = useLoadElements();
  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <div className="App">
      <Toolbar elements={elements} loadData={loadData} />
      {elements && <Viewer elements={elements} />}
    </div>
  );
};

export default App;