const io = require('socket.io')(5000, {
  cors: {
    origin: '*',
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('sizeData', (data) => {
    console.log('Received size data:', data);
    // Emit sizeData to all connected clients
    io.emit('sizeData', data);
    console.log('sent');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
}); 