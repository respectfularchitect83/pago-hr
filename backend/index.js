const { createServer } = require('http');
const app = require('./dist/index.js');

const PORT = process.env.PORT || 3000;

createServer(app).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
