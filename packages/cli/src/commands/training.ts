import React from 'react';
import { render } from 'ink';
import { Training } from '../screens/Training.js';

export async function runTraining() {
  render(React.createElement(Training));
}
