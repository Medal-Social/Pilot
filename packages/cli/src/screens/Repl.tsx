import React, { useState } from 'react';
import { Welcome } from './Welcome.js';
import { Home } from './Home.js';
import { loadState, markOnboarded } from '../state.js';

type Screen = 'welcome' | 'home' | 'chat';

export function Repl() {
  const state = loadState();
  const [screen, setScreen] = useState<Screen>(state.onboarded ? 'home' : 'welcome');

  if (screen === 'welcome') {
    return (
      <Welcome
        onContinue={() => {
          markOnboarded();
          setScreen('home');
        }}
      />
    );
  }

  return <Home />;
}
