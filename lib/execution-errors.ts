export function formatExecutionErrorMessage(message: string): string {
  const keyError =
    message.match(/KeyError:\s*["']([^"']+)["']/i) ||
    message.trim().match(/^["']([^"']+)["']$/);

  if (keyError) {
    return `Input is missing the "${keyError[1]}" field. The algorithm source and sample input do not match.`;
  }

  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const finalLine = lines.at(-1) || 'Execution failed.';
  return finalLine.replace(/^(?:PythonError|Error):\s*/, '');
}
