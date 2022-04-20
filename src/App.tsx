import EventEmitter from 'events';
import React, { useMemo, useEffect } from 'react';

import { Background } from './Background';

import './App.css';

function App() {
  const colorChangeEmitter = useMemo<EventEmitter>(() => new EventEmitter(), []);

  function changeColor() {
    colorChangeEmitter.emit('changeColor', [0.4, 0.6, 0.8]);
  }

  return (
    <div className="App" onClick={changeColor}>
      <Background colorChangeEmitter={colorChangeEmitter}/>
    </div>
  );
}

export default App;
