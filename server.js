const express = require('express');
const next = require('next');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT, 10) || dev ? 3000 : 5555;
const app = next({ dev });
const handle = app.getRequestHandler();

const prefix = (path = '') => `/:lang(en|tr)?`.concat(path);

app.prepare().then(() => {
    const server = express();

    server.get(prefix('/'), (req, res) => app.render(req, res, '/', req.query));
    server.use('/api/video', express.static(`${process.env.VIDEO_DIR}`))
    server.all('*', async (req, res) => {
      return handle(req, res);
    })

    server.listen(port, err => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});