import React from 'react';
import { render } from 'ink';
import { Repl } from '../screens/Repl.js';

export async function runRepl() {
  render(React.createElement(Repl));
}
