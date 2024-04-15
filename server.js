const grpc = require('@grpc/grpc-js')
const path = require('path')
const protoLoader = require('@grpc/proto-loader')
const PROTO_PATH = path.join(__dirname, 'thermostat.proto')
const packageDefinition = protoLoader.loadSync(PROTO_PATH)

const thermostatProto = grpc.loadPackageDefinition(packageDefinition)

const server = new grpc.Server()

const axios = require('axios')

const rooms = [];

// gRPC roomService methods
const roomService = {
  createRoom: (call, callback) => {
    const roomData = call.request //Room name will be passed by the client

    console.log('Creating room: ', roomData)
    
    //create a new room
    const newRoom = {
      name: roomData.name,
      currentTemp: Math.round(Math.random() * (15 - 5) + 5),
      targetTemp: -1,
    }
    rooms.push(newRoom) // add to array
    //console.log(newRoom)
    //console.log(rooms)

    const response = {
      success: true,
      message: 'Room created successfully',
    }

   callback(null, response)
  },

  getRoomsStream: (call, callback) => {
   rooms.forEach(room => {
    call.write(room)
   })
   call.end()
  },
}

const temperatureService = {
  setTempRoom: ({ request }, callback) => {
    const roomName = request.name
    const targetTemp = request.targetTemp

    const roomIndex = rooms.findIndex(room => room.name === roomName)

    if(roomIndex !== -1) {
      console.log('Found room and changing temp')
      rooms[roomIndex].targetTemp = targetTemp;
    } else {
      console.error(`Room ${roomName} not found`)
    }
    callback(null)
  },
  setRoomsTempStream: ((call, callback) => {
    call.on('data', (request) => {
      console.log('Received temperature request:', request)
      // Test to check if request is received

      // Check if room exists and set it to that temperature
      // Iterate through the rooms
      rooms.forEach(room => {
        if(room.name == request.name)
          room.targetTemp = request.targetTemp
      })
    })
  
    call.on('end', () => {
      console.log('Client Stream ended')
      callback(null)
    })
  }),
}

const chatService = {
  chat: ((call, callback) => {
    call.on('data', message => {
      //console.log("Client: ", message.message)
      //using 
      try {
        // Fetch quotes from the API
        fetchQuotes()
          .then(quotes => {
            const { q: quote, a: author } = quotes
            call.write({ message: `${quote}  ${author}` })
          })

        // Extract quote and author from the quotes object
//        const { q: quote, a: author } = quotes;
        // Send the quote and author as the server message
//        call.write({ message: `Quote: ${quote}, Author: ${author}` });
      } catch(e) {
        console.error(e)
      }

    })

    call.on('end', () => {
      console.log('Bidirectional Stream ended')
      call.end()
    })
  })
}


function simulateTemperatureChange() {
  setInterval(() => {
      rooms.forEach(room => {
        if (room.currentTemp < room.targetTemp) {
          room.currentTemp = room.currentTemp + 1
          console.log(`${room.name} increased in temperature by 1 to ${room.currentTemp}`)
        }
      
      })
  }, 10000) // Increase temperature every 10 seconds - for time purposes
}

// Add gRPC services to the server
server.addService(thermostatProto.thermostatPackage.RoomService.service, roomService)
server.addService(thermostatProto.thermostatPackage.TemperatureService.service, temperatureService)
server.addService(thermostatProto.thermostatPackage.ChatService.service, chatService)


// Bind the server to a port and start listening for RPC requests
server.bindAsync("127.0.0.1:50051", grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error('Failed to bind server:', error);
    return;
  }
  console.log(`Server is now listening on ${port}`);
});

simulateTemperatureChange()


//Chat functionality
async function fetchQuotes() {
  const apiUrl = 'https://zenquotes.io/api/quotes/'
  try {
    const response = await axios.get(apiUrl)
    return response.data[0]
  } catch (err) {
    console.error('Error fetching quotes:', err.message)
    throw error
  }
}

// Fetch quotes
fetchQuotes()
  .then(() => {
    console.log('Chat service available')
  })
  .catch(err => {
    console.log('Quote server down: ', err.message)
  });