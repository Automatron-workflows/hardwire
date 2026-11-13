import { inspect, checkArguments, runDemoSearch } from './model.mjs';

self.onmessage = async ({ data }) => {
  try {
    let result;
    if (data.operation === 'inspect') result = await inspect(data.input);
    else if (data.operation === 'demo') result = await runDemoSearch(data.input);
    else if (data.operation === 'check') result = checkArguments(data.input);
    else throw new Error('Unknown operation');
    self.postMessage({ id: data.id, result });
  } catch (error) {
    self.postMessage({ id: data.id, error: {
      code: error.code ?? 'hardwire_input_invalid',
      message: error.detail || 'This input could not be processed.',
      path: error.path ?? '',
    } });
  }
};
