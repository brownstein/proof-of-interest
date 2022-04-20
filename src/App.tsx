import { useMemo, useState } from 'react';
import { Background } from './Background';
import './App.css';

function App() {
  const [bgColor, setBgColor] = useState<[number, number, number]>([1, 1, 1]);

  function changeColor() {
    setBgColor([0.4, 0.6, 0.8]);
  }

  return (
    <div className="app" onClick={changeColor}>
      <Background color={bgColor}/>
    </div>
  );
}

export default App;
