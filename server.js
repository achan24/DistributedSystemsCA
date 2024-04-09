const grpc = require('@grpc/grpc-js');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');
const PROTO_PATH = path.join(__dirname, 'thermostat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);

const thermostatProto = grpc.loadPackageDefinition(packageDefinition);

const server = new grpc.Server();

const axios = require('axios');

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
  setTempRoom: ({ request }, callback) => {
    const roomName = request.name
    const targetTemp = request.targetTemp

    const roomIndex = rooms.findIndex(room => room.name === roomName)
    //console.log(rooms)
    //console.log(roomName + " " + targetTemp + " " + roomIndex)

    if(roomIndex !== -1) {
      console.log('Found room and changing temp')
      rooms[roomIndex].targetTemp = targetTemp;
    } else {
      console.error(`Room ${roomName} not found`)
    }
    callback(null)
  },
  // getRooms: (call, callback) => {
   
  // },
  getRoomsStream: (call, callback) => {
   rooms.forEach(room => {
    call.write(room)
   })
   call.end()
  },
  setRoomsTempStream: ((call, callback) => {
    call.on('data', (request) => {
      console.log('Received temperature request:', request);
      // Test to check if request is received

      // Check if room exists and set it to that temperature
      // Iterate through the rooms
      rooms.forEach(room => {
        if(room.name == request.name)
          room.targetTemp = request.targetTemp
      })
    });
  
    call.on('end', () => {
      console.log('Stream ended');
      callback(null)
    });
  })
};


function simulateTemperatureChange() {
  setInterval(() => {
      rooms.forEach(room => {
        if (room.currentTemp < room.targetTemp) {
          room.currentTemp = room.currentTemp + 1
          console.log(`Increasing room ${room.name} temperature by 1 to ${room.currentTemp}`)
        }
      

        // if (checkRoomTemperature(room)) {
        //   const message = {
        //       sender: 'Server',
        //       message: `Room ${room.name} has reached its target temperature.`
        //   };

        //   // Broadcast the message to all clients
        //   for (const client of clients) {
        //       client.write(message);
        //   }
        //}
      })
  }, 10000) // Increase temperature every 10 seconds - for time purposes
}

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

simulateTemperatureChange()


async function fetchQuotes(apiUrl) {
  try {
    const response = await axios.get(apiUrl)
    return response.data[0];
  } catch (error) {
    console.error('Error fetching quotes:', error.message);
    throw error
  }
}

// API URL
const apiUrl = 'https://zenquotes.io/api/quotes/'

// Fetch quotes
fetchQuotes(apiUrl)
  .then(quotes => {
    console.log('Quotes:', quotes)
    //do something with quotes
  })
  .catch(error => {
    console.log('Failed to fetch quotes:', error.message)
  });