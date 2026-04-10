import React, { useState } from 'react';
import { Welcome } from './Welcome.js';
import { Home } from './Home.js';
import { loadSettings, markOnboarded } from '../settings.js';

type Screen = 'welcome' | 'home' | 'chat';

export function Repl() {
  const settings = loadSettings();
  const [screen, setScreen] = useState<Screen>(settings.onboarded ? 'home' : 'welcome');

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
