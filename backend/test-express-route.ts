import express from 'express';
const app = express();
app.get('/api/posts/:id', (req, res) => res.send('POST'));
app.get('/api/posts/:id/comments', (req, res) => res.send('COMMENTS'));

import request from 'supertest';
request(app).get('/api/posts/12/comments').end((err, res) => {
  console.log('Response:', res.text);
});
