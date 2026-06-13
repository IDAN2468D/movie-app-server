import debateRouter from '../routes/debate';
import mongoose from 'mongoose';

console.log('Debate router loaded successfully!');
console.log('Defined endpoints (stack):');
// Print registered endpoints
if (debateRouter.stack) {
  debateRouter.stack.forEach((r: any) => {
    if (r.route) {
      console.log(`- ${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
    }
  });
}
process.exit(0);
