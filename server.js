/*
 * server.js
 * Author: Albert Chan
 * Date: 19/04/2024
 * Description: This file implements a gRPC server for managing rooms, setting temperatures, and handling chat messages.
 */


const grpc = require('@grpc/grpc-js') //Import grpc-js module from grpc package
const path = require('path') //Import path module
const protoLoader = require('@grpc/proto-loader') //Import proto loader module from grpc package
const PROTO_PATH = path.join(__dirname, 'thermostat.proto') //Define the path to the protocol buffer file
const packageDefinition = protoLoader.loadSync(PROTO_PATH) //Parses the protocol buffer file - contains definitions for all the services and messages defined in the proto file

const thermostatProto = grpc.loadPackageDefinition(packageDefinition) //Loads the package definition object into grpc

const server = new grpc.Server() //Create a new grpc server

const axios = require('axios') //Import axios for making http requests

const rooms = [] //Create a global variable rooms - to hold list of rooms

// gRPC roomService methods
const roomService = {
  //Unary grpc
  createRoom: (call, callback) => {
    const roomData = call.request //Room name will be passed by the client

    //print the data sent
    console.log('Creating room: ', roomData)
    
    //create a new room object
    const newRoom = {
      name: roomData.name, //set name using passed data
      currentTemp: Math.round(Math.random() * (15 - 5) + 5), //set current temperature to a random value between 5 and 15
      targetTemp: -1, //set targetTemp to -1, meaning no temperature set
    }
    rooms.push(newRoom) // add to array

    //create the response object
    const response = {
      success: true, //set success to true
      message: 'Room created successfully', //set return meesage
    }

   callback(null, response) //use callback function to send response
  },

  //Server streaming grpc
  getRoomsStream: (call, callback) => {
    //using the rooms object iterate over each room
   rooms.forEach(room => {
    //write each room to the client stream
    call.write(room)
   })
   //end the client stream
   call.end()
  },
}

// gRPC temperatureService methods
const temperatureService = {
  //Unary grpc
  //Set the target temperature for a specific room
  setTempRoom: ({ request }, callback) => {
    //destructure request from the call
    const roomName = request.name //set roomName from the request.name
    const targetTemp = request.targetTemp //set targetTemp from the request.targetTemp

    //find the room index using the findIndex method
    //where the room name is equal to the room name passed
    const roomIndex = rooms.findIndex(room => room.name === roomName)

    //if room index found meaning is not equal to -1
    if(roomIndex !== -1) {
      console.log('Found room and changing temp') //print message
      rooms[roomIndex].targetTemp = targetTemp //set target temperature for that particular room object
      // if(rooms[roomIndex].targetTemp == -1)
      //   cooldown()
    } else { //if room is not found, print error message
      console.error(`Room ${roomName} not found`)
    }
    callback(null) //send response back to client
  },

  //Client Streaming grpc
  //Set temperature for all rooms using client streaming
  setRoomsTempStream: ((call, callback) => {
    //listen for data being sent
    call.on('data', (request) => {
      console.log('Received temperature request:', request)
      // Test to check if request is received

      // Check if room exists and set it to that temperature
      // Iterate through the rooms
      rooms.forEach(room => {
        if(room.name == request.name) //if room equals the room name passed
          room.targetTemp = request.targetTemp //then set that room object's targetTemp to equal to be the targetTemp passed
      })
    })

    //listen for the end event from client
    call.on('end', () => {
      console.log('Client Stream ended') //print console message
      callback(null) //send callback to the client
    })
  }),
}

// gRPC chatService methods
const chatService = {
  //Bidirectional Streaming grpc
  //Chat method
  chat: ((call) => {
    //listen for messages from client
    call.on('data', message => {
      //on receiving a message from client
      try {
        // use Fetch quotes from the API
        fetchQuotes()
          //retrieve quotes
          .then(quotes => {
            //destructure quote and author values from quotes object
            const { q: quote, a: author } = quotes
            //send quote and auother as a chat message to the client
            call.write({ message: `${quote}  ${author}` })
          })

        } catch(err) { //if error occurs - print message
        console.error("Error on server chat side", err)
      }

    })
    //listen for ending of bidirectional stream
    call.on('end', () => {
      //print message
      console.log('Bidirectional Stream ended')
      call.end() //close the stream
    })
  })
}

//Function to simulate temperature change
function simulateTemperatureChange() {

  //At a set interval
  setInterval(() => {
      //Iterate through the rooms object
      rooms.forEach(room => {
        //if the target temperature is greater than the current temperature of that room
        if (room.currentTemp < room.targetTemp) {
          room.currentTemp = room.currentTemp + 1 //increase tempearture by 1
          console.log(`${room.name} increased in temperature by 1 to ${room.currentTemp}`) //print message to the server console
        }
      
      })
  }, 10000) // Increase temperature every 10 seconds - for time purposes
}

// function cooldown() {
  
// }

// Add gRPC services to the server
server.addService(thermostatProto.thermostatPackage.RoomService.service, roomService)
server.addService(thermostatProto.thermostatPackage.TemperatureService.service, temperatureService)
server.addService(thermostatProto.thermostatPackage.ChatService.service, chatService)


// Bind the server asynchronously to a port and start listening for RPC requests
// Create a server that requires no credentials
server.bindAsync("127.0.0.1:50051", grpc.ServerCredentials.createInsecure(), (error, port) => { //pass callback function
  if (error) { //if there is an error
    console.error('Failed to bind server:', error) //print this error message
    return //end execution of this function
  }
  //if there is no error, meaning server is succesfully operating
  console.log(`Server is now listening on ${port}`) //print success message
})

simulateTemperatureChange() //call simulateTemperatureChange function
// this increases the temperatue when a higher target temperature has been set



// Asynchronous function that fetches a quote from a free API
async function fetchQuotes() {
  //const apiUrl = 'https://zenquotes.io/api/quotes/'
  try {
    //set response to data from api
    //use axios to send a GET request to the API server
    const response = await axios.get('https://zenquotes.io/api/quotes/')
    return response.data[0] //return the first JSON object from the response
  } catch (err) { //if error occurs during API request, print error message
    console.error('Error fetching quotes:', err.message)
  }
}

// Test fetch quotes
fetchQuotes() //call fetchQuotes method
  .then(() => { //if no error
    console.log('Chat service available') //print success message
  })
  .catch(err => { //else catch error
    console.log('Quote server down: ', err.message) //print error message
  })