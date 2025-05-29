/* global process */
try {
  const { runServer } = await import('../dist/index.js');
  await runServer();
} catch (error) {
  const { message } = error;
  process.stderr.write(`Fatal error in main(): ${message}`);
  process.exit(1);
}
