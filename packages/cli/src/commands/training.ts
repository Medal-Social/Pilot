import { render } from 'ink';
import React from 'react';
import { Training } from '../screens/Training.js';

export async function runTraining() {
  render(React.createElement(Training));
}
