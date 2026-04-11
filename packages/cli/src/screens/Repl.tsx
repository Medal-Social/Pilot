// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { useState } from 'react';
import { loadSettings, markOnboarded } from '../settings.js';
import { Home } from './Home.js';
import { Welcome } from './Welcome.js';

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
