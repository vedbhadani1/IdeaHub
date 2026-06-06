const express = require('express');
const app = express();
const router = express.Router();
router.get('/:id', (req, res) => res.send('POST'));
router.get('/:id/comments', (req, res) => res.send('COMMENTS'));
app.use('/api/posts', router);

app.listen(3000, async () => {
  const res = await fetch('http://localhost:3000/api/posts/12/comments');
  const text = await res.text();
  console.log('Result:', res.status, text);
  process.exit(0);
});
