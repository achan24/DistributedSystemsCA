const grpc = require('@grpc/grpc-js');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');
const PROTO_PATH = path.join(__dirname, 'thermostat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);

const thermostatProto = grpc.loadPackageDefinition(packageDefinition);

const server = new grpc.Server();

const rooms = [];

// gRPC service methods
const roomService = {
  createRoom: (call, callback) => {
    const roomData = call.request //Room name will be passed by the client

    console.log('Creating room: ', roomData)

    //create a new room
    const newRoom = {
      name: roomData.name,
      currentTemp: Math.round(Math.random() * (15 - 5) + 5),
      targetTemp: null,
    }
    rooms.push(newRoom) // add to array
    console.log(newRoom)
    console.log(rooms)

    const response = {
      success: true,
      message: 'Room created successfully',
    }

   callback(null, response)
  },
  getRooms: (call, callback) => {
   
  },
  getRoomsStream: (call) => {
   
  }
};


// Add gRPC service to the server
server.addService(thermostatProto.thermostatPackage.RoomService.service, roomService);

// Bind the server to a port and start listening for RPC requests
server.bindAsync("127.0.0.1:50051", grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error('Failed to bind server:', error);
    return;
  }
  console.log(`Server is now listening on ${port}`);
  server.start();
});