const grpc = require('@grpc/grpc-js');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, 'thermostat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);

const thermostatProto = grpc.loadPackageDefinition(packageDefinition);
const readlineSync = require('readline-sync');

// create a client instance
const client = new thermostatProto.thermostatPackage.RoomService (
  "localhost:50051",
  grpc.credentials.createInsecure()
)

// const readline = require('readline').createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

async function main() {
  console.log("\n***************************************")
  console.log("  Welcome to the Smart Thermostat app  ")
  console.log("***************************************\n")


  menu = true

  while(menu) {
    var action = readlineSync.question(
      "Please choose from the menu below:\n"
      + "1 - Create a new room\n"
      + "2 - Set a temperature for a room\n"
      + "3 - Get all rooms\n"
      + "4 - Chat or note feature\n"
      + "5 - Exit\n"
    )

    action = parseInt(action)
    if (action === 1) {
      let roomName = readlineSync.question("Create new rooom name: ")
      try {
        await createRoom(roomName)
        console.log(`${roomName} created successfully`)
      } catch (e) {
          console.log("An error occured in option 1");
      }


    } else if (action === 2) {
      //Set temperature for a room
      //Means you need to get a list of all rooms available
      console.log("Option 2");


    } else if (action === 3) {
      console.log("Get List of all Rooms");
      //Get a list of all rooms available
      //Do this one first
      try {
        const rooms = await getRooms()
        console.log(rooms)

      } catch (e) {
          console.log("An error occured in option 3");
      }
      

    } else if (action === 4) {
      console.log("Option 4");


    } else if (action == 5) {
      menu = false
    } else {
      console.log("Error:Operationnotrecognized")
    }
  }
}

async function createRoom(roomName) {
  client.createRoom({name: roomName}, (err, res) => {
    if(err) throw err
  })
}

async function getRooms() {
  return new Promise((resolve, reject) => {
    const call = client.getRoomsStream()
    const rooms = []
    call.on('data', room => {
      rooms.push(room)
    })
  
    call.on('end', () => {
      resolve(rooms)
    })

    call.on('error', err =>{
      reject(err)
    })
  })

}

main()
