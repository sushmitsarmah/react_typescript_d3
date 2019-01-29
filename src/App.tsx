import React, { Component } from 'react';
import './App.css';

import MapTransition from './MapTransition';

class App extends Component {
  render() {
    return (
      <div className="App">
        <MapTransition width={900} height={600} />
      </div>
    );
  }
}

export default App;
