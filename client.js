const grpc = require('@grpc/grpc-js');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, 'thermostat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);

const thermostatProto = grpc.loadPackageDefinition(packageDefinition);


// create a client instance
const client = new thermostatProto.thermostatPackage.RoomService (
  "localhost:50051",
  grpc.credentials.createInsecure()
)

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

menu = true
while(menu) {

  console.log("***********************************")
  console.log("Welcome to the Smart Thermostat app")
  console.log("***********************************\n")
  console.log("Please choose from the menu below:")
  console.log("1: Create a new room")
  console.log("2: Exit")
  
  readline.question("Enter your choice: ", (input) => {
    console.log("You entered: ", input)
    readline.close()
  })

  menu = false
}

// make RPC call to create room
// client.createRoom({name: "Bedroom 1"}, (error, something) => {
//   if(error) {
//     console.error('Error occurred: ', error)
//     return;
//   }
//   console.log(something)
// })
